const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

const ensureScheduleTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_weekly_schedules (
      id INT NOT NULL AUTO_INCREMENT,
      clinic_id INT NOT NULL,
      day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
      is_working TINYINT(1) NOT NULL DEFAULT 1,
      opening_time TIME DEFAULT NULL,
      closing_time TIME DEFAULT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY unique_clinic_day (clinic_id, day_of_week),
      CONSTRAINT fk_clinic_weekly_schedules_clinic
        FOREIGN KEY (clinic_id) REFERENCES clinics(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_blocked_dates (
      id INT NOT NULL AUTO_INCREMENT,
      clinic_id INT NOT NULL,
      blocked_date DATE NOT NULL,
      reason VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY unique_clinic_blocked_date (clinic_id, blocked_date),
      CONSTRAINT fk_clinic_blocked_dates_clinic
        FOREIGN KEY (clinic_id) REFERENCES clinics(id)
        ON DELETE CASCADE
    )
  `);
};

const MANILA_NOW_SQL = "UTC_TIMESTAMP() + INTERVAL 8 HOUR";
const MANILA_DATE_SQL = `DATE(${MANILA_NOW_SQL})`;
const MANILA_TIME_SQL = `TIME(${MANILA_NOW_SQL})`;

router.get("/", async (req, res) => {
  try {
    const { search = "", specialization = "", openNow = "" } = req.query;

    await ensureScheduleTables();

    let sql = `
      SELECT
        c.id,
        c.clinic_name,
        c.email,
        c.phone,
        c.address,
        c.specialization,
        c.services_offered,
        TIME_FORMAT(c.opening_time, '%H:%i:%s') AS opening_time,
        TIME_FORMAT(c.closing_time, '%H:%i:%s') AS closing_time,
        c.operating_days,
        c.created_at,
        c.status,
        c.account_status,
        c.latitude,
        c.longitude,
        COALESCE(cws.is_working, 1) AS is_working_today,
        IF(cbd.id IS NULL, 0, 1) AS is_blocked_today,
        TIME_FORMAT(COALESCE(cws.opening_time, c.opening_time), '%H:%i:%s') AS today_opening_time,
        TIME_FORMAT(COALESCE(cws.closing_time, c.closing_time), '%H:%i:%s') AS today_closing_time,
        DATE_FORMAT(${MANILA_DATE_SQL}, '%Y-%m-%d') AS clinic_today,
        TIME_FORMAT(${MANILA_TIME_SQL}, '%H:%i:%s') AS clinic_now_time,
        IF(
          cbd.id IS NULL
          AND COALESCE(cws.is_working, 1) = 1
          AND ${MANILA_TIME_SQL} >= COALESCE(cws.opening_time, c.opening_time)
          AND ${MANILA_TIME_SQL} < COALESCE(cws.closing_time, c.closing_time),
          1,
          0
        ) AS is_open_now
      FROM clinics c
      LEFT JOIN clinic_weekly_schedules cws
        ON cws.clinic_id = c.id
        AND cws.day_of_week = DAYNAME(${MANILA_DATE_SQL})
      LEFT JOIN clinic_blocked_dates cbd
        ON cbd.clinic_id = c.id
        AND cbd.blocked_date = ${MANILA_DATE_SQL}
      WHERE c.status = 'approved'
    `;

    const params = [];

    if (search) {
      sql += `
        AND (
          c.clinic_name LIKE ?
          OR c.address LIKE ?
          OR c.specialization LIKE ?
          OR c.services_offered LIKE ?
        )
      `;
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    if (specialization && specialization !== "All") {
      sql += ` AND c.specialization = ? `;
      params.push(specialization);
    }

    if (openNow === "true") {
      sql += `
        AND cbd.id IS NULL
        AND COALESCE(cws.is_working, 1) = 1
        AND ${MANILA_TIME_SQL} >= COALESCE(cws.opening_time, c.opening_time)
        AND ${MANILA_TIME_SQL} < COALESCE(cws.closing_time, c.closing_time)
      `;
    }

    sql += ` ORDER BY c.created_at DESC `;

    const [rows] = await pool.query(sql, params);

    if (!rows.length) {
      return res.json([]);
    }

    const clinicIds = rows.map((clinic) => clinic.id);
    const [weeklyScheduleRows] = await pool.query(
      `
      SELECT
        clinic_id,
        day_of_week,
        is_working,
        TIME_FORMAT(opening_time, '%H:%i:%s') AS opening_time,
        TIME_FORMAT(closing_time, '%H:%i:%s') AS closing_time
      FROM clinic_weekly_schedules
      WHERE clinic_id IN (?)
      ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
      `,
      [clinicIds]
    );

    const [blockedDateRows] = await pool.query(
      `
      SELECT
        id,
        clinic_id,
        DATE_FORMAT(blocked_date, '%Y-%m-%d') AS date,
        reason
      FROM clinic_blocked_dates
      WHERE clinic_id IN (?) AND blocked_date >= ${MANILA_DATE_SQL}
      ORDER BY blocked_date ASC
      `,
      [clinicIds]
    );

    res.json(
      rows.map((clinic) => ({
        ...clinic,
        weekly_schedule: weeklyScheduleRows.filter(
          (schedule) => schedule.clinic_id === clinic.id
        ),
        blocked_dates: blockedDateRows.filter(
          (blockedDate) => blockedDate.clinic_id === clinic.id
        ),
      }))
    );
  } catch (error) {
    console.error("Find clinic error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;
