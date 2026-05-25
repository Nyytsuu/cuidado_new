const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { verifyToken } = require("../middleware/auth");

console.log("✅ LOADED appointments.js");

// All appointment routes require a valid JWT
router.use(verifyToken);

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

let appointmentRescheduleSchemaPromise = null;
let clinicFeedbackSchemaPromise = null;
let clinicNotificationsSchemaPromise = null;
let appointmentsSchemaPromise = null;

const ensureAppointmentsSchema = async () => {
  if (!appointmentsSchemaPromise) {
    appointmentsSchemaPromise = (async () => {
      // Create appointment_status_history table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS appointment_status_history (
          id SERIAL PRIMARY KEY,
          appointment_id INT NOT NULL,
          old_status VARCHAR(30) NULL,
          new_status VARCHAR(30) NOT NULL DEFAULT 'pending',
          changed_by VARCHAR(20) NOT NULL DEFAULT 'system',
          changed_by_id INT NULL,
          note TEXT NULL,
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_appt_status_history_appt
        ON appointment_status_history (appointment_id)
      `);

      // Create appointment_services table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS appointment_services (
          id SERIAL PRIMARY KEY,
          appointment_id INT NOT NULL,
          service_id INT NULL,
          service_name_snapshot VARCHAR(150) NULL,
          price_snapshot NUMERIC(10,2) NOT NULL DEFAULT 0,
          duration_minutes_snapshot INT NOT NULL DEFAULT 0,
          description TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_appt_services_appt
        ON appointment_services (appointment_id)
      `);

      // Add any missing columns to the appointments table (PostgreSQL-safe)
      const columnDefs = [
        ['start_at',                'TIMESTAMP NULL'],
        ['end_at',                  'TIMESTAMP NULL'],
        ['proposed_start_at',       'TIMESTAMP NULL'],
        ['proposed_end_at',         'TIMESTAMP NULL'],
        ['purpose',                 'TEXT NULL'],
        ['symptoms',                'TEXT NULL'],
        ['patient_note',            'TEXT NULL'],
        ['clinic_note',             'TEXT NULL'],
        ['cancel_reason',           'TEXT NULL'],
        ['cancelled_at',            'TIMESTAMP NULL'],
        ['cancelled_by',            'VARCHAR(20) NULL'],
        ['completed_at',            'TIMESTAMP NULL'],
        ['reschedule_reason',       'TEXT NULL'],
        ['reschedule_requested_by', 'VARCHAR(20) NULL'],
        ['reschedule_requested_at', 'TIMESTAMP NULL'],
        ['patient_name_snapshot',   'VARCHAR(150) NULL'],
        ['patient_phone_snapshot',  'VARCHAR(50) NULL'],
        ['clinic_name_snapshot',    'VARCHAR(150) NULL'],
      ];

      for (const [col, type] of columnDefs) {
        await pool.query(
          `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ${col} ${type}`
        );
      }
    })().catch((error) => {
      appointmentsSchemaPromise = null;
      throw error;
    });
  }
  return appointmentsSchemaPromise;
};

const ensureAppointmentRescheduleColumns = async () => {
  if (!appointmentRescheduleSchemaPromise) {
    appointmentRescheduleSchemaPromise = (async () => {
      // All columns and tables are managed by ensureAppointmentsSchema
      await ensureAppointmentsSchema();
    })().catch((error) => {
      appointmentRescheduleSchemaPromise = null;
      throw error;
    });
  }

  return appointmentRescheduleSchemaPromise;
};

const ensureClinicFeedbackTable = async () => {
  if (!clinicFeedbackSchemaPromise) {
    clinicFeedbackSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS clinic_feedback (
          id SERIAL PRIMARY KEY,
          appointment_id INT NOT NULL,
          clinic_id INT NOT NULL,
          user_id INT NOT NULL,
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
    })().catch((error) => {
      clinicFeedbackSchemaPromise = null;
      throw error;
    });
  }

  return clinicFeedbackSchemaPromise;
};

const ensureClinicNotificationsTable = async () => {
  if (!clinicNotificationsSchemaPromise) {
    clinicNotificationsSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS clinic_notifications (
          id SERIAL PRIMARY KEY,
          clinic_id INT NOT NULL,
          unique_key VARCHAR(160) NOT NULL,
          title VARCHAR(180) NOT NULL,
          message TEXT NOT NULL,
          category VARCHAR(80) NOT NULL DEFAULT 'Appointments',
          icon VARCHAR(40) NOT NULL DEFAULT 'calendar',
          is_read SMALLINT NOT NULL DEFAULT 0,
          appointment_id INT DEFAULT NULL,
          read_at TIMESTAMP DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_clinic_notification UNIQUE (clinic_id, unique_key)
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_clinic_notifications_clinic
        ON clinic_notifications (clinic_id, is_read, created_at)
      `);
    })().catch((error) => {
      clinicNotificationsSchemaPromise = null;
      throw error;
    });
  }

  return clinicNotificationsSchemaPromise;
};

const ensureScheduleTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_weekly_schedules (
      id SERIAL PRIMARY KEY,
      clinic_id INT NOT NULL,
      day_of_week VARCHAR(10) NOT NULL
        CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
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
      clinic_id INT NOT NULL,
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

const toClockTime = (value) => {
  const match = String(value || "").match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : null;
};

const timeToMinutes = (value) => {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
};

const normalizeDayToken = (value) =>
  String(value || "").trim().toLowerCase().replace(/\./g, "");

const isOperatingFromSummary = (operatingDays, dayName) => {
  const daysRaw = normalizeDayToken(operatingDays);
  const dayShort = normalizeDayToken(dayName).slice(0, 3);

  if (!daysRaw) return true;

  if (daysRaw.includes("daily") || daysRaw.includes("everyday")) {
    return true;
  }

  if (daysRaw.includes("mon-fri") || daysRaw.includes("monday-friday")) {
    return ["mon", "tue", "wed", "thu", "fri"].includes(dayShort);
  }

  if (daysRaw.includes("mon-sat") || daysRaw.includes("monday-saturday")) {
    return ["mon", "tue", "wed", "thu", "fri", "sat"].includes(dayShort);
  }

  const dayAliases = {
    monday: "mon",
    tuesday: "tue",
    wednesday: "wed",
    thursday: "thu",
    friday: "fri",
    saturday: "sat",
    sunday: "sun",
  };

  const tokens = daysRaw
    .split(/[,/|]+/)
    .map((item) => normalizeDayToken(item))
    .filter(Boolean)
    .map((item) => dayAliases[item] || item.slice(0, 3));

  return tokens.includes(dayShort);
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
    : isOperatingFromSummary(clinic?.operating_days, dayName);
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
        TO_CHAR(a.start_at, 'YYYY-MM-DD HH24:MI:SS') AS start_at,
        TO_CHAR(a.end_at, 'YYYY-MM-DD HH24:MI:SS') AS end_at,
        TO_CHAR(a.proposed_start_at, 'YYYY-MM-DD HH24:MI:SS') AS proposed_start_at,
        TO_CHAR(a.proposed_end_at, 'YYYY-MM-DD HH24:MI:SS') AS proposed_end_at,
        a.purpose,
        a.symptoms,
        a.patient_note,
        a.clinic_note,
        a.status,
        TO_CHAR(a.cancelled_at, 'YYYY-MM-DD HH24:MI:SS') AS cancelled_at,
        a.cancelled_by,
        a.cancel_reason,
        a.reschedule_reason,
        a.reschedule_requested_by,
        TO_CHAR(a.reschedule_requested_at, 'YYYY-MM-DD HH24:MI:SS') AS reschedule_requested_at,
        TO_CHAR(a.completed_at, 'YYYY-MM-DD HH24:MI:SS') AS completed_at,
        a.patient_name_snapshot,
        a.patient_phone_snapshot,
        a.clinic_name_snapshot,
        TO_CHAR(a.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
        TO_CHAR(a.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at,
        c.clinic_name,
        c.specialization,
        c.address,
        c.opening_time,
        c.closing_time,
        cf.id AS feedback_id,
        cf.rating AS clinic_feedback_rating,
        cf.feedback AS clinic_feedback_text,
        TO_CHAR(cf.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS clinic_feedback_updated_at
      FROM appointments a
      JOIN clinics c ON c.id = a.clinic_id
      LEFT JOIN clinic_feedback cf
        ON cf.appointment_id = a.id
        AND cf.user_id = a.user_id
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
      services: services.filter(
        (s) => Number(s.appointment_id) === Number(row.id)
      ),
    }));

    res.json(result);
  } catch (err) {
    console.error("Failed to fetch appointments:", err);
    res.status(500).json({
      message: "Failed to fetch appointments",
      error: err.message,
      code: err.code || null,
    });
  }
}); 


router.post("/book", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureAppointmentsSchema();
    await ensureClinicNotificationsTable();

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
      SELECT id, clinic_name, status, account_status, opening_time, closing_time, operating_days
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
      RETURNING id
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

    const appointmentDate = new Date(String(start_at).replace(" ", "T"));
    const appointmentLabel = Number.isNaN(appointmentDate.getTime())
      ? "the selected schedule"
      : appointmentDate.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
    const patientLabel = patient_name_snapshot || "A patient";
    const purposeLabel = purpose || "consultation";

    await connection.query(
      `
      INSERT INTO clinic_notifications (
        clinic_id,
        unique_key,
        title,
        message,
        category,
        icon,
        appointment_id,
        created_at
      )
      VALUES (?, ?, ?, ?, 'Appointments', 'calendar', ?, NOW())
      ON CONFLICT (clinic_id, unique_key) DO UPDATE SET
        title = EXCLUDED.title,
        message = EXCLUDED.message,
        category = EXCLUDED.category,
        icon = EXCLUDED.icon,
        appointment_id = EXCLUDED.appointment_id,
        updated_at = NOW()
      `,
      [
        clinic_id,
        `appointment:${appointmentId}:new`,
        "New appointment request",
        `${patientLabel} requested ${purposeLabel} for ${appointmentLabel}.`,
        appointmentId,
      ]
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
    await ensureAppointmentRescheduleColumns();

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

    if (!["pending", "confirmed", "reschedule_requested"].includes(appointment.status)) {
      return res.status(400).json({
        message:
          "Only pending, confirmed, or reschedule-requested appointments can be cancelled",
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
        proposed_start_at = NULL,
        proposed_end_at = NULL,
        reschedule_reason = NULL,
        reschedule_requested_by = NULL,
        reschedule_requested_at = NULL,
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

router.patch("/:id/reschedule-response", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureAppointmentRescheduleColumns();

    const { id } = req.params;
    const { user_id, action } = req.body;

    if (!["accept", "cancel"].includes(action)) {
      return res.status(400).json({ message: "Action must be accept or cancel." });
    }

    const [[appointment]] = await connection.query(
      `
      SELECT
        id,
        status,
        user_id,
        clinic_id,
        start_at,
        end_at,
        proposed_start_at,
        proposed_end_at
      FROM appointments
      WHERE id = ?
      `,
      [id]
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (Number(appointment.user_id) !== Number(user_id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (appointment.status !== "reschedule_requested") {
      return res.status(400).json({
        message: "This appointment does not have a pending reschedule request.",
      });
    }

    if (!appointment.proposed_start_at || !appointment.proposed_end_at) {
      return res.status(400).json({
        message: "The clinic has not provided a valid proposed schedule.",
      });
    }

    await connection.beginTransaction();

    if (action === "accept") {
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
        appointment.proposed_start_at,
        appointment.proposed_end_at,
        clinic
      );

      if (scheduleConflict) {
        await connection.rollback();
        return res.status(400).json({ message: scheduleConflict });
      }

      await connection.query(
        `
        UPDATE appointments
        SET
          start_at = proposed_start_at,
          end_at = proposed_end_at,
          proposed_start_at = NULL,
          proposed_end_at = NULL,
          reschedule_reason = NULL,
          reschedule_requested_by = NULL,
          reschedule_requested_at = NULL,
          status = 'confirmed',
          updated_at = NOW()
        WHERE id = ?
        `,
        [id]
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
        VALUES (?, 'reschedule_requested', 'confirmed', 'patient', ?, ?, NOW())
        `,
        [id, user_id, "Patient accepted the clinic's proposed reschedule"]
      );

      await connection.commit();

      return res.json({
        message: "Reschedule accepted. Your appointment was updated.",
      });
    }

    await connection.query(
      `
      UPDATE appointments
      SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancelled_by = 'patient',
        cancel_reason = 'Patient declined clinic reschedule request',
        proposed_start_at = NULL,
        proposed_end_at = NULL,
        reschedule_reason = NULL,
        reschedule_requested_by = NULL,
        reschedule_requested_at = NULL,
        updated_at = NOW()
      WHERE id = ?
      `,
      [id]
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
      VALUES (?, 'reschedule_requested', 'cancelled', 'patient', ?, ?, NOW())
      `,
      [id, user_id, "Patient declined the clinic's proposed reschedule"]
    );

    await connection.commit();

    res.json({
      message: "Reschedule declined. The appointment was cancelled.",
    });
  } catch (err) {
    await connection.rollback();
    console.error("Reschedule response error:", err);
    res.status(500).json({ message: "Failed to update reschedule response" });
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
