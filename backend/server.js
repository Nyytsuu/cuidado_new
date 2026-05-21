console.log("✅ RUNNING THIS FILE:", __filename);

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require("./db/pool");

const adminRoutes = require("./routes/admin.routes");
const clinicRoutes = require("./routes/clinic.routes");
const locationRoutes = require("./routes/location.routes");
const authRoutes = require("./routes/auth.routes");
const adminConditionsRoutes = require("./routes/admin.condition.routes");
const adminSymptomsRoutes = require("./routes/admin.symptoms.routes");
const adminConditionSymptomsRoutes = require("./routes/admin.conditionSymptoms.routes");
const appointmentRoutes = require("./routes/appointments");
const symptomCheckerRoute = require("./routes/symptomChecker");
const voiceAssistantRoute = require("./routes/voiceAssistant");
const findClinicRoute = require("./routes/findClinic");
const usersRouter = require("./routes/users");
const articlesRouter = require("./routes/articles");
const clinicFeedbackRouter = require("./routes/clinicFeedback");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("➡️", req.method, req.url);
  next();
});

app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.send("Cuidado backend is running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
/* ✅ TEST ROUTES */
app.get("/", (req, res) => res.send("Cuidado Medihelp API is running ✅"));
app.get("/ping", (req, res) => res.send("PONG"));
app.get("/api/test", (req, res) => res.json({ message: "Backend works!" }));

/* ✅ ADMIN DASHBOARD ROUTES */
app.get("/api/admin/dashboard-metrics", async (req, res) => {
  try {
    const [[usersCount]] = await pool.query(
      "SELECT COUNT(*) AS totalUsers FROM users"
    );
    const [[clinicsCount]] = await pool.query(
      "SELECT COUNT(*) AS totalClinics FROM clinics"
    );
    const [[pendingClinics]] = await pool.query(
      "SELECT COUNT(*) AS pendingClinics FROM clinics WHERE status = 'pending'"
    );
    const [[scheduledAppointments]] = await pool.query(`
      SELECT COUNT(*) AS scheduledAppointments
      FROM appointments
      WHERE status IN ('pending', 'confirmed', 'reschedule_requested', 'scheduled', 'approved')
    `);

    const [trendRows] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS total
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY day ASC
    `);

    const toDateKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const filled = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toDateKey(d);
      const found = trendRows.find((r) => String(r.day) === key);

      filled.push({ day: key, total: found ? Number(found.total) : 0 });
    }

    res.json({
      totalUsers: Number(usersCount.totalUsers),
      totalClinics: Number(clinicsCount.totalClinics),
      pendingClinics: Number(pendingClinics.pendingClinics),
      scheduledAppointments: Number(scheduledAppointments.scheduledAppointments),
      userTrend: filled,
    });
  } catch (err) {
    console.error("Dashboard metrics error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/admin/db-check", async (req, res) => {
  try {
    const [[db]] = await pool.query("SELECT DATABASE() AS db");
    const [[u]] = await pool.query("SELECT COUNT(*) AS c FROM users");
    const [[c]] = await pool.query("SELECT COUNT(*) AS c FROM clinics");

    res.json({
      connected_db: db.db,
      users_rows: Number(u.c),
      clinics_rows: Number(c.c),
    });
  } catch (err) {
    console.error("DB CHECK ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/recent-activity", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 10), 30);

    const baseUnion = `
      (SELECT 
        CONCAT('user-', u.id) AS id,
        'user' AS type,
        CONCAT('New user registered: ', u.full_name) AS text,
        u.created_at AS time
      FROM users u)

      UNION ALL

      (SELECT
        CONCAT('clinic-', c.id) AS id,
        'clinic' AS type,
        CONCAT('Clinic registered: ', c.clinic_name) AS text,
        c.created_at AS time
      FROM clinics c)
    `;

    let rows;

    try {
      const unionWithStatus = `
        ${baseUnion}
        UNION ALL
        (SELECT
          CONCAT('clinic-status-', c.id, '-', UNIX_TIMESTAMP(c.status_updated_at)) AS id,
          CASE 
            WHEN c.status = 'approved' THEN 'clinic-approved'
            WHEN c.status = 'rejected' THEN 'clinic-rejected'
            ELSE 'clinic'
          END AS type,
          CONCAT('Clinic ', c.status, ': ', c.clinic_name) AS text,
          c.status_updated_at AS time
        FROM clinics c
        WHERE c.status_updated_at IS NOT NULL)
        ORDER BY time DESC
        LIMIT ?
      `;

      const [r] = await pool.query(unionWithStatus, [limit]);
      rows = r;
    } catch (e) {
      const unionNoStatus = `
        ${baseUnion}
        ORDER BY time DESC
        LIMIT ?
      `;

      const [r] = await pool.query(unionNoStatus, [limit]);
      rows = r;
    }

    res.json(
      rows.map((x) => ({
        id: String(x.id),
        type: String(x.type),
        text: String(x.text),
        time: x.time,
      }))
    );
  } catch (err) {
    console.error("Recent activity error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ✅ CLINIC PATIENTS ROUTE */
app.get("/api/clinic/patients", async (req, res) => {
  try {
    const clinicId = Number(req.query.clinic_id);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.full_name AS name,
        u.phone AS contact,
        u.date_of_birth,
        MAX(a.start_at) AS lastVisit
      FROM appointments a
      INNER JOIN users u ON u.id = a.user_id
      WHERE a.clinic_id = ?
      GROUP BY u.id, u.full_name, u.phone, u.date_of_birth
      ORDER BY lastVisit DESC
      `,
      [clinicId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Clinic patients list error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ✅ CLINIC DASHBOARD ROUTES */
app.get("/api/clinic/dashboard/metrics", async (req, res) => {
  try {
    const clinicId = Number(req.query.clinic_id);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required" });
    }

    const [[todayAppointments]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM appointments
      WHERE clinic_id = ?
        AND DATE(start_at) = CURDATE()
      `,
      [clinicId]
    );

    const [[pendingAppointments]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM appointments
      WHERE clinic_id = ?
        AND status = 'pending'
      `,
      [clinicId]
    );

    const [[totalPatients]] = await pool.query(
      `
      SELECT COUNT(DISTINCT user_id) AS total
      FROM appointments
      WHERE clinic_id = ?
      `,
      [clinicId]
    );

    const [[completedThisWeek]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM appointments
      WHERE clinic_id = ?
        AND status = 'completed'
        AND YEARWEEK(start_at, 1) = YEARWEEK(CURDATE(), 1)
      `,
      [clinicId]
    );

    res.json({
      totalPatients: Number(totalPatients.total || 0),
      totalAppointments: Number(todayAppointments.total || 0),
      pendingAppointments: Number(pendingAppointments.total || 0),
      completedAppointments: Number(completedThisWeek.total || 0),
    });
  } catch (err) {
    console.error("Clinic dashboard metrics error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/clinic/dashboard/appointments", async (req, res) => {
  try {
    const clinicId = Number(req.query.clinic_id);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        COALESCE(u.full_name, a.patient_name_snapshot, 'Unknown Patient') AS patient,
        COALESCE(
          GROUP_CONCAT(DISTINCT aps.service_name_snapshot SEPARATOR ', '),
          a.purpose,
          'General Checkup'
        ) AS service,
        a.start_at AS schedule,
        a.status
      FROM appointments a
      LEFT JOIN users u
        ON u.id = a.user_id
      LEFT JOIN appointment_services aps
        ON aps.appointment_id = a.id
      WHERE a.clinic_id = ?
        AND DATE(a.start_at) = CURDATE()
      GROUP BY a.id, u.full_name, a.patient_name_snapshot, a.purpose, a.start_at, a.status
      ORDER BY a.start_at ASC
      LIMIT 10
      `,
      [clinicId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Clinic appointments error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/clinic/dashboard/patients", async (req, res) => {
  try {
    const clinicId = Number(req.query.clinic_id);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        MIN(a.created_at) AS created_at
      FROM appointments a
      INNER JOIN users u ON u.id = a.user_id
      WHERE a.clinic_id = ?
      GROUP BY u.id, u.full_name, u.email, u.phone
      ORDER BY MIN(a.created_at) DESC
      LIMIT 10
      `,
      [clinicId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Clinic patients error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/clinic/dashboard/activities", async (req, res) => {
  try {
    const clinicId = Number(req.query.clinic_id);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        ash.id,
        CASE
          WHEN ash.new_status = 'completed' THEN 'completed'
          WHEN ash.new_status = 'cancelled' THEN 'cancelled'
          ELSE 'appointment'
        END AS type,
        CONCAT(
          COALESCE(u.full_name, a.patient_name_snapshot, 'Patient'),
          ' appointment changed from ',
          COALESCE(ash.old_status, 'none'),
          ' to ',
          ash.new_status
        ) AS text,
        ash.changed_at AS time
      FROM appointment_status_history ash
      INNER JOIN appointments a
        ON a.id = ash.appointment_id
      LEFT JOIN users u
        ON u.id = a.user_id
      WHERE a.clinic_id = ?
      ORDER BY ash.changed_at DESC
      LIMIT 10
      `,
      [clinicId]
    );

    res.json(
      rows.map((x) => ({
        id: String(x.id),
        type: String(x.type),
        text: String(x.text),
        time: x.time,
      }))
    );
  } catch (err) {
    console.error("Clinic activities error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ✅ CLINIC SERVICES ROUTES */
app.get("/api/clinic/services", async (req, res) => {
  try {
    const clinicId = Number(req.query.clinic_id);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        clinic_id,
        name,
        description,
        price,
        duration_minutes,
        is_active,
        created_at,
        updated_at
      FROM clinic_services
      WHERE clinic_id = ?
      ORDER BY name ASC
      `,
      [clinicId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Clinic services fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/clinic/services", async (req, res) => {
  try {
    const {
      clinic_id,
      name,
      description,
      price,
      duration_minutes,
    } = req.body;

    if (!clinic_id || !name || !String(name).trim()) {
      return res.status(400).json({ message: "clinic_id and name are required" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO clinic_services (
        clinic_id,
        name,
        description,
        price,
        duration_minutes,
        is_active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
      `,
      [
        Number(clinic_id),
        String(name).trim(),
        description ? String(description).trim() : null,
        Number(price || 0),
        Number(duration_minutes || 0),
      ]
    );

    res.status(201).json({
      message: "Clinic service created successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error("Clinic service create error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.patch("/api/clinic/services/:id", async (req, res) => {
  try {
    const serviceId = Number(req.params.id);
    const {
      name,
      description,
      price,
      duration_minutes,
    } = req.body;

    if (!serviceId) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    await pool.query(
      `
      UPDATE clinic_services
      SET
        name = ?,
        description = ?,
        price = ?,
        duration_minutes = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        name ? String(name).trim() : "",
        description ? String(description).trim() : null,
        Number(price || 0),
        Number(duration_minutes || 0),
        serviceId,
      ]
    );

    res.json({ message: "Clinic service updated successfully" });
  } catch (err) {
    console.error("Clinic service update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.patch("/api/clinic/services/:id/toggle", async (req, res) => {
  try {
    const serviceId = Number(req.params.id);

    if (!serviceId) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    await pool.query(
      `
      UPDATE clinic_services
      SET
        is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
        updated_at = NOW()
      WHERE id = ?
      `,
      [serviceId]
    );

    res.json({ message: "Clinic service status updated successfully" });
  } catch (err) {
    console.error("Clinic service toggle error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.patch("/api/clinic/services/:id/status", async (req, res) => {
  try {
    const serviceId = Number(req.params.id);
    const isActive = Number(req.body?.is_active);

    if (!serviceId) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    if (![0, 1].includes(isActive)) {
      return res.status(400).json({ message: "is_active must be 0 or 1" });
    }

    const [result] = await pool.query(
      `
      UPDATE clinic_services
      SET
        is_active = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [isActive, serviceId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({
      message: "Clinic service status updated successfully",
      service: {
        id: serviceId,
        is_active: isActive,
      },
    });
  } catch (err) {
    console.error("Clinic service status update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/clinic/services/:id", async (req, res) => {
  try {
    const serviceId = Number(req.params.id);

    if (!serviceId) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    await pool.query(
      `
      DELETE FROM clinic_services
      WHERE id = ?
      `,
      [serviceId]
    );

    res.json({ message: "Clinic service deleted successfully" });
  } catch (err) {
    console.error("Clinic service delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ✅ CREATE APPOINTMENT ROUTE */
app.get("/api/clinic/appointments", async (req, res) => {
  try {
    await ensureAppointmentRescheduleColumns();

    const clinicId = Number(req.query.clinic_id);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        user_id,
        clinic_id,
        DATE_FORMAT(start_at, '%Y-%m-%d %H:%i:%s') AS start_at,
        DATE_FORMAT(end_at, '%Y-%m-%d %H:%i:%s') AS end_at,
        DATE_FORMAT(proposed_start_at, '%Y-%m-%d %H:%i:%s') AS proposed_start_at,
        DATE_FORMAT(proposed_end_at, '%Y-%m-%d %H:%i:%s') AS proposed_end_at,
        purpose,
        symptoms,
        patient_note,
        clinic_note,
        status,
        cancelled_at,
        cancelled_by,
        cancel_reason,
        reschedule_reason,
        reschedule_requested_by,
        DATE_FORMAT(reschedule_requested_at, '%Y-%m-%d %H:%i:%s') AS reschedule_requested_at,
        completed_at,
        patient_name_snapshot,
        patient_phone_snapshot,
        clinic_name_snapshot,
        created_at,
        updated_at
      FROM appointments
      WHERE clinic_id = ?
      ORDER BY start_at DESC
      `,
      [clinicId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load appointments error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ✅ GENERAL SERVICES ROUTE (ADMIN/SYSTEM LIST) */
app.get("/api/services", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT id, name, is_active
      FROM services
      WHERE is_active = 1
      ORDER BY name ASC
      `
    );

    res.json(rows);
  } catch (err) {
    console.error("Load services error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ✅ APPOINTMENT DETAILS ROUTE */
app.use("/api/appointments", appointmentRoutes);
app.get("/api/appointments/details/:id", async (req, res) => {
  try {
    const appointmentId = Number(req.params.id);

    if (!appointmentId) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    const [[appointment]] = await pool.query(
      `
      SELECT *
      FROM appointments
      WHERE id = ?
      `,
      [appointmentId]
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const [services] = await pool.query(
      `
      SELECT
        id,
        service_id,
        service_name_snapshot,
        price_snapshot,
        duration_minutes_snapshot
      FROM appointment_services
      WHERE appointment_id = ?
      ORDER BY id ASC
      `,
      [appointmentId]
    );

    res.json({
      ...appointment,
      services,
    });
  } catch (err) {
    console.error("Get appointment details error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
app.patch("/api/clinic/appointments/:id/status", async (req, res) => {
  try {
    const appointmentId = Number(req.params.id);
    const { status, cancelled_by } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    if (!["confirmed", "cancelled", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (status === "cancelled") {
      await pool.query(
        `
        UPDATE appointments
        SET
          status = ?,
          cancelled_at = NOW(),
          cancelled_by = ?,
          updated_at = NOW()
        WHERE id = ?
        `,
        [status, cancelled_by || "clinic", appointmentId]
      );
    } else if (status === "completed") {
      await pool.query(
        `
        UPDATE appointments
        SET
          status = ?,
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = ?
        `,
        [status, appointmentId]
      );
    } else {
      await pool.query(
        `
        UPDATE appointments
        SET
          status = ?,
          updated_at = NOW()
        WHERE id = ?
        `,
        [status, appointmentId]
      );
    }

    res.json({ message: "Appointment status updated successfully" });
  } catch (err) {
    console.error("Update appointment status error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
/* ✅ HEALTH BROWSER ROUTES */
app.patch("/api/clinic/appointments/:id/reschedule", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureAppointmentRescheduleColumns();

    const appointmentId = Number(req.params.id);
    const clinicId = Number(req.body.clinic_id);
    const { start_at, end_at, reason } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    if (!start_at) {
      return res.status(400).json({ message: "start_at is required" });
    }

    const startDate = new Date(String(start_at).replace(" ", "T"));
    const endDateFromBody = end_at
      ? new Date(String(end_at).replace(" ", "T"))
      : null;

    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ message: "Invalid start_at value" });
    }

    const [[appointment]] = await connection.query(
      `
      SELECT id, clinic_id, status, start_at, end_at
      FROM appointments
      WHERE id = ?
      `,
      [appointmentId]
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (clinicId && Number(appointment.clinic_id) !== clinicId) {
      return res
        .status(403)
        .json({ message: "Appointment does not belong to this clinic" });
    }

    if (
      !["pending", "confirmed", "reschedule_requested"].includes(
        String(appointment.status).toLowerCase()
      )
    ) {
      return res.status(400).json({
        message:
          "Only pending, confirmed, or existing reschedule requests can be updated",
      });
    }

    const currentStart = new Date(appointment.start_at).getTime();
    const currentEnd = appointment.end_at
      ? new Date(appointment.end_at).getTime()
      : NaN;
    const existingDuration =
      Number.isFinite(currentStart) &&
      Number.isFinite(currentEnd) &&
      currentEnd > currentStart
        ? currentEnd - currentStart
        : 30 * 60 * 1000;
    const finalEndDate =
      endDateFromBody && !Number.isNaN(endDateFromBody.getTime())
        ? endDateFromBody
        : new Date(startDate.getTime() + existingDuration);

    if (finalEndDate.getTime() <= startDate.getTime()) {
      return res.status(400).json({ message: "end_at must be after start_at" });
    }

    const pad = (value) => String(value).padStart(2, "0");
    const toMysqlDatetime = (date) =>
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
        date.getHours()
      )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE appointments
      SET
        proposed_start_at = ?,
        proposed_end_at = ?,
        reschedule_reason = ?,
        reschedule_requested_by = 'clinic',
        reschedule_requested_at = NOW(),
        status = 'reschedule_requested',
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        toMysqlDatetime(startDate),
        toMysqlDatetime(finalEndDate),
        reason || "Clinic requested a new schedule",
        appointmentId,
      ]
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
      VALUES (?, ?, 'reschedule_requested', 'clinic', ?, ?, NOW())
      `,
      [
        appointmentId,
        appointment.status,
        clinicId || null,
        reason ||
          `Clinic proposed a new schedule for ${toMysqlDatetime(startDate)}`,
      ]
    );

    await connection.commit();

    res.json({ message: "Reschedule request sent to the patient" });
  } catch (err) {
    await connection.rollback();
    console.error("Reschedule appointment error:", err);
    res.status(500).json({ message: "Failed to reschedule appointment" });
  } finally {
    connection.release();
  }
});

let appointmentRescheduleSchemaPromise = null;

const ensureAppointmentRescheduleColumns = async () => {
  if (!appointmentRescheduleSchemaPromise) {
    appointmentRescheduleSchemaPromise = (async () => {
      const [columns] = await pool.query(
        `
        SELECT COLUMN_NAME, COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'appointments'
          AND COLUMN_NAME IN (
            'status',
            'proposed_start_at',
            'proposed_end_at',
            'reschedule_reason',
            'reschedule_requested_by',
            'reschedule_requested_at'
          )
        `
      );

      const existing = new Map(
        columns.map((column) => [column.COLUMN_NAME, column.COLUMN_TYPE])
      );

      if (!existing.has("proposed_start_at")) {
        await pool.query(`
          ALTER TABLE appointments
          ADD COLUMN proposed_start_at DATETIME NULL AFTER end_at
        `);
      }

      if (!existing.has("proposed_end_at")) {
        await pool.query(`
          ALTER TABLE appointments
          ADD COLUMN proposed_end_at DATETIME NULL AFTER proposed_start_at
        `);
      }

      if (!existing.has("reschedule_reason")) {
        await pool.query(`
          ALTER TABLE appointments
          ADD COLUMN reschedule_reason TEXT NULL AFTER cancel_reason
        `);
      }

      if (!existing.has("reschedule_requested_by")) {
        await pool.query(`
          ALTER TABLE appointments
          ADD COLUMN reschedule_requested_by VARCHAR(20) NULL AFTER reschedule_reason
        `);
      }

      if (!existing.has("reschedule_requested_at")) {
        await pool.query(`
          ALTER TABLE appointments
          ADD COLUMN reschedule_requested_at DATETIME NULL AFTER reschedule_requested_by
        `);
      }

      const statusType = String(existing.get("status") || "");
      if (
        statusType.toLowerCase().startsWith("enum(") &&
        !statusType.includes("'reschedule_requested'")
      ) {
        await pool.query(`
          ALTER TABLE appointments
          MODIFY COLUMN status ENUM(
            'pending',
            'confirmed',
            'reschedule_requested',
            'cancelled',
            'completed',
            'no_show'
          ) NOT NULL DEFAULT 'pending'
        `);
      }

      const [historyColumns] = await pool.query(
        `
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'appointment_status_history'
          AND COLUMN_NAME IN ('old_status', 'new_status')
        `
      );

      for (const column of historyColumns) {
        const columnType = String(column.COLUMN_TYPE || "");
        if (
          columnType.toLowerCase().startsWith("enum(") &&
          !columnType.includes("'reschedule_requested'")
        ) {
          const nullability =
            column.IS_NULLABLE === "NO" ? "NOT NULL" : "NULL";

          await pool.query(`
            ALTER TABLE appointment_status_history
            MODIFY COLUMN ${column.COLUMN_NAME} ENUM(
              'pending',
              'confirmed',
              'reschedule_requested',
              'cancelled',
              'completed',
              'no_show'
            ) ${nullability}
          `);
        }
      }
    })().catch((error) => {
      appointmentRescheduleSchemaPromise = null;
      throw error;
    });
  }

  return appointmentRescheduleSchemaPromise;
};

const ensureHealthSymptomColumns = async () => {
  const [columns] = await pool.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'symptoms'
      AND COLUMN_NAME IN ('description', 'body_system_id')
    `
  );

  const existing = new Set(columns.map((column) => column.COLUMN_NAME));

  if (!existing.has("description")) {
    await pool.query(`
      ALTER TABLE symptoms
      ADD COLUMN description TEXT NULL
    `);
  }

  if (!existing.has("body_system_id")) {
    await pool.query(`
      ALTER TABLE symptoms
      ADD COLUMN body_system_id INT NULL
    `);
  }
};

app.get("/api/health/body-systems", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        CAST(id AS CHAR) AS id,
        slug,
        COALESCE(icon, '🩺') AS icon,
        name,
        name AS title,
        COALESCE(short_description, '') AS subtitle
      FROM body_systems
      WHERE is_active = 1
      ORDER BY sort_order ASC, name ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Load body systems error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/api/health/topics", async (req, res) => {
  try {
    const userId = Number(req.query.user_id || 0);

    const [rows] = await pool.query(
      `
      SELECT
        CAST(c.condition_id AS CHAR) AS id,
        c.slug,
        bs.slug AS body_system_slug,
        COALESCE(bs.icon, '🩺') AS icon,
        c.condition_name AS title,
        COALESCE(NULLIF(c.description, ''), bs.name, 'Health Topic') AS subtitle,
        c.is_common,
        COALESCE(c.sort_order, 9999) AS sort_order,
        rv.viewed_at AS recently_viewed_at,
        CASE
          WHEN rv.condition_id IS NOT NULL THEN 'Recently viewed'
          WHEN c.is_common = 1 THEN 'Popular'
          ELSE NULL
        END AS tag
      FROM conditions c
      LEFT JOIN body_systems bs
        ON bs.id = c.body_system_id
      LEFT JOIN (
        SELECT condition_id, MAX(viewed_at) AS viewed_at
        FROM recently_viewed_health_topics
        WHERE user_id = ?
        GROUP BY condition_id
      ) rv
        ON rv.condition_id = c.condition_id
      ORDER BY
        CASE
          WHEN rv.condition_id IS NOT NULL THEN 1
          WHEN c.is_common = 1 THEN 2
          ELSE 3
        END,
        c.sort_order ASC,
        c.condition_name ASC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load health topics error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/health/body-systems/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const [[row]] = await pool.query(
      `
      SELECT
        id,
        slug,
        name,
        icon,
        short_description,
        hero_title,
        hero_description,
        hero_image,
        overview_title,
        overview_content,
        diagram_image,
        clinic_cta_label
      FROM body_systems
      WHERE slug = ? AND is_active = 1
      `,
      [slug]
    );

    if (!row) {
      return res.status(404).json({ message: "Body system not found" });
    }

    res.json(row);
  } catch (err) {
    console.error("Load body system details error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/health/body-systems/:slug/conditions", async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        c.condition_id,
        c.slug,
        c.slug AS condition_slug,
        c.condition_name,
        c.description,
        c.thumbnail_image,
        c.hero_image,
        c.is_common,
        c.is_featured
      FROM conditions c
      INNER JOIN body_systems bs
        ON bs.id = c.body_system_id
      WHERE bs.slug = ?
      ORDER BY c.is_common DESC, c.sort_order ASC, c.condition_name ASC
      `,
      [slug]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load body system conditions error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/health/body-systems/:slug/articles", async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        a.title,
        a.slug
      FROM articles a
      INNER JOIN body_systems bs
        ON bs.id = a.body_system_id
      WHERE bs.slug = ?
        AND a.is_published = 1
      ORDER BY a.is_featured DESC, a.sort_order ASC, a.title ASC
      `,
      [slug]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load body system articles error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/health/body-systems/:slug/symptoms", async (req, res) => {
  try {
    await ensureHealthSymptomColumns();

    const { slug } = req.params;

    const [rows] = await pool.query(
      `
      SELECT DISTINCT
        s.symptom_id,
        s.symptom_name,
        s.description,
        s.category,
        s.is_red_flag
      FROM symptoms s
      LEFT JOIN body_systems direct_bs
        ON direct_bs.id = s.body_system_id
      LEFT JOIN condition_symptoms cs
        ON cs.symptom_id = s.symptom_id
      LEFT JOIN conditions c
        ON c.condition_id = cs.condition_id
      LEFT JOIN body_systems condition_bs
        ON condition_bs.id = c.body_system_id
      WHERE direct_bs.slug = ?
        OR condition_bs.slug = ?
      ORDER BY s.symptom_name ASC
      `,
      [slug, slug]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load body system symptoms error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get("/api/health/body-systems/:slug/prevention-tips", async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        pt.id,
        pt.tip_text
      FROM prevention_tips pt
      INNER JOIN body_systems bs
        ON bs.id = pt.body_system_id
      WHERE bs.slug = ?
        AND pt.is_active = 1
      ORDER BY pt.sort_order ASC, pt.id ASC
      `,
      [slug]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load prevention tips error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/health/body-systems/:slug/facts", async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        hf.id,
        hf.title,
        hf.fact_text
      FROM health_facts hf
      INNER JOIN body_systems bs
        ON bs.id = hf.body_system_id
      WHERE bs.slug = ?
        AND hf.is_active = 1
      ORDER BY hf.sort_order ASC, hf.id ASC
      `,
      [slug]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load health facts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
const getConditionIdentifierQuery = (slug) => {
  if (/^\d+$/.test(slug)) {
    return {
      where: "c.condition_id = ?",
      params: [Number(slug)],
    };
  }

  return {
    where: "c.slug = ?",
    params: [slug],
  };
};

const getConditionBySlugOrId = async (slug) => {
  const { where, params } = getConditionIdentifierQuery(slug);

  const [[condition]] = await pool.query(
    `
    SELECT
      c.condition_id,
      c.slug,
      c.condition_name,
      c.description,
      c.advice_level,
      c.when_to_seek_help,
      c.disclaimer,
      c.hero_image,
      c.thumbnail_image,
      c.body_system_id,
      bs.name AS body_system_name,
      bs.slug AS body_system_slug,
      bs.icon AS body_system_icon,
      bs.short_description AS body_system_description
    FROM conditions c
    LEFT JOIN body_systems bs
      ON bs.id = c.body_system_id
    WHERE ${where}
    LIMIT 1
    `,
    params
  );

  return condition || null;
};

const loadConditionSymptoms = async (conditionId) => {
  await ensureHealthSymptomColumns();

  return pool.query(
    `
    SELECT
      s.symptom_id,
      s.symptom_name,
      s.description,
      s.category,
      s.is_red_flag,
      s.body_system_id,
      bs.name AS body_system_name
    FROM condition_symptoms cs
    INNER JOIN symptoms s
      ON s.symptom_id = cs.symptom_id
    LEFT JOIN body_systems bs
      ON bs.id = s.body_system_id
    WHERE cs.condition_id = ?
    ORDER BY s.is_red_flag DESC, s.symptom_name ASC
    `,
    [conditionId]
  );
};

app.get("/api/health/condition/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = Number(req.query.user_id || 0);

    const condition = await getConditionBySlugOrId(slug);

    if (!condition) {
      return res.status(404).json({ message: "Condition not found" });
    }

    if (userId) {
      await pool
        .query(
          `
          INSERT INTO recently_viewed_health_topics (user_id, condition_id)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE viewed_at = CURRENT_TIMESTAMP
          `,
          [userId, condition.condition_id]
        )
        .catch((viewErr) => {
          console.error("Save recently viewed health topic error:", viewErr);
        });
    }

    const [symptoms] = await loadConditionSymptoms(condition.condition_id);

    res.json({
      ...condition,
      symptoms,
    });
  } catch (err) {
    console.error("Load condition details error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/health/condition/:slug/symptoms", async (req, res) => {
  try {
    const condition = await getConditionBySlugOrId(req.params.slug);

    if (!condition) {
      return res.status(404).json({ message: "Condition not found" });
    }

    const [rows] = await loadConditionSymptoms(condition.condition_id);
    res.json(rows);
  } catch (err) {
    console.error("Load condition symptoms error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/health/condition/:slug/articles", async (req, res) => {
  try {
    const condition = await getConditionBySlugOrId(req.params.slug);

    if (!condition) {
      return res.status(404).json({ message: "Condition not found" });
    }

    if (!condition.body_system_id) {
      return res.json([]);
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        title,
        slug
      FROM articles
      WHERE body_system_id = ?
        AND is_published = 1
      ORDER BY is_featured DESC, sort_order ASC, title ASC
      LIMIT 6
      `,
      [condition.body_system_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load condition articles error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/health/condition/:slug/prevention-tips", async (req, res) => {
  try {
    const condition = await getConditionBySlugOrId(req.params.slug);

    if (!condition) {
      return res.status(404).json({ message: "Condition not found" });
    }

    if (!condition.body_system_id) {
      return res.json([]);
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        tip_text
      FROM prevention_tips
      WHERE body_system_id = ?
        AND is_active = 1
      ORDER BY sort_order ASC, id ASC
      LIMIT 6
      `,
      [condition.body_system_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load condition prevention tips error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/health/condition/:slug/facts", async (req, res) => {
  try {
    const condition = await getConditionBySlugOrId(req.params.slug);

    if (!condition) {
      return res.status(404).json({ message: "Condition not found" });
    }

    if (!condition.body_system_id) {
      return res.json([]);
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        title,
        fact_text
      FROM health_facts
      WHERE body_system_id = ?
        AND is_active = 1
      ORDER BY sort_order ASC, id ASC
      LIMIT 4
      `,
      [condition.body_system_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load condition health facts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
/* ✅ ROUTE MODULES */
app.use("/api", authRoutes);
app.use("/api", locationRoutes);
app.use("/api/clinics", findClinicRoute);
app.use("/api/clinic-feedback", clinicFeedbackRouter);
app.use("/api", clinicRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/conditions", adminConditionsRoutes);
app.use("/api/admin/symptoms", adminSymptomsRoutes);
app.use("/api/admin/condition-symptoms", adminConditionSymptomsRoutes);
app.use("/api/symptom-checker", symptomCheckerRoute);
app.use("/api/voice-assistant", voiceAssistantRoute);
app.use("/api/users", usersRouter);
app.use("/api/articles", articlesRouter);

/* ✅ ERROR HANDLER LAST */
app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err);
  res.status(500).json({ message: err.message || "Internal Server Error" });
});

app.listen(5000, "0.0.0.0", () =>
  console.log("Backend running on http://0.0.0.0:5000")
);
