const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const multer = require("multer");

/* ================= DB CONNECTION ================= */
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root123",
  database: "cuidado_medihelp",
  port: 3306,
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
   CLINIC SIGNUP
   Mounted at: /api/clinic
   Final route: POST /api/clinic/signup
================================================= */
router.post(
  "/signup",
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
   CLINICS
   Mounted at: /api/clinic
================================================= */

// GET all clinics
router.get("/clinics", (req, res) => {
  const sql = `
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
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("FETCH CLINICS ERROR:", err);
      return res.status(500).json({ message: "Failed to fetch clinics." });
    }

    res.json(rows);
  });
});

// GET one clinic
router.get("/clinics/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      id,
      clinic_name,
      email,
      phone,
      address,
      created_at,
      status
    FROM clinics
    WHERE id = ?
  `;

  db.query(sql, [id], (err, rows) => {
    if (err) {
      console.error("VIEW CLINIC ERROR:", err);
      return res.status(500).json({ message: "Failed to view clinic." });
    }

    if (!rows.length) {
      return res.status(404).json({ message: "Clinic not found." });
    }

    res.json(rows[0]);
  });
});

// APPROVE clinic
router.patch("/clinics/:id/approve", (req, res) => {
  const { id } = req.params;

  db.query(
    "UPDATE clinics SET status = 'approved' WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        console.error("APPROVE CLINIC ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Clinic not found." });
      }

      res.json({ message: "Clinic approved." });
    }
  );
});

// REJECT clinic
router.patch("/clinics/:id/reject", (req, res) => {
  const { id } = req.params;

  db.query(
    "UPDATE clinics SET status = 'rejected' WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        console.error("REJECT CLINIC ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Clinic not found." });
      }

      res.json({ message: "Clinic rejected." });
    }
  );
});

// UPDATE clinic status
router.patch("/clinics/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (
    !["approved", "rejected", "pending", "deactivated", "active", "disabled"].includes(
      status
    )
  ) {
    return res.status(400).json({ message: "Invalid status." });
  }

  db.query(
    "UPDATE clinics SET status = ? WHERE id = ?",
    [status, id],
    (err, result) => {
      if (err) {
        console.error("UPDATE CLINIC STATUS ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Clinic not found." });
      }

      res.json({ message: "Clinic status updated." });
    }
  );
});

// EDIT clinic
router.patch("/clinics/:id", (req, res) => {
  const { id } = req.params;
  const { clinic_name, email, phone, address } = req.body;

  const sql = `
    UPDATE clinics
    SET
      clinic_name = COALESCE(?, clinic_name),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone),
      address = COALESCE(?, address)
    WHERE id = ?
  `;

  db.query(
    sql,
    [clinic_name ?? null, email ?? null, phone ?? null, address ?? null, id],
    (err, result) => {
      if (err) {
        console.error("EDIT CLINIC ERROR:", err);
        return res.status(500).json({ message: "Failed to edit clinic." });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Clinic not found." });
      }

      res.json({ message: "Clinic updated." });
    }
  );
});

/* =================================================
   CLINIC SERVICES
   Final routes:
   GET    /api/clinic/services
   POST   /api/clinic/services
   PATCH  /api/clinic/services/:id
   DELETE /api/clinic/services/:id
   PATCH  /api/clinic/services/:id/status
================================================= */

// GET clinic services
router.get("/services", (req, res) => {
  const { clinic_id } = req.query;

  if (!clinic_id) {
    return res.status(400).json({ message: "clinic_id is required." });
  }

  const sql = `
    SELECT
      id,
      clinic_id,
      name,
      description,
      price,
      duration,
      duration_minutes,
      is_active
    FROM clinic_services
    WHERE clinic_id = ?
    ORDER BY id DESC
  `;

  db.query(sql, [Number(clinic_id)], (err, rows) => {
    if (err) {
      console.error("FETCH CLINIC SERVICES ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    res.json(rows);
  });
});

// ADD clinic service
router.post("/services", (req, res) => {
  const {
    clinic_id,
    name,
    description,
    price,
    duration,
    duration_minutes,
    is_active,
  } = req.body;

  if (!clinic_id || !name) {
    return res.status(400).json({ message: "clinic_id and name are required." });
  }

  const finalDuration = duration ?? duration_minutes ?? null;

  const sql = `
    INSERT INTO clinic_services (
      clinic_id,
      name,
      description,
      price,
      duration_minutes,
      is_active
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      Number(clinic_id),
      name,
      description ?? null,
      price ?? null,
      finalDuration,
      is_active ?? 1,
    ],
    (err, result) => {
      if (err) {
        console.error("ADD CLINIC SERVICE ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      res.json({
        message: "Service added successfully.",
        id: result.insertId,
      });
    }
  );
});

// UPDATE clinic service
router.patch("/services/:id", (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    duration,
    duration_minutes,
    is_active,
  } = req.body;

  const finalDuration = duration ?? duration_minutes ?? null;

  const sql = `
    UPDATE clinic_services
    SET
      name = ?,
      description = ?,
      price = ?,
      duration_minutes = ?,
      is_active = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      name,
      description ?? null,
      price ?? null,
      finalDuration,
      is_active ?? 1,
      Number(id),
    ],
    (err, result) => {
      if (err) {
        console.error("UPDATE CLINIC SERVICE ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Service not found." });
      }

      res.json({ message: "Service updated successfully." });
    }
  );
});

// DELETE clinic service
router.delete("/services/:id", (req, res) => {
  const { id } = req.params;

  db.query(
    "DELETE FROM clinic_services WHERE id = ?",
    [Number(id)],
    (err, result) => {
      if (err) {
        console.error("DELETE CLINIC SERVICE ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Service not found." });
      }

      res.json({ message: "Service deleted successfully." });
    }
  );
});

// UPDATE clinic service status only
router.patch("/services/:id/status", (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (is_active === undefined || is_active === null) {
    return res.status(400).json({ message: "is_active is required." });
  }

  const sql = `
    UPDATE clinic_services
    SET is_active = ?
    WHERE id = ?
  `;

  db.query(sql, [Number(is_active), Number(id)], (err, result) => {
    if (err) {
      console.error("UPDATE SERVICE STATUS ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Service not found." });
    }

    db.query(
      "SELECT id, is_active FROM clinic_services WHERE id = ?",
      [Number(id)],
      (selectErr, rows) => {
        if (selectErr) {
          console.error("VERIFY SERVICE STATUS ERROR:", selectErr);
          return res.status(500).json({ message: selectErr.message });
        }

        res.json({
          message: "Service status updated successfully.",
          service: rows[0],
        });
      }
    );
  });
});

/* =================================================
   CLINIC APPOINTMENTS
   Final routes:
   GET   /api/clinic/appointments
   PATCH /api/clinic/appointments/:id/status
   PATCH /api/clinic/appointments/:id/reschedule
================================================= */

// GET clinic appointments
router.get("/appointments", (req, res) => {
  const { clinic_id } = req.query;

  if (!clinic_id) {
    return res.status(400).json({ message: "clinic_id is required." });
  }

  const sql = `
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
  `;

  db.query(sql, [Number(clinic_id)], (err, rows) => {
    if (err) {
      console.error("FETCH APPOINTMENTS ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    res.json(rows);
  });
});

// UPDATE appointment status
router.patch("/appointments/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, cancelled_by } = req.body;

  if (!["confirmed", "cancelled", "completed"].includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }

  let sql = "";
  let params = [];

  if (status === "cancelled") {
    sql = `
      UPDATE appointments
      SET
        status = ?,
        cancelled_at = NOW(),
        cancelled_by = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    params = [status, cancelled_by || "clinic", Number(id)];
  } else if (status === "completed") {
    sql = `
      UPDATE appointments
      SET
        status = ?,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `;
    params = [status, Number(id)];
  } else {
    sql = `
      UPDATE appointments
      SET
        status = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    params = [status, Number(id)];
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("UPDATE APPOINTMENT STATUS ERROR:", err);
      return res.status(500).json({ message: err.message });
    }

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    res.json({ message: "Appointment status updated successfully." });
  });
});

// RESCHEDULE appointment
router.patch("/appointments/:id/reschedule", (req, res) => {
  const { id } = req.params;
  const { start_at } = req.body;

  if (!start_at) {
    return res.status(400).json({ message: "start_at is required." });
  }

  const startDate = new Date(start_at);
  if (Number.isNaN(startDate.getTime())) {
    return res.status(400).json({ message: "Invalid start_at value." });
  }

  const endDate = new Date(startDate.getTime() + 30 * 60000);

  const pad = (n) => String(n).padStart(2, "0");
  const toMysqlDatetime = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  const sql = `
    UPDATE appointments
    SET
      start_at = ?,
      end_at = ?,
      status = 'pending',
      updated_at = NOW()
    WHERE id = ?
  `;

  db.query(
    sql,
    [toMysqlDatetime(startDate), toMysqlDatetime(endDate), Number(id)],
    (err, result) => {
      if (err) {
        console.error("RESCHEDULE APPOINTMENT ERROR:", err);
        return res.status(500).json({ message: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Appointment not found." });
      }

      res.json({ message: "Appointment rescheduled successfully." });
    }
  );
});





module.exports = router;