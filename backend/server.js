console.log("✅ RUNNING THIS FILE:", __filename);
console.log("✅ LOADED admin.routes.js");

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

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
const app = express();






app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("➡️", req.method, req.url);
  next();
});

app.use("/uploads", express.static("uploads"));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "root123",
  database: process.env.DB_NAME || "cuidado_medihelp",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
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

    const [trendRows] = await pool.query(`
      SELECT DATE(created_at) AS day, COUNT(*) AS total
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `);

    const filled = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = trendRows.find((r) => String(r.day).slice(0, 10) === key);

      filled.push({ day: key, total: found ? Number(found.total) : 0 });
    }

    res.json({
      totalUsers: Number(usersCount.totalUsers),
      totalClinics: Number(clinicsCount.totalClinics),
      pendingClinics: Number(pendingClinics.pendingClinics),
      scheduledAppointments: 0,
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
        start_at,
        end_at,
        purpose,
        symptoms,
        patient_note,
        clinic_note,
        status,
        cancelled_at,
        cancelled_by,
        cancel_reason,
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
        COALESCE(bs.icon, '🩺') AS icon,
        c.condition_name AS title,
        COALESCE(bs.name, 'Health Topic') AS subtitle,
        CASE
          WHEN rv.condition_id IS NOT NULL THEN 'Recently viewed'
          WHEN c.is_common = 1 THEN 'Popular'
          ELSE NULL
        END AS tag
      FROM conditions c
      LEFT JOIN body_systems bs
        ON bs.id = c.body_system_id
      LEFT JOIN (
        SELECT DISTINCT condition_id
        FROM recently_viewed_health_topics
        WHERE user_id = ?
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
    const { slug } = req.params;

    const [rows] = await pool.query(
      `
      SELECT DISTINCT
        s.symptom_id,
        s.symptom_name
      FROM body_systems bs
      INNER JOIN conditions c
        ON c.body_system_id = bs.id
      INNER JOIN condition_symptoms cs
        ON cs.condition_id = c.condition_id
      INNER JOIN symptoms s
        ON s.symptom_id = cs.symptom_id
      WHERE bs.slug = ?
      ORDER BY s.symptom_name ASC
      `,
      [slug]
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
app.get("/api/health/condition/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    let conditionQuery = "";
    let params = [];

    if (/^\d+$/.test(slug)) {
      conditionQuery = `
        SELECT
          condition_id,
          slug,
          condition_name,
          description
        FROM conditions
        WHERE condition_id = ?
      `;
      params = [Number(slug)];
    } else {
      conditionQuery = `
        SELECT
          condition_id,
          slug,
          condition_name,
          description
        FROM conditions
        WHERE slug = ?
      `;
      params = [slug];
    }

    const [[condition]] = await pool.query(conditionQuery, params);

    if (!condition) {
      return res.status(404).json({ message: "Condition not found" });
    }

    const [symptoms] = await pool.query(
      `
      SELECT
        s.symptom_id,
        s.symptom_name
      FROM condition_symptoms cs
      INNER JOIN symptoms s
        ON s.symptom_id = cs.symptom_id
      WHERE cs.condition_id = ?
      ORDER BY s.symptom_name ASC
      `,
      [condition.condition_id]
    );

    res.json({
      ...condition,
      symptoms,
    });
  } catch (err) {
    console.error("Load condition details error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
/* ✅ ROUTE MODULES */
app.use("/api", authRoutes);
app.use("/api", locationRoutes);
app.use("/api/clinics", findClinicRoute);
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

app.listen(5000, () => console.log("Backend running on http://localhost:5000"));
