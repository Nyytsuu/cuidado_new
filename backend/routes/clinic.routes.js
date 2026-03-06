const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const multer = require("multer");

/* ================= DB CONNECTION ================= */
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "root123",
  database: "cuidado_medihelp",
  port: 3307,
});

/* ================= MULTER SETUP ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const safeName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

/* =================================================
   CLINIC SIGNUP (EXISTING — UNCHANGED)
   POST /api/clinic/signup
================================================= */
router.post(
  "/clinic/signup",
  upload.fields([
    { name: "clinic_license_file", maxCount: 1 },
    { name: "rep_valid_id_file", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        clinic_name,
        email,
        phone,
        province_id,
        municipality_id,
        barangay_id,
        address,
        specialization,
        license_number,
        years_operation,
        rep_full_name,
        rep_position,
        rep_phone,
        services_offered,
        opening_time,
        closing_time,
        operating_days,
        password,
      } = req.body;

      if (
        !clinic_name ||
        !email ||
        !phone ||
        !province_id ||
        !municipality_id ||
        !barangay_id ||
        !address ||
        !specialization ||
        !license_number ||
        !rep_full_name ||
        !rep_position ||
        !rep_phone ||
        !services_offered ||
        !opening_time ||
        !closing_time ||
        !operating_days ||
        !password
      ) {
        return res.status(400).json({ message: "Missing required fields." });
      }

      const clinicLicense = req.files?.clinic_license_file?.[0];
      const repValidId = req.files?.rep_valid_id_file?.[0];

      if (!clinicLicense || !repValidId) {
        return res.status(400).json({ message: "Required files missing." });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const sql = `
        INSERT INTO clinics (
          clinic_name, email, phone,
          province_id, municipality_id, barangay_id,
          address, specialization, license_number, years_operation,
          rep_full_name, rep_position, rep_phone, services_offered,
          opening_time, closing_time, operating_days,
          clinic_license_file, rep_valid_id_file,
          password_hash, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `;

      db.query(
        sql,
        [
          clinic_name,
          email,
          phone,
          Number(province_id),
          Number(municipality_id),
          Number(barangay_id),
          address,
          specialization,
          license_number,
          years_operation ? Number(years_operation) : null,
          rep_full_name,
          rep_position,
          rep_phone,
          services_offered,
          opening_time,
          closing_time,
          operating_days,
          clinicLicense.filename,
          repValidId.filename,
          password_hash,
        ],
        (err) => {
          if (err) {
            console.error("CLINIC SIGNUP ERROR:", err);
            return res.status(500).json({ message: err.message });
          }
          res.json({ message: "Clinic signup submitted (Pending approval)" });
        }
      );
    } catch (err) {
      console.error("CLINIC SIGNUP SERVER ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* =================================================
   ADMIN: GET CLINICS
   GET /api/admin/clinics
================================================= */
router.get("/clinics", (req, res) => {
  db.query(
    `SELECT 
      id,
      clinic_name AS name,
      status
     FROM clinics
     ORDER BY id DESC`,
    (err, rows) => {
      if (err) {
        console.error("FETCH CLINICS ERROR:", err);
        return res.status(500).json({ message: "Failed to fetch clinics" });
      }
      res.json(rows);
    }
  );
});

/* =================================================
   ADMIN ACTIONS
================================================= */
router.patch("/clinics/:id/approve", (req, res) => {
  db.query(
    "UPDATE clinics SET status='approved' WHERE id=?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!result.affectedRows) return res.status(404).json({ message: "Clinic not found" });
      res.json({ message: "Clinic approved" });
    }
  );
});

router.patch("/clinics/:id/reject", (req, res) => {
  db.query(
    "UPDATE clinics SET status='rejected' WHERE id=?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!result.affectedRows) return res.status(404).json({ message: "Clinic not found" });
      res.json({ message: "Clinic rejected" });
    }
  );
});

router.patch("/clinics/:id/deactivate", (req, res) => {
  db.query(
    "UPDATE clinics SET status='deactivated' WHERE id=?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!result.affectedRows) return res.status(404).json({ message: "Clinic not found" });
      res.json({ message: "Clinic deactivated" });
    }
  );
});
router.get("/clinics", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id,
        clinic_name,
        email,
        phone,
        address,
        created_at,
        status
      FROM clinics
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error("Load clinics error:", e);
    res.status(500).json({ message: "Failed to load clinics." });
  }
});

// ✅ GET one clinic (view)
router.get("/clinics/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT id, clinic_name, email, phone, address, created_at, status FROM clinics WHERE id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "Clinic not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("View clinic error:", e);
    res.status(500).json({ message: "Failed to view clinic." });
  }
});

// ✅ APPROVE
router.patch("/clinics/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE clinics SET status='approved' WHERE id=?`, [id]);
    res.json({ message: "Clinic approved" });
  } catch (e) {
    console.error("Approve clinic error:", e);
    res.status(500).json({ message: "Failed to approve clinic." });
  }
});

// ✅ REJECT
router.patch("/clinics/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE clinics SET status='rejected' WHERE id=?`, [id]);
    res.json({ message: "Clinic rejected" });
  } catch (e) {
    console.error("Reject clinic error:", e);
    res.status(500).json({ message: "Failed to reject clinic." });
  }
});

// ✅ ACTIVATE / DISABLE (Deactivated)
router.patch("/clinics/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "active" | "disabled"
    if (!["active", "disabled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    await pool.query(`UPDATE clinics SET status=? WHERE id=?`, [status, id]);
    res.json({ message: "Clinic status updated" });
  } catch (e) {
    console.error("Update clinic status error:", e);
    res.status(500).json({ message: "Failed to update clinic status." });
  }
});

// ✅ EDIT clinic (optional)
router.patch("/clinics/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { clinic_name, email, phone, address } = req.body;

    await pool.query(
      `UPDATE clinics 
       SET clinic_name = COALESCE(?, clinic_name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address)
       WHERE id=?`,
      [clinic_name ?? null, email ?? null, phone ?? null, address ?? null, id]
    );

    res.json({ message: "Clinic updated" });
  } catch (e) {
    console.error("Edit clinic error:", e);
    res.status(500).json({ message: "Failed to edit clinic." });
  }
});

module.exports = router;