const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

console.log("✅ LOADED appointments.js");

router.get("/test", (req, res) => {
  res.json({ message: "appointments route works" });
});

const DAYS_BY_INDEX = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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

const toClockTime = (value) => {
  const match = String(value || "").match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : null;
};

const timeToMinutes = (value) => {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
};

const parseLocalDateTime = (value) => {
  const parsed = new Date(String(value || "").replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getScheduleConflict = async (
  connection,
  clinicId,
  startAt,
  endAt,
  clinic
) => {
  const normalizedStart = String(startAt || "").replace(" ", "T");
  const startDate = parseLocalDateTime(normalizedStart);
  const appointmentDate = String(startAt || "").slice(0, 10);
  const startTime = String(startAt || "").slice(11, 16);
  const endTime = String(endAt || "").slice(11, 16);

  if (
    !startDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) ||
    !/^\d{2}:\d{2}$/.test(startTime) ||
    !/^\d{2}:\d{2}$/.test(endTime)
  ) {
    return "Invalid appointment date or time.";
  }

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return "Appointment end time must be after start time.";
  }

  if (startDate.getTime() <= Date.now()) {
    return "Please choose a future date and time for the appointment.";
  }

  await ensureScheduleTables();

  const [[blockedDate]] = await connection.query(
    `
    SELECT id
    FROM clinic_blocked_dates
    WHERE clinic_id = ? AND blocked_date = ?
    LIMIT 1
    `,
    [clinicId, appointmentDate]
  );

  if (blockedDate) {
    return "Clinic is unavailable on the selected date.";
  }

  const dayName = DAYS_BY_INDEX[startDate.getDay()];

  const [[daySchedule]] = await connection.query(
    `
    SELECT is_working, opening_time, closing_time
    FROM clinic_weekly_schedules
    WHERE clinic_id = ? AND day_of_week = ?
    LIMIT 1
    `,
    [clinicId, dayName]
  );

  const isWorking = daySchedule
    ? Number(daySchedule.is_working) === 1
    : true;
  const openingTime =
    toClockTime(daySchedule?.opening_time) || toClockTime(clinic?.opening_time);
  const closingTime =
    toClockTime(daySchedule?.closing_time) || toClockTime(clinic?.closing_time);

  if (!isWorking) {
    return `Clinic is closed on ${dayName}.`;
  }

  if (
    openingTime &&
    closingTime &&
    (timeToMinutes(startTime) < timeToMinutes(openingTime) ||
      timeToMinutes(endTime) > timeToMinutes(closingTime))
  ) {
    return `Selected time is outside clinic hours for ${dayName} (${openingTime} - ${closingTime}).`;
  }

  return null;
};

router.get("/by-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        a.user_id,
        a.clinic_id,
        a.start_at,
        a.end_at,
        a.purpose,
        a.symptoms,
        a.patient_note,
        a.clinic_note,
        a.status,
        a.cancelled_at,
        a.cancelled_by,
        a.cancel_reason,
        a.completed_at,
        a.patient_name_snapshot,
        a.patient_phone_snapshot,
        a.clinic_name_snapshot,
        a.created_at,
        a.updated_at,
        c.clinic_name,
        c.specialization,
        c.address,
        c.opening_time,
        c.closing_time
      FROM appointments a
      JOIN clinics c ON c.id = a.clinic_id
      WHERE a.user_id = ?
      ORDER BY a.start_at ASC
      `,
      [userId]
    );

    if (!rows.length) {
      return res.json([]);
    }

    const appointmentIds = rows.map((r) => r.id);

    const [services] = await pool.query(
      `
      SELECT
        appointment_id,
        service_id,
        service_name_snapshot,
        price_snapshot,
        duration_minutes_snapshot,
        description
      FROM appointment_services
      WHERE appointment_id IN (?)
      ORDER BY appointment_id ASC
      `,
      [appointmentIds]
    );

    const result = rows.map((row) => ({
      ...row,
      services: services.filter((s) => s.appointment_id === row.id),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
});

router.post("/book", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      user_id,
      clinic_id,
      start_at,
      end_at,
      purpose,
      symptoms,
      patient_note,
      patient_name_snapshot,
      patient_phone_snapshot,
      clinic_name_snapshot,
      services = [],
    } = req.body;

    if (!user_id || !clinic_id || !start_at || !end_at) {
      return res.status(400).json({
        message: "user_id, clinic_id, start_at, and end_at are required",
      });
    }

    const [[clinic]] = await connection.query(
      `
      SELECT id, clinic_name, status, account_status, opening_time, closing_time
      FROM clinics
      WHERE id = ?
      `,
      [clinic_id]
    );

    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    if (clinic.status !== "approved" || clinic.account_status !== "active") {
      return res.status(400).json({
        message: "This clinic is not available for booking",
      });
    }

    const scheduleConflict = await getScheduleConflict(
      connection,
      clinic_id,
      start_at,
      end_at,
      clinic
    );

    if (scheduleConflict) {
      return res.status(400).json({ message: scheduleConflict });
    }

    await connection.beginTransaction();

    const [appointmentResult] = await connection.query(
      `
      INSERT INTO appointments (
        user_id,
        clinic_id,
        start_at,
        end_at,
        purpose,
        symptoms,
        patient_note,
        clinic_note,
        status,
        patient_name_snapshot,
        patient_phone_snapshot,
        clinic_name_snapshot,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'pending', ?, ?, ?, NOW(), NOW())
      `,
      [
        user_id,
        clinic_id,
        start_at,
        end_at,
        purpose || null,
        symptoms || null,
        patient_note || null,
        patient_name_snapshot || null,
        patient_phone_snapshot || null,
        clinic_name_snapshot || clinic.clinic_name,
      ]
    );

    const appointmentId = appointmentResult.insertId;

    if (Array.isArray(services) && services.length > 0) {
      for (const service of services) {
        await connection.query(
          `
          INSERT INTO appointment_services (
            appointment_id,
            service_id,
            service_name_snapshot,
            price_snapshot,
            duration_minutes_snapshot,
            created_at,
            description
          )
          VALUES (?, ?, ?, ?, ?, NOW(), ?)
          `,
          [
            appointmentId,
            service.service_id,
            service.service_name_snapshot || null,
            service.price_snapshot || 0,
            service.duration_minutes_snapshot || 0,
            service.description || null,
          ]
        );
      }
    }

    await connection.query(
      `
      INSERT INTO appointment_status_history (
        appointment_id,
        old_status,
        new_status,
        changed_by,
        changed_by_id,
        note,
        changed_at
      )
      VALUES (?, NULL, 'pending', 'patient', ?, 'Appointment booked', NOW())
      `,
      [appointmentId, user_id]
    );

    await connection.commit();

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment_id: appointmentId,
    });
  } catch (err) {
  await connection.rollback();
  console.error("Book appointment error:", err);

  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "That clinic already has an appointment at that time",
      error_code: err.code,
      error_detail: err.sqlMessage || err.message,
    });
  }

  res.status(500).json({
    message: "Failed to book appointment",
    error_code: err.code || null,
    error_detail: err.sqlMessage || err.message || "Unknown database error",
  });
} finally {
  connection.release();
}
});
router.patch("/:id/cancel", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { user_id, reason } = req.body;

    const [[appointment]] = await connection.query(
      `SELECT id, status, user_id, clinic_id FROM appointments WHERE id = ?`,
      [id]
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (Number(appointment.user_id) !== Number(user_id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!["pending", "confirmed"].includes(appointment.status)) {
      return res.status(400).json({
        message: "Only pending or confirmed appointments can be cancelled",
      });
    }

    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE appointments
      SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancelled_by = 'patient',
        cancel_reason = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [reason || "Cancelled by patient", id]
    );

    await connection.query(
      `
      INSERT INTO appointment_status_history (
        appointment_id,
        old_status,
        new_status,
        changed_by,
        changed_by_id,
        note,
        changed_at
      )
      VALUES (?, ?, 'cancelled', 'patient', ?, ?, NOW())
      `,
      [id, appointment.status, user_id, reason || "Cancelled by patient"]
    );

    await connection.commit();

    res.json({ message: "Appointment cancelled successfully" });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Failed to cancel appointment" });
  } finally {
    connection.release();
  }
});
router.patch("/:id/reschedule", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { user_id, start_at, end_at } = req.body;

    const [[appointment]] = await connection.query(
      `SELECT id, status, user_id, clinic_id FROM appointments WHERE id = ?`,
      [id]
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (Number(appointment.user_id) !== Number(user_id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!["pending", "confirmed"].includes(appointment.status)) {
      return res.status(400).json({
        message: "Only pending or confirmed appointments can be rescheduled",
      });
    }

    const [[clinic]] = await connection.query(
      `
      SELECT id, opening_time, closing_time
      FROM clinics
      WHERE id = ?
      `,
      [appointment.clinic_id]
    );

    const scheduleConflict = await getScheduleConflict(
      connection,
      appointment.clinic_id,
      start_at,
      end_at,
      clinic
    );

    if (scheduleConflict) {
      return res.status(400).json({ message: scheduleConflict });
    }

    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE appointments
      SET start_at = ?, end_at = ?, updated_at = NOW()
      WHERE id = ?
      `,
      [start_at, end_at, id]
    );

    await connection.commit();

    res.json({ message: "Appointment rescheduled successfully" });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Failed to reschedule appointment" });
  } finally {
    connection.release();
  }
});
module.exports = router;
