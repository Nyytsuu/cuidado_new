console.log("✅ admin.routes.js loaded from:", __filename);
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

/* =========================
   USERS
========================= */
// GET /api/admin/users?limit=6
router.get("/users", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 6), 30);

    const [rows] = await pool.query(
      `
      SELECT id, full_name, email, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [limit]
    );

    res.json(rows);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
});
// ✅ GET all users: GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, full_name, email, phone, created_at, status
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ GET single user: GET /api/admin/users/:id
router.get("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, gender, date_of_birth, address, created_at, status
       FROM users WHERE id = ?`,
      [userId]
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
      SELECT id, clinic_name, email, phone, address, created_at, status
      FROM clinics
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Fetch clinics error:", err);
    res.status(500).json({ message: "Failed to fetch clinics" });
  }
});

// ✅ GET one clinic: GET /api/admin/clinics/:id
router.get("/clinics/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT id, clinic_name, email, phone, address, created_at, status
       FROM clinics
       WHERE id = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ message: "Clinic not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("View clinic error:", err);
    res.status(500).json({ message: "Failed to view clinic" });
  }
});

// ✅ APPROVE: PATCH /api/admin/clinics/:id/approve
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
    await pool.query("UPDATE clinics SET status='disabled' WHERE id=?", [id]);
    res.json({ message: "Clinic deactivated" });
  } catch (err) {
    console.error("Deactivate clinic error:", err);
    res.status(500).json({ message: "Failed to deactivate clinic" });
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
        c.created_at
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

module.exports = router;