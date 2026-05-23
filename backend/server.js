console.log("✅ RUNNING THIS FILE:", __filename);

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const pool = require("./db/pool");
const { verifyToken, requireRole } = require("./middleware/auth");

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

// CORS — restrict to known origins in production; allow all in development
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : null; // null = allow all (dev mode)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, same-origin)
      if (!origin) return callback(null, true);
      // Dev mode: ALLOWED_ORIGINS not set → allow everything
      if (!ALLOWED_ORIGINS) return callback(null, true);
      // Prod mode: only allow listed origins
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
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
app.get("/api/admin/dashboard-metrics", verifyToken, requireRole("admin"), async (req, res) => {
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
app.get("/api/admin/db-check", verifyToken, requireRole("admin"), async (req, res) => {
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
app.get("/api/admin/recent-activity", verifyToken, requireRole("admin"), async (req, res) => {
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
app.get("/api/clinic/patients", verifyToken, requireRole("clinic", "admin"), async (req, res) => {
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

/* ─────────────────────────────
   HEALTH ROUTES
   ───────────────────────────── */

const ensureHealthSymptomColumns = async () => {
  const [columns] = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'symptoms'
      AND column_name IN ('description', 'body_system_id')
    `
  );

  const existing = new Set(
    columns.map((column) => String(column.column_name || "").toLowerCase())
  );

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
        id::text AS id,
        slug,
        COALESCE(icon, '🩺') AS icon,
        name,
        name AS title,
        COALESCE(short_description, '') AS subtitle
      FROM body_systems
      WHERE COALESCE(is_active::text, 'true') IN ('true', '1', 't')
      ORDER BY COALESCE(sort_order, 9999) ASC, name ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Load body systems error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
  }
});

app.get("/api/health/topics", async (req, res) => {
  try {
    const userId = Number(req.query.user_id || 0);

    const [rows] = await pool.query(
      `
      SELECT
        c.condition_id::text AS id,
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
          WHEN COALESCE(c.is_common::text, 'false') IN ('true', '1', 't') THEN 'Popular'
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
          WHEN COALESCE(c.is_common::text, 'false') IN ('true', '1', 't') THEN 2
          ELSE 3
        END,
        COALESCE(c.sort_order, 9999) ASC,
        c.condition_name ASC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load health topics error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
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
      WHERE slug = ?
        AND COALESCE(is_active::text, 'true') IN ('true', '1', 't')
      LIMIT 1
      `,
      [slug]
    );

    if (!row) {
      return res.status(404).json({ message: "Body system not found" });
    }

    res.json(row);
  } catch (err) {
    console.error("Load body system details error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
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
      ORDER BY
        COALESCE(c.is_common::text, 'false') IN ('true', '1', 't') DESC,
        COALESCE(c.sort_order, 9999) ASC,
        c.condition_name ASC
      `,
      [slug]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load body system conditions error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
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
        AND COALESCE(a.is_published::text, 'true') IN ('true', '1', 't')
      ORDER BY
        COALESCE(a.is_featured::text, 'false') IN ('true', '1', 't') DESC,
        COALESCE(a.sort_order, 9999) ASC,
        a.title ASC
      `,
      [slug]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load body system articles error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
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
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
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
        AND COALESCE(pt.is_active::text, 'true') IN ('true', '1', 't')
      ORDER BY COALESCE(pt.sort_order, 9999) ASC, pt.id ASC
      `,
      [slug]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load prevention tips error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
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
        AND COALESCE(hf.is_active::text, 'true') IN ('true', '1', 't')
      ORDER BY COALESCE(hf.sort_order, 9999) ASC, hf.id ASC
      `,
      [slug]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load health facts error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
  }
});

const getConditionIdentifierQuery = (slug) => {
  if (/^\d+$/.test(String(slug))) {
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
    ORDER BY
      COALESCE(s.is_red_flag::text, 'false') IN ('true', '1', 't') DESC,
      s.symptom_name ASC
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
          ON CONFLICT (user_id, condition_id)
          DO UPDATE SET viewed_at = CURRENT_TIMESTAMP
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
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
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
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
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
        AND COALESCE(is_published::text, 'true') IN ('true', '1', 't')
      ORDER BY
        COALESCE(is_featured::text, 'false') IN ('true', '1', 't') DESC,
        COALESCE(sort_order, 9999) ASC,
        title ASC
      LIMIT 6
      `,
      [condition.body_system_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load condition articles error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
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
        AND COALESCE(is_active::text, 'true') IN ('true', '1', 't')
      ORDER BY COALESCE(sort_order, 9999) ASC, id ASC
      LIMIT 6
      `,
      [condition.body_system_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load condition prevention tips error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
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
        AND COALESCE(is_active::text, 'true') IN ('true', '1', 't')
      ORDER BY COALESCE(sort_order, 9999) ASC, id ASC
      LIMIT 4
      `,
      [condition.body_system_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("Load condition health facts error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      code: err.code || null,
    });
  }
});

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