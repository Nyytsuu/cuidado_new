console.log("✅ RUNNING THIS FILE:", __filename);

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

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
const clinicDashboardRoutes = require("./routes/clinicDashboard");

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("➡️", req.method, req.url);
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* TEST ROUTES */
app.get("/", (req, res) => {
  res.send("Cuidado Medihelp API is running ✅");
});

app.get("/ping", (req, res) => {
  res.send("PONG");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend works!" });
});

/* ADMIN DASHBOARD METRICS */
app.get("/api/admin/dashboard-metrics", async (req, res) => {
  try {
    const [[usersCount]] = await pool.query(
      'SELECT COUNT(*) AS "totalUsers" FROM users'
    );

    const [[clinicsCount]] = await pool.query(
      'SELECT COUNT(*) AS "totalClinics" FROM clinics'
    );

    const [[pendingClinics]] = await pool.query(
      `
      SELECT COUNT(*) AS "pendingClinics"
      FROM clinics
      WHERE status = 'pending'
      `
    );

    const [[scheduledAppointments]] = await pool.query(`
      SELECT COUNT(*) AS "scheduledAppointments"
      FROM appointments
      WHERE status IN (
        'pending',
        'confirmed',
        'reschedule_requested',
        'scheduled',
        'approved'
      )
    `);

    const [trendRows] = await pool.query(`
      SELECT
        TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day,
        COUNT(*) AS total
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY created_at::date
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

      filled.push({
        day: key,
        total: found ? Number(found.total) : 0,
      });
    }

    res.json({
      totalUsers: Number(usersCount.totalUsers || 0),
      totalClinics: Number(clinicsCount.totalClinics || 0),
      pendingClinics: Number(pendingClinics.pendingClinics || 0),
      scheduledAppointments: Number(
        scheduledAppointments.scheduledAppointments || 0
      ),
      userTrend: filled,
    });
  } catch (err) {
    console.error("Dashboard metrics error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
  }
});

/* ADMIN DB CHECK */
app.get("/api/admin/db-check", async (req, res) => {
  try {
    const [[db]] = await pool.query("SELECT current_database() AS db");
    const [[u]] = await pool.query("SELECT COUNT(*) AS c FROM users");
    const [[c]] = await pool.query("SELECT COUNT(*) AS c FROM clinics");

    res.json({
      connected_db: db.db,
      users_rows: Number(u.c || 0),
      clinics_rows: Number(c.c || 0),
    });
  } catch (err) {
    console.error("DB CHECK ERROR:", err);
    res.status(500).json({
      error: err.message,
      code: err.code || null,
    });
  }
});

/* ADMIN RECENT ACTIVITY */
app.get("/api/admin/recent-activity", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 10), 30);

    const [rows] = await pool.query(
      `
      SELECT *
      FROM (
        SELECT
          CONCAT('user-', u.id) AS id,
          'user' AS type,
          CONCAT('New user registered: ', u.full_name) AS text,
          u.created_at AS time
        FROM users u

        UNION ALL

        SELECT
          CONCAT('clinic-', c.id) AS id,
          'clinic' AS type,
          CONCAT('Clinic registered: ', c.clinic_name) AS text,
          c.created_at AS time
        FROM clinics c
      ) recent_activity
      ORDER BY time DESC
      LIMIT ?
      `,
      [limit]
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
    console.error("Recent activity error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
  }
});

/* CLINIC PATIENTS */
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
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
  }
});

/*
  IMPORTANT:
  Do not add old inline /api/clinic/dashboard routes here.
  The fixed dashboard routes are mounted below.
*/

/* ROUTE MODULES */
app.use("/api", authRoutes);
app.use("/api", locationRoutes);

app.use("/api/clinics", findClinicRoute);
app.use("/api/clinic-feedback", clinicFeedbackRouter);

app.use("/api/clinic/dashboard", clinicDashboardRoutes);

/*
  These two are both needed:

  app.use("/api", clinicRoutes)
  gives:
    /api/appointments
    /api/services
    /api/clinic/schedule
    /api/clinic/profile

  app.use("/api/clinic", clinicRoutes)
  gives:
    /api/clinic/appointments
    /api/clinic/services

  This fixes your 404 errors.
*/
app.use("/api", clinicRoutes);
app.use("/api/clinic", clinicRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/admin/conditions", adminConditionsRoutes);
app.use("/api/admin/symptoms", adminSymptomsRoutes);
app.use("/api/admin/condition-symptoms", adminConditionSymptomsRoutes);

app.use("/api/appointments", appointmentRoutes);
app.use("/api/symptom-checker", symptomCheckerRoute);
app.use("/api/voice-assistant", voiceAssistantRoute);
app.use("/api/users", usersRouter);
app.use("/api/articles", articlesRouter);

/* 404 HANDLER */
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
});

/* ERROR HANDLER LAST */
app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err);
  res.status(500).json({
    message: err.message || "Internal Server Error",
    code: err.code || null,
  });
});

/* LISTEN ONLY ONCE */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});