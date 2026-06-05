console.log("✅ admin.routes.js loaded from:", __filename);
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const PDFDocument = require("pdfkit");
const { verifyToken, requireRole } = require("../middleware/auth");

// All admin routes require a valid admin JWT
router.use(verifyToken, requireRole("admin"));

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";

  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsvRow = (values) => values.map(csvEscape).join(",");

const formatCsvDateTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toISOString().slice(0, 19).replace("T", " ");
};

/* =========================
   USERS
========================= */
// ✅ GET all users: GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const limitParam = req.query.limit ? Number(req.query.limit) : null;

    const sql = `
      SELECT id, full_name, email, phone, created_at, status
      FROM users
      ORDER BY created_at DESC
      ${limitParam ? "LIMIT ?" : ""}
    `;

    const [rows] = limitParam
      ? await pool.query(sql, [Math.min(limitParam, 30)])
      : await pool.query(sql);

    res.json(rows);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
});

// ✅ GET single user: GET /api/admin/users/:id
router.get("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.gender,
        u.date_of_birth,
        u.address,
        u.created_at,
        u.status,
        COALESCE(ap.appointment_count, 0) AS appointment_count,
        ap.last_appointment_request_at,
        ap.last_appointment_at,
        ap.next_appointment_at,
        GREATEST(
          COALESCE(u.created_at, '1970-01-01'),
          COALESCE(ap.last_appointment_request_at, '1970-01-01')
        ) AS last_activity_at
      FROM users u
      LEFT JOIN (
        SELECT
          user_id,
          COUNT(*) AS appointment_count,
          MAX(created_at) AS last_appointment_request_at,
          MAX(CASE WHEN start_at < NOW() THEN start_at END) AS last_appointment_at,
          MIN(CASE WHEN start_at >= NOW() THEN start_at END) AS next_appointment_at
        FROM appointments
        WHERE user_id = ?
        GROUP BY user_id
      ) ap ON ap.user_id = u.id
      WHERE u.id = ?
      `,
      [userId, userId]
    );

    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Fetch user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ PATCH user status: PATCH /api/admin/users/:id/status
router.patch("/users/:id/status", async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    if (!["active", "disabled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const [result] = await pool.query(
      "UPDATE users SET status = ? WHERE id = ?",
      [status, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Status updated", id: userId, status });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   CLINICS
========================= */

// ✅ GET all clinics: GET /api/admin/clinics
router.get("/clinics", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, clinic_name, email, phone, address, created_at, status, account_status
      FROM clinics
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Fetch clinics error:", err);
    res.status(500).json({ message: "Failed to fetch clinics" });
  }
});
// ✅ APPROVE: PATCH /api/admin/clinics/:id/approve
// GET single clinic: GET /api/admin/clinics/:id
router.get("/clinics/:id", async (req, res) => {
  try {
    const clinicId = req.params.id;

    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.clinic_name,
        c.email,
        c.phone,
        c.address,
        c.specialization,
        c.license_number,
        c.clinic_license_file,
        c.years_operation,
        c.rep_full_name,
        c.rep_position,
        c.rep_phone,
        c.rep_valid_id_file,
        c.services_offered,
        TIME_FORMAT(c.opening_time, '%H:%i') AS opening_time,
        TIME_FORMAT(c.closing_time, '%H:%i') AS closing_time,
        c.operating_days,
        c.created_at,
        c.status,
        c.account_status,
        COALESCE(ap.appointment_count, 0) AS appointment_count,
        COALESCE(ap.pending_appointments, 0) AS pending_appointments,
        COALESCE(ap.completed_appointments, 0) AS completed_appointments,
        COALESCE(ap.cancelled_appointments, 0) AS cancelled_appointments,
        ap.last_appointment_request_at,
        ap.last_appointment_at,
        ap.next_appointment_at,
        GREATEST(
          COALESCE(c.created_at, '1970-01-01'::timestamp),
          COALESCE(ap.last_appointment_request_at, '1970-01-01'::timestamp)
        ) AS last_activity_at
      FROM clinics c
      LEFT JOIN (
        SELECT
          clinic_id,
          COUNT(*) AS appointment_count,
          SUM(status = 'pending') AS pending_appointments,
          SUM(status = 'completed') AS completed_appointments,
          SUM(status IN ('cancelled', 'canceled', 'declined')) AS cancelled_appointments,
          MAX(created_at) AS last_appointment_request_at,
          MAX(CASE WHEN start_at < NOW() THEN start_at END) AS last_appointment_at,
          MIN(CASE WHEN start_at >= NOW() THEN start_at END) AS next_appointment_at
        FROM appointments
        WHERE clinic_id = ?
        GROUP BY clinic_id
      ) ap ON ap.clinic_id = c.id
      WHERE c.id = ?
      LIMIT 1
      `,
      [clinicId, clinicId]
    );

    if (!rows.length) return res.status(404).json({ message: "Clinic not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Fetch clinic error:", err);
    res.status(500).json({ message: "Failed to fetch clinic" });
  }
});

router.patch("/clinics/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE clinics SET status='approved' WHERE id=?", [id]);
    res.json({ message: "Clinic approved" });
  } catch (err) {
    console.error("Approve clinic error:", err);
    res.status(500).json({ message: "Failed to approve clinic" });
  }
});

// ✅ REJECT: PATCH /api/admin/clinics/:id/reject
router.patch("/clinics/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE clinics SET status='rejected' WHERE id=?", [id]);
    res.json({ message: "Clinic rejected" });
  } catch (err) {
    console.error("Reject clinic error:", err);
    res.status(500).json({ message: "Failed to reject clinic" });
  }
});

// ✅ DEACTIVATE: PATCH /api/admin/clinics/:id/deactivate
router.patch("/clinics/:id/deactivate", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE clinics SET account_status='disabled' WHERE id=?", [id]);
    res.json({ message: "Clinic deactivated" });
  } catch (err) {
    console.error("Deactivate clinic error:", err);
    res.status(500).json({ message: "Failed to deactivate clinic" });
  }
});
router.patch("/clinics/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "active" | "disabled"

    if (!["active", "disabled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const [result] = await pool.query(
      "UPDATE clinics SET account_status = ? WHERE id = ?",
      [status, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    res.json({ message: "Account status updated", id: Number(id), account_status: status });
  } catch (err) {
    console.error("Update clinic account_status error:", err);
    res.status(500).json({ message: "Failed to update clinic status" });
  }
});
// GET /api/admin/clinics
router.get("/clinics", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.id,
        c.clinic_name,
        c.email,
        c.phone,
        c.province_id,
        c.municipality_id,
        c.barangay_id,
        c.address,
        c.status,
        c.created_at,
        c.account_status
      FROM clinics c
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Fetch clinics error:", err);
    res.status(500).json({ message: "Failed to fetch clinics", error: err.message });
  }
});   

/* =========================
   APPOINTMENTS (detailed)
========================= */

// ✅ GET /api/admin/appointments
router.get("/appointments", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.id,
        a.user_id,
        a.clinic_id,
        a.start_at,
        a.end_at,
        a.purpose,
        a.status,
        a.patient_name_snapshot,
        a.patient_phone_snapshot,
        a.clinic_name_snapshot,
        a.created_at
      FROM appointments a
      ORDER BY a.start_at DESC
    `);

    res.json(
      rows.map((r) => ({
        id: Number(r.id),
        patient_name: r.patient_name_snapshot ?? `User #${r.user_id}`,
        clinic_name: r.clinic_name_snapshot ?? `Clinic #${r.clinic_id}`,
        start_at: r.start_at,
        end_at: r.end_at,
        purpose: r.purpose ?? "—",
        status: r.status, // 'pending'|'confirmed'|'cancelled'|'completed'|'no_show'
        created_at: r.created_at,
      }))
    );
  } catch (err) {
    console.error("Fetch appointments error:", err);
    res.status(500).json({ message: "Failed to fetch appointments", error: err.message, code: err.code });
  }
});

// ✅ GET /api/admin/appointments/:id (details)
router.get("/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        a.*
      FROM appointments a
      WHERE a.id = ?
      `,
      [id]
    );

    if (!rows.length) return res.status(404).json({ message: "Appointment not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Fetch appointment details error:", err);
    res.status(500).json({ message: "Failed to fetch appointment details", error: err.message, code: err.code });
  }
});

// ✅ PATCH /api/admin/appointments/:id/status
router.patch("/appointments/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancel_reason } = req.body;

    const allowed = ["pending", "confirmed", "cancelled", "completed", "no_show"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Set metadata depending on status
    const cancelled_at = status === "cancelled" ? new Date() : null;
    const cancelled_by = status === "cancelled" ? "admin" : null;
    const completed_at = status === "completed" ? new Date() : null;

    const [result] = await pool.query(
      `
      UPDATE appointments
      SET
        status = ?,
        cancelled_at = ?,
        cancelled_by = ?,
        cancel_reason = ?,
        completed_at = ?
      WHERE id = ?
      `,
      [
        status,
        cancelled_at,
        cancelled_by,
        status === "cancelled" ? (cancel_reason ?? null) : null,
        completed_at,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({ message: "Appointment status updated", id, status });
  } catch (err) {
    console.error("Update appointment status error:", err);
    res.status(500).json({ message: "Failed to update status", error: err.message, code: err.code });
  }
});

// =========================
// SERVICES (ADMIN)
// =========================

// GET /api/admin/services
router.get("/services", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, is_active
      FROM services
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Fetch services error:", err);
    res.status(500).json({ message: "Failed to fetch services" });
  }
});

// POST /api/admin/services
router.post("/services", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "Service name required" });

    const [result] = await pool.query(
      `INSERT INTO services (name, is_active) VALUES (?, 1)`,
      [name]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      is_active: 1,
    });
  } catch (err) {
    console.error("Create service error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "That service already exists. Edit the existing service or reactivate it if it is inactive.",
      });
    }
    res.status(500).json({ message: "Failed to create service" });
  }
});

// PATCH /api/admin/services/:id
router.patch("/services/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "Service name required" });

    const [result] = await pool.query(
      `UPDATE services SET name=? WHERE id=?`,
      [name, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({ id: Number(id), name });
  } catch (err) {
    console.error("Update service error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Another service already uses that name. Please choose a different service name.",
      });
    }
    res.status(500).json({ message: "Failed to update service" });
  }
});

  // ✅ SERVICES TOGGLE
  router.patch("/services/:id/toggle", async (req, res) => {
    try {
      const { id } = req.params;

      const [rows] = await pool.query(
        "SELECT is_active FROM services WHERE id = ?",
        [id]
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Service not found" });
      }

      const newState = Number(rows[0].is_active) === 1 ? 0 : 1;

      await pool.query(
        "UPDATE services SET is_active = ? WHERE id = ?",
        [newState, id]
      );

      res.json({ message: "Service status updated", id: Number(id), is_active: newState });
    } catch (err) {
      console.error("Toggle service error:", err);
      res.status(500).json({ message: "Failed to update service status", error: err.message });
    }
  });
router.get("/services-test", (req, res) => {
  res.json({ ok: true });
});

// ✅ SUMMARY for preview cards
// GET /api/admin/reports/summary
router.get("/reports/summary", async (req, res) => {
  try {
    const [[appt]] = await pool.query(`
      SELECT
        COUNT(*) AS total_all,
        SUM(CASE WHEN start_at::date = CURRENT_DATE THEN 1 ELSE 0 END) AS total_today,
        SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'no_show'   THEN 1 ELSE 0 END) AS no_show,
        SUM(CASE WHEN start_at >= DATE_TRUNC('month', CURRENT_DATE)
                  AND start_at <  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
                 THEN 1 ELSE 0 END) AS this_month
      FROM appointments
    `);

    const [[topClinic]] = await pool.query(`
      SELECT c.clinic_name, COUNT(a.id) AS total
      FROM appointments a
      JOIN clinics c ON c.id = a.clinic_id
      WHERE a.start_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY a.clinic_id, c.clinic_name
      ORDER BY total DESC
      LIMIT 1
    `);

    const [[newUsers]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);

    res.json({
      totalAppointmentsThisMonth: appt.this_month || 0,
      mostActiveClinic: topClinic?.clinic_name || "—",
      newUsersThisWeek: newUsers.total || 0,
      statusBreakdown: {
        pending: appt.pending || 0,
        confirmed: appt.confirmed || 0,
        cancelled: appt.cancelled || 0,
        completed: appt.completed || 0,
        no_show: appt.no_show || 0,
      },
      totals: {
        all: appt.total_all || 0,
        today: appt.total_today || 0,
      },
    });
  } catch (err) {
    console.error("Reports summary error:", err);
    res.status(500).json({ message: "Failed to load report summary" });
  }
});

// ✅ PDF EXPORT
// GET /api/admin/reports/export/pdf

router.get("/reports/export/pdf", async (req, res) => {
  try {
    const [[appt]] = await pool.query(`
      SELECT
        COUNT(*) AS total_all,
        SUM(CASE WHEN start_at::date = CURRENT_DATE THEN 1 ELSE 0 END) AS total_today,
        SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'no_show'   THEN 1 ELSE 0 END) AS no_show
      FROM appointments
    `);

    const [monthly] = await pool.query(`
      SELECT TO_CHAR(start_at, 'YYYY-MM') AS month, COUNT(*) AS total
      FROM appointments
      GROUP BY TO_CHAR(start_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 6
    `);

    const [topClinics] = await pool.query(`
      SELECT c.clinic_name, COUNT(a.id) AS totalBookings
      FROM clinics c
      LEFT JOIN appointments a ON a.clinic_id = c.id
      GROUP BY c.id, c.clinic_name
      ORDER BY totalBookings DESC
      LIMIT 5
    `);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="reports.pdf"');

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(18).text("CUIDADO Admin Reports", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(1.5);

    doc.fontSize(14).text("Appointment Summary", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Total appointments: ${appt.total_all || 0}`);
    doc.text(`Appointments today: ${appt.total_today || 0}`);
    doc.text(`Pending: ${appt.pending || 0}`);
    doc.text(`Confirmed: ${appt.confirmed || 0}`);
    doc.text(`Cancelled: ${appt.cancelled || 0}`);
    doc.text(`Completed: ${appt.completed || 0}`);
    doc.text(`No-show: ${appt.no_show || 0}`);
    doc.moveDown(1.2);

    doc.fontSize(14).text("Appointments per Month (Last 6)", { underline: true });
    doc.moveDown(0.5);
    monthly.forEach((r) => doc.fontSize(12).text(`${r.month}: ${r.total}`));
    doc.moveDown(1.2);

    doc.fontSize(14).text("Top Clinics (All-time bookings)", { underline: true });
    doc.moveDown(0.5);
    topClinics.forEach((r, i) => doc.fontSize(12).text(`${i + 1}. ${r.clinic_name} — ${r.totalBookings}`));

    doc.end();
  } catch (err) {
    console.error("PDF export error:", err);
    res.status(500).json({ message: "Failed to export PDF" });
  }
});

// CSV EXPORT
// GET /api/admin/reports/export/csv
router.get("/reports/export/csv", async (req, res) => {
  try {
    const [[appt]] = await pool.query(`
      SELECT
        COUNT(*) AS total_all,
        SUM(CASE WHEN start_at::date = CURRENT_DATE THEN 1 ELSE 0 END) AS total_today,
        SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'no_show'   THEN 1 ELSE 0 END) AS no_show,
        SUM(CASE WHEN start_at >= DATE_TRUNC('month', CURRENT_DATE)
                  AND start_at <  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
                 THEN 1 ELSE 0 END) AS this_month
      FROM appointments
    `);

    const [monthly] = await pool.query(`
      SELECT TO_CHAR(start_at, 'YYYY-MM') AS month, COUNT(*) AS total
      FROM appointments
      GROUP BY TO_CHAR(start_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 6
    `);

    const [topClinics] = await pool.query(`
      SELECT c.clinic_name, COUNT(a.id) AS totalBookings
      FROM clinics c
      LEFT JOIN appointments a ON a.clinic_id = c.id
      GROUP BY c.id, c.clinic_name
      ORDER BY totalBookings DESC
      LIMIT 10
    `);

    const [appointments] = await pool.query(`
      SELECT
        a.id,
        COALESCE(a.patient_name_snapshot, u.full_name, 'Unknown Patient') AS patient_name,
        COALESCE(a.clinic_name_snapshot, c.clinic_name, 'Unknown Clinic') AS clinic_name,
        a.start_at,
        a.end_at,
        a.purpose,
        a.status,
        a.created_at
      FROM appointments a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN clinics c ON c.id = a.clinic_id
      ORDER BY a.start_at DESC
    `);

    const lines = [
      toCsvRow(["CUIDADO Admin Reports"]),
      toCsvRow(["Generated", formatCsvDateTime(new Date())]),
      "",
      toCsvRow(["Appointment Summary"]),
      toCsvRow(["Metric", "Value"]),
      toCsvRow(["Total appointments", appt.total_all || 0]),
      toCsvRow(["Appointments today", appt.total_today || 0]),
      toCsvRow(["Appointments this month", appt.this_month || 0]),
      toCsvRow(["Pending", appt.pending || 0]),
      toCsvRow(["Confirmed", appt.confirmed || 0]),
      toCsvRow(["Cancelled", appt.cancelled || 0]),
      toCsvRow(["Completed", appt.completed || 0]),
      toCsvRow(["No-show", appt.no_show || 0]),
      "",
      toCsvRow(["Appointments per Month"]),
      toCsvRow(["Month", "Total"]),
      ...monthly.map((row) => toCsvRow([row.month, row.total])),
      "",
      toCsvRow(["Top Clinics"]),
      toCsvRow(["Clinic", "Total Bookings"]),
      ...topClinics.map((row) => toCsvRow([row.clinic_name, row.totalBookings])),
      "",
      toCsvRow(["Appointment Details"]),
      toCsvRow([
        "ID",
        "Patient",
        "Clinic",
        "Start",
        "End",
        "Purpose",
        "Status",
        "Created",
      ]),
      ...appointments.map((row) =>
        toCsvRow([
          row.id,
          row.patient_name,
          row.clinic_name,
          formatCsvDateTime(row.start_at),
          formatCsvDateTime(row.end_at),
          row.purpose,
          row.status,
          formatCsvDateTime(row.created_at),
        ])
      ),
    ];

    const filename = `reports-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(`\uFEFF${lines.join("\r\n")}`);
  } catch (err) {
    console.error("CSV export error:", err);
    res.status(500).json({ message: "Failed to export CSV" });
  }
});
// (duplicate route removed — handled above)
router.get("/reports/ping", (req, res) => res.send("REPORTS PONG"));

/* =========================
   SUPPORT TICKETS
========================= */
const SUPPORT_STATUSES = new Set(["open", "answered", "closed"]);

// Make sure the reply columns exist (idempotent — table itself is created on the user side)
const ensureSupportReplyColumns = async () => {
  await pool.query(
    `ALTER TABLE user_support_requests ADD COLUMN IF NOT EXISTS admin_reply TEXT DEFAULT NULL`
  );
  await pool.query(
    `ALTER TABLE user_support_requests ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP DEFAULT NULL`
  );
};

const SUPPORT_SELECT = `
  SELECT
    t.id, t.user_id, t.topic, t.priority, t.subject, t.message,
    t.contact_email, t.contact_phone, t.status, t.admin_reply,
    t.replied_at, t.created_at, t.updated_at,
    u.full_name AS user_name, u.email AS user_email
  FROM user_support_requests t
  LEFT JOIN users u ON u.id = t.user_id
`;

// GET /api/admin/support-requests?status=open|answered|closed
router.get("/support-requests", async (req, res) => {
  try {
    await ensureSupportReplyColumns();

    const status = String(req.query.status || "").trim().toLowerCase();
    const params = [];
    let where = "";

    if (SUPPORT_STATUSES.has(status)) {
      where = "WHERE t.status = ?";
      params.push(status);
    }

    const [rows] = await pool.query(
      `${SUPPORT_SELECT}
       ${where}
       ORDER BY
         CASE WHEN t.status = 'open' THEN 0 ELSE 1 END,
         CASE WHEN t.priority = 'urgent' THEN 0 WHEN t.priority = 'normal' THEN 1 ELSE 2 END,
         t.created_at DESC, t.id DESC`,
      params
    );

    res.json({ tickets: rows });
  } catch (err) {
    console.error("GET /admin/support-requests error:", err);
    res.status(500).json({ message: "Failed to load support tickets." });
  }
});

// PATCH /api/admin/support-requests/:id/reply  { reply, status? }
router.patch("/support-requests/:id/reply", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Valid ticket id is required." });
    }

    const reply = String(req.body.reply ?? "").trim();
    if (reply.length > 2000) {
      return res.status(400).json({ message: "Reply must be 2,000 characters or fewer." });
    }

    const rawStatus = String(req.body.status || "").trim().toLowerCase();
    const status = SUPPORT_STATUSES.has(rawStatus)
      ? rawStatus
      : reply
        ? "answered"
        : "open";

    await ensureSupportReplyColumns();

    // Stamp replied_at only when there is reply text; otherwise keep the existing value.
    const repliedClause = reply ? "CURRENT_TIMESTAMP" : "replied_at";

    const [result] = await pool.query(
      `UPDATE user_support_requests
       SET admin_reply = ?, replied_at = ${repliedClause}, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
       RETURNING id`,
      [reply || null, status, id]
    );

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ message: "Support ticket not found." });
    }

    const [rows] = await pool.query(`${SUPPORT_SELECT} WHERE t.id = ?`, [id]);

    res.json({
      message: reply ? "Reply saved." : "Ticket updated.",
      ticket: rows[0] || null,
    });
  } catch (err) {
    console.error("PATCH /admin/support-requests/:id/reply error:", err);
    res.status(500).json({ message: "Failed to save reply." });
  }
});

module.exports = router;
