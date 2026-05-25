const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

const ensureScheduleTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_weekly_schedules (
      id SERIAL PRIMARY KEY,
      clinic_id INTEGER NOT NULL,
      day_of_week VARCHAR(9) NOT NULL CHECK (
        day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')
      ),
      is_working SMALLINT NOT NULL DEFAULT 1,
      opening_time TIME DEFAULT NULL,
      closing_time TIME DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_clinic_day UNIQUE (clinic_id, day_of_week),
      CONSTRAINT fk_clinic_weekly_schedules_clinic
        FOREIGN KEY (clinic_id) REFERENCES clinics(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_blocked_dates (
      id SERIAL PRIMARY KEY,
      clinic_id INTEGER NOT NULL,
      blocked_date DATE NOT NULL,
      reason VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_clinic_blocked_date UNIQUE (clinic_id, blocked_date),
      CONSTRAINT fk_clinic_blocked_dates_clinic
        FOREIGN KEY (clinic_id) REFERENCES clinics(id)
        ON DELETE CASCADE
    )
  `);
};

const MANILA_NOW_SQL = "CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila'";
const MANILA_DATE_SQL = `(${MANILA_NOW_SQL})::date`;
const MANILA_TIME_SQL = `(${MANILA_NOW_SQL})::time`;

const ensureClinicFeedbackTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_feedback (
      id SERIAL PRIMARY KEY,
      appointment_id INTEGER NOT NULL,
      clinic_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating SMALLINT NOT NULL,
      feedback TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_feedback_appointment_user UNIQUE (appointment_id, user_id)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_clinic_feedback_clinic
    ON clinic_feedback (clinic_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_clinic_feedback_user
    ON clinic_feedback (user_id)
  `);
};

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
        to_char(c.opening_time, 'HH24:MI:SS') AS opening_time,
        to_char(c.closing_time, 'HH24:MI:SS') AS closing_time,
        c.operating_days,
        c.created_at,
        c.status,
        c.account_status,
        c.latitude,
        c.longitude,
        COALESCE(cws.is_working, 1) AS is_working_today,
        CASE WHEN cbd.id IS NULL THEN 0 ELSE 1 END AS is_blocked_today,
        to_char(COALESCE(cws.opening_time, c.opening_time), 'HH24:MI:SS') AS today_opening_time,
        to_char(COALESCE(cws.closing_time, c.closing_time), 'HH24:MI:SS') AS today_closing_time,
        to_char(${MANILA_DATE_SQL}, 'YYYY-MM-DD') AS clinic_today,
        to_char(${MANILA_TIME_SQL}, 'HH24:MI:SS') AS clinic_now_time,
        CASE WHEN
          cbd.id IS NULL
          AND COALESCE(cws.is_working, 1) = 1
          AND ${MANILA_TIME_SQL} >= COALESCE(cws.opening_time, c.opening_time)
          AND ${MANILA_TIME_SQL} < COALESCE(cws.closing_time, c.closing_time)
          THEN 1
          ELSE 0
        END AS is_open_now
      FROM clinics c
      LEFT JOIN clinic_weekly_schedules cws
        ON cws.clinic_id = c.id
        AND cws.day_of_week = to_char(${MANILA_DATE_SQL}, 'FMDay')
      LEFT JOIN clinic_blocked_dates cbd
        ON cbd.clinic_id = c.id
        AND cbd.blocked_date = ${MANILA_DATE_SQL}
      WHERE c.status = 'approved'
    `;

    const params = [];

    if (search) {
      sql += `
        AND (
          c.clinic_name ILIKE ?
          OR c.address ILIKE ?
          OR c.specialization ILIKE ?
          OR c.services_offered ILIKE ?
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
        to_char(opening_time, 'HH24:MI:SS') AS opening_time,
        to_char(closing_time, 'HH24:MI:SS') AS closing_time
      FROM clinic_weekly_schedules
      WHERE clinic_id IN (?)
      ORDER BY CASE day_of_week
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
        ELSE 8
      END
      `,
      [clinicIds]
    );

    const [blockedDateRows] = await pool.query(
      `
      SELECT
        id,
        clinic_id,
        to_char(blocked_date, 'YYYY-MM-DD') AS date,
        reason
      FROM clinic_blocked_dates
      WHERE clinic_id IN (?) AND blocked_date >= ${MANILA_DATE_SQL}
      ORDER BY blocked_date ASC
      `,
      [clinicIds]
    );

    await ensureClinicFeedbackTable();

    const [ratingRows] = await pool.query(
      `
      SELECT
        clinic_id,
        ROUND(AVG(rating), 1) AS average_rating,
        COUNT(*) AS rating_count
      FROM clinic_feedback
      WHERE clinic_id IN (?)
      GROUP BY clinic_id
      `,
      [clinicIds]
    );

    const ratingsByClinic = new Map(
      ratingRows.map((rating) => [Number(rating.clinic_id), rating])
    );

    res.json(
      rows.map((clinic) => {
        const rating = ratingsByClinic.get(Number(clinic.id));

        return {
          ...clinic,
          average_rating: rating ? Number(rating.average_rating) : null,
          rating_count: rating ? Number(rating.rating_count) : 0,
          weekly_schedule: weeklyScheduleRows.filter(
            (schedule) => schedule.clinic_id === clinic.id
          ),
          blocked_dates: blockedDateRows.filter(
            (blockedDate) => blockedDate.clinic_id === clinic.id
          ),
        };
      })
    );
  } catch (error) {
    console.error("Find clinic error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
});

/* =================================================
   PUBLIC CLINIC DETAIL
   Final route: GET /api/clinics/:id
   Accessible by all authenticated users (no role restriction).
================================================= */

router.get("/:id", async (req, res) => {
  try {
    const clinicId = Number(req.params.id);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required." });
    }

    await ensureScheduleTables();

    const [[clinic]] = await pool.query(
      `
      SELECT
        c.id,
        c.clinic_name,
        c.email,
        c.phone,
        c.address,
        c.specialization,
        c.services_offered,
        c.years_operation,
        to_char(c.opening_time, 'HH24:MI') AS opening_time,
        to_char(c.closing_time, 'HH24:MI') AS closing_time,
        c.operating_days,
        c.status,
        c.account_status,
        c.latitude,
        c.longitude,
        p.province_name,
        m.name AS municipality_name,
        b.name AS barangay_name
      FROM clinics c
      LEFT JOIN provinces p ON p.id = c.province_id
      LEFT JOIN municipalities m ON m.id = c.municipality_id
      LEFT JOIN barangays b ON b.id = c.barangay_id
      WHERE c.id = ? AND c.status = 'approved'
      LIMIT 1
      `,
      [clinicId]
    );

    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found." });
    }

    const [weeklySchedule] = await pool.query(
      `
      SELECT
        clinic_id,
        day_of_week,
        is_working,
        to_char(opening_time, 'HH24:MI') AS opening_time,
        to_char(closing_time, 'HH24:MI') AS closing_time
      FROM clinic_weekly_schedules
      WHERE clinic_id = ?
      ORDER BY CASE day_of_week
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
        ELSE 8
      END
      `,
      [clinicId]
    );

    const [blockedDates] = await pool.query(
      `
      SELECT
        id,
        clinic_id,
        to_char(blocked_date, 'YYYY-MM-DD') AS date,
        reason
      FROM clinic_blocked_dates
      WHERE clinic_id = ? AND blocked_date >= CURRENT_DATE
      ORDER BY blocked_date ASC
      `,
      [clinicId]
    );

    const [services] = await pool.query(
      `
      SELECT
        id,
        name,
        description,
        price,
        duration_minutes,
        is_active
      FROM clinic_services
      WHERE clinic_id = ?
      ORDER BY name ASC
      `,
      [clinicId]
    );

    await ensureClinicFeedbackTable();

    const [[ratingSummary]] = await pool.query(
      `
      SELECT
        ROUND(AVG(rating), 1) AS average_rating,
        COUNT(*) AS rating_count
      FROM clinic_feedback
      WHERE clinic_id = ?
      `,
      [clinicId]
    );

    const locationParts = [
      clinic.address,
      clinic.barangay_name,
      clinic.municipality_name,
      clinic.province_name,
    ].filter(Boolean);

    return res.json({
      ...clinic,
      average_rating: ratingSummary?.average_rating
        ? Number(ratingSummary.average_rating)
        : null,
      rating_count: ratingSummary ? Number(ratingSummary.rating_count || 0) : 0,
      location_text: locationParts.join(", "),
      services,
      weekly_schedule: weeklySchedule,
      blocked_dates: blockedDates,
    });
  } catch (err) {
    console.error("Load clinic details error:", err);
    return res.status(500).json({ message: "Failed to load clinic details." });
  }
});

module.exports = router;
