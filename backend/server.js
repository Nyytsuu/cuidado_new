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
    port: Number(process.env.DB_PORT || 3307),
    waitForConnections: true,
    connectionLimit: 10,
  });

  /* ✅ TEST ROUTES */
  app.get("/", (req, res) => res.send("Cuidado Medihelp API is running ✅"));
  app.get("/ping", (req, res) => res.send("PONG"));
  app.get("/api/test", (req, res) => res.json({ message: "Backend works!" }));

  /* ✅ DASHBOARD ROUTE (PLACE BEFORE app.use("/api", ...)) */
  app.get("/api/admin/dashboard-metrics", async (req, res) => {
    try {
      const [[usersCount]] = await pool.query("SELECT COUNT(*) AS totalUsers FROM users");
      const [[clinicsCount]] = await pool.query("SELECT COUNT(*) AS totalClinics FROM clinics");
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
      const limit = Math.min(Number(req.query.limit || 10), 30); // max 30

      // 1) New user registrations
      // 2) New clinic registrations
      // 3) Clinic status updates (if status_updated_at exists)
      //
      // Note: If you haven't added status_updated_at, query will fail.
      // We'll detect and fallback.

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

      // Try including status updates (optional)
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
        // Fallback if status_updated_at column doesn't exist yet
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
          time: x.time, // timestamp string
        }))
      );
    } catch (err) {
      console.error("Recent activity error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });
  /* ✅ ROUTES */
  app.use("/api", authRoutes);
  app.use("/api", locationRoutes);
  app.use("/api", clinicRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/admin/conditions", adminConditionsRoutes);
  app.use("/api/admin/symptoms", adminSymptomsRoutes);
  app.use("/api/admin/condition-symptoms", adminConditionSymptomsRoutes);

  /* ✅ ERROR HANDLER LAST */
  app.use((err, req, res, next) => {
    console.error("UNHANDLED ERROR:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  });

  app.listen(5000, () => console.log("Backend running on http://localhost:5000"));