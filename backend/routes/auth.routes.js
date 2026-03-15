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
  port: 3306,
});

const nodemailer = require("nodemailer");

const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

mailer.verify((err) => {
  if (err) console.error("MAILER ERROR:", err);
  else console.log("✅ Mailer ready");
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

    if (!fullname || !email || !phone || !gender || !dob || !address || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!province_id || !municipality_id || !barangay_id) {
      return res.status(400).json({ message: "Please complete location selection." });
    }

    db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email], async (checkErr, rows) => {
      if (checkErr) {
        console.error("EMAIL CHECK ERROR:", checkErr);
        return res.status(500).json({ message: "Server error" });
      }

      if (rows.length > 0) {
        return res.status(400).json({ message: "Email is already registered." });
      }

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
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

const crypto = require("crypto");

// ✅ SEND OTP (Forgot Password)
router.post("/auth/otp/send", async (req, res) => {
  try {
    const { identifier, purpose = "forgot_password" } = req.body;
    const email = String(identifier || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email], async (err, rows) => {
      if (err) {
        console.error("OTP SEND DB ERROR:", err);
        return res.status(500).json({ message: "Server error" });
      }

      const userExists = rows.length > 0;

      // forgot password: email must exist
      if (purpose === "forgot_password" && !userExists) {
        return res.json({ message: "OTP sent (if the account exists)" });
      }

      // signup verification: email must NOT already exist
      if (purpose === "signup_verification" && userExists) {
        return res.status(400).json({ message: "Email is already registered." });
      }

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      db.query(
        "DELETE FROM otp_requests WHERE email = ? AND purpose = ?",
        [email, purpose],
        (delErr) => {
          if (delErr) {
            console.error("OTP DELETE ERROR:", delErr);
            return res.status(500).json({ message: "Server error" });
          }

          db.query(
            "INSERT INTO otp_requests (email, otp_hash, purpose, expires_at) VALUES (?, ?, ?, ?)",
            [email, otpHash, purpose, expiresAt],
            async (insErr) => {
              if (insErr) {
                console.error("OTP INSERT ERROR:", insErr);
                return res.status(500).json({ message: "Server error" });
              }

              try {
                const subject =
                  purpose === "signup_verification"
                    ? "Your Cuidado Medihelp Signup Verification Code"
                    : "Your Cuidado Medihelp Password Reset Code";

                const html = `
                  <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                    <h2 style="color:#004d40;">OTP Verification</h2>
                    <p>
                      ${
                        purpose === "signup_verification"
                          ? "Use this 6-digit code to verify your email and complete signup:"
                          : "Use this 6-digit code to reset your password:"
                      }
                    </p>

                    <div style="
                      font-size: 28px;
                      font-weight: 700;
                      letter-spacing: 6px;
                      margin: 12px 0;
                      color: #111;">
                      ${otp}
                    </div>

                    <p>This code will expire in <b>5 minutes</b>.</p>
                    <p style="font-size:12px;color:#6b7280;">
                      If you didn’t request this, ignore this email.
                    </p>
                  </div>
                `;

                console.log("Sending OTP to:", email);
                console.log("Purpose:", purpose);
                console.log("OTP:", otp);

                await mailer.sendMail({
                  from: `"Cuidado Medihelp" <${process.env.MAIL_USER}>`,
                  to: email,
                  subject,
                  html,
                });

                return res.json({ message: "OTP sent" });
              } catch (mailErr) {
                console.error("MAIL SEND ERROR:", mailErr);
                return res.status(500).json({ message: "Failed to send OTP email" });
              }
            }
          );
        }
      );
    });
  } catch (e) {
    console.error("OTP SEND ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// ✅ VERIFY OTP (returns resetToken)
router.post("/auth/otp/verify", (req, res) => {
  const { identifier, otp, purpose = "forgot_password" } = req.body;
  const email = String(identifier || "").trim().toLowerCase();
  const code = String(otp || "").trim();

  if (!email || !code) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  db.query(
    "SELECT * FROM otp_requests WHERE email = ? AND purpose = ? ORDER BY id DESC LIMIT 1",
    [email, purpose],
    async (err, rows) => {
      if (err) {
        console.error("OTP VERIFY ERROR:", err);
        return res.status(500).json({ message: "Server error" });
      }

      if (!rows.length) {
        return res.status(400).json({ message: "No OTP request found" });
      }

      const record = rows[0];

      if (new Date(record.expires_at).getTime() < Date.now()) {
        db.query("DELETE FROM otp_requests WHERE id = ?", [record.id]);
        return res.status(400).json({ message: "OTP expired" });
      }

      if (record.attempts >= 5) {
        db.query("DELETE FROM otp_requests WHERE id = ?", [record.id]);
        return res.status(429).json({ message: "Too many attempts. Request a new OTP." });
      }

      const ok = await bcrypt.compare(code, record.otp_hash);

      if (!ok) {
        db.query("UPDATE otp_requests SET attempts = attempts + 1 WHERE id = ?", [record.id]);
        return res.status(400).json({ message: "Invalid OTP" });
      }

      db.query("DELETE FROM otp_requests WHERE id = ?", [record.id]);

      // signup verification -> just return verified
      if (purpose === "signup_verification") {
        return res.json({ message: "Verified" });
      }

      // forgot password -> create reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const tokenExp = new Date(Date.now() + 10 * 60 * 1000);

      db.query("DELETE FROM password_reset_tokens WHERE email = ?", [email], (delErr) => {
        if (delErr) {
          console.error("RESET TOKEN DELETE ERROR:", delErr);
          return res.status(500).json({ message: "Server error" });
        }

        db.query(
          "INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)",
          [email, resetToken, tokenExp],
          (insErr) => {
            if (insErr) {
              console.error("RESET TOKEN INSERT ERROR:", insErr);
              return res.status(500).json({ message: "Server error" });
            }

            return res.json({ message: "Verified", resetToken });
          }
        );
      });
    }
  );
});

// ✅ RESET PASSWORD (updates users.password_hash)
router.post("/auth/password/reset", async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    const e = String(email || "").trim().toLowerCase();

    if (!e || !resetToken || !newPassword) {
      return res.status(400).json({ message: "Missing data" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // verify reset token
    db.query(
      "SELECT * FROM password_reset_tokens WHERE email = ? AND token = ? ORDER BY id DESC LIMIT 1",
      [e, resetToken],
      async (err, rows) => {
        if (err) {
          console.error("RESET VERIFY ERROR:", err);
          return res.status(500).json({ message: "Server error" });
        }
        if (!rows.length) return res.status(400).json({ message: "Invalid reset session" });

        const record = rows[0];
        if (new Date(record.expires_at).getTime() < Date.now()) {
          db.query("DELETE FROM password_reset_tokens WHERE id = ?", [record.id]);
          return res.status(400).json({ message: "Reset session expired" });
        }

        const hashed = await bcrypt.hash(String(newPassword), 10);

        db.query(
          "UPDATE users SET password_hash = ? WHERE email = ?",
          [hashed, e],
          (upErr, upRes) => {
            if (upErr) {
              console.error("PASSWORD UPDATE ERROR:", upErr);
              return res.status(500).json({ message: "Server error" });
            }

            db.query("DELETE FROM password_reset_tokens WHERE email = ?", [e]);
            return res.json({ message: "Password updated ✅" });
          }
        );
      }
    );
  } catch (e) {
    console.error("RESET ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;