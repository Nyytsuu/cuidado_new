const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Cuidado_2026-cp1!",
  database: "cuidado_medihelp",
});
// LOGIN
// LOGIN (admin + clinic + user)
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const tryLogin = (table, role, nameCol) =>
    new Promise((resolve, reject) => {
      db.query(
        `SELECT id, ${nameCol} AS name, email, password_hash
         FROM ${table}
         WHERE email = ?
         LIMIT 1`,
        [email],
        async (err, rows) => {
          if (err) return reject(err);
          if (!rows.length) return resolve(null);

          const acc = rows[0];
          const ok = await bcrypt.compare(password, acc.password_hash);
          if (!ok) return resolve("bad_password");

          resolve({ id: acc.id, email: acc.email, name: acc.name, role });
        }
      );
    });

  (async () => {
    try {
      // 1) admins
      let found = await tryLogin("admins", "admin", "full_name");
      if (found === "bad_password") return res.status(401).json({ message: "Invalid email or password." });

      // 2) clinics (clinic_name column)
      if (!found) {
        found = await tryLogin("clinics", "clinic", "clinic_name");
        if (found === "bad_password") return res.status(401).json({ message: "Invalid email or password." });
      }

      // 3) users
      if (!found) {
        found = await tryLogin("users", "user", "full_name");
        if (found === "bad_password") return res.status(401).json({ message: "Invalid email or password." });
      }

      if (!found) return res.status(401).json({ message: "Invalid email or password." });

      const token = jwt.sign(
        { id: found.id, role: found.role, email: found.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        message: "Login successful ✅",
        token,
        user: {
          id: found.id,
          role: found.role,
          email: found.email,
          name: found.name,
        },
      });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      return res.status(500).json({ message: "Server error" });
    }
  })();
});

// Signup route (single source of truth)
router.post("/signup", async (req, res) => {
  try {
    console.log("SIGNUP BODY:", req.body);

    const {
      fullname,
      email,
      phone,
      gender,
      dob,
      province_id,
      municipality_id,
      barangay_id,
      address,
      password,
    } = req.body;

    // Basic required checks
    if (!fullname || !email || !phone || !gender || !dob || !address || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // PH phone validation
   

    // Location required
    if (!province_id || !municipality_id || !barangay_id) {
      return res.status(400).json({ message: "Please complete location selection." });
    }

    // Password hash
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users
      (full_name, email, phone, gender, date_of_birth, province_id, municipality_id, barangay_id, address, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        fullname,
        email,
        phone,
        gender,
        dob,
        province_id,
        municipality_id,
        barangay_id,
        address,
        hashedPassword,
      ],
      (err) => {
        if (err) {
          console.error("DB ERROR:", err);
          return res.status(500).json({ message: err.message });
        }
        return res.json({ message: "Signup successful ✅" });
      }
    );
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;