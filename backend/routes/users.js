const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db/pool");

const router = express.Router();

/**
 * GET /api/users/meta/provinces
 */
router.get("/meta/provinces", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT id, province_name AS name
      FROM provinces
      ORDER BY province_name ASC
      `
    );

    res.json(rows);
  } catch (error) {
    console.error("GET /meta/provinces error:", error);
    res.status(500).json({ message: "Failed to load provinces." });
  }
});

/**
 * GET /api/users/meta/municipalities?province_id=42100000
 */
router.get("/meta/municipalities", async (req, res) => {
  try {
    const { province_id } = req.query;

    if (!province_id) {
      return res.status(400).json({ message: "province_id is required." });
    }

    const [rows] = await pool.query(
      `
      SELECT id, province_id, name
      FROM municipalities
      WHERE province_id = ?
      ORDER BY name ASC
      `,
      [province_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("GET /meta/municipalities error:", error);
    res.status(500).json({ message: "Failed to load municipalities." });
  }
});

/**
 * GET /api/users/meta/barangays?municipality_id=42101000
 */
router.get("/meta/barangays", async (req, res) => {
  try {
    const { municipality_id } = req.query;

    if (!municipality_id) {
      return res.status(400).json({ message: "municipality_id is required." });
    }

    const [rows] = await pool.query(
      `
      SELECT id, municipality_id, name
      FROM barangays
      WHERE municipality_id = ?
      ORDER BY name ASC
      `,
      [municipality_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("GET /meta/barangays error:", error);
    res.status(500).json({ message: "Failed to load barangays." });
  }
});

/**
 * GET /api/users/:userId/profile
 */
router.get("/:userId/profile", async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.gender,
        u.date_of_birth,
        u.province_id,
        u.municipality_id,
        u.barangay_id,
        u.address,
        u.consent,
        u.status,
        u.created_at,
        p.province_name AS province_name,
        m.name AS municipality_name,
        b.name AS barangay_name
      FROM users u
      LEFT JOIN provinces p ON p.id = u.province_id
      LEFT JOIN municipalities m ON m.id = u.municipality_id
      LEFT JOIN barangays b ON b.id = u.barangay_id
      WHERE u.id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("GET /profile error:", error);
    res.status(500).json({ message: "Failed to load profile." });
  }
});

/**
 * PUT /api/users/:userId/profile
 */
router.put("/:userId/profile", async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      full_name,
      email,
      phone,
      gender,
      date_of_birth,
      province_id,
      municipality_id,
      barangay_id,
      address,
      consent,
      status,
    } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({
        message: "Full name and email are required.",
      });
    }

    const [emailRows] = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = ? AND id <> ?
      LIMIT 1
      `,
      [email, userId]
    );

    if (emailRows.length > 0) {
      return res.status(409).json({
        message: "Email is already in use.",
      });
    }

    await pool.query(
      `
      UPDATE users
      SET
        full_name = ?,
        email = ?,
        phone = ?,
        gender = ?,
        date_of_birth = ?,
        province_id = ?,
        municipality_id = ?,
        barangay_id = ?,
        address = ?,
        consent = ?,
        status = COALESCE(?, status)
      WHERE id = ?
      `,
      [
        full_name,
        email,
        phone || null,
        gender || null,
        date_of_birth || null,
        province_id || null,
        municipality_id || null,
        barangay_id || null,
        address || null,
        typeof consent === "boolean" ? (consent ? 1 : 0) : consent ?? null,
        status || null,
        userId,
      ]
    );

    res.json({ message: "Profile updated successfully." });
  } catch (error) {
    console.error("PUT /profile error:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

/**
 * PUT /api/users/:userId/password
 */
router.put("/:userId/password", async (req, res) => {
  try {
    const { userId } = req.params;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        message: "Current password and new password are required.",
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters.",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT password_hash
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);

    if (!valid) {
      return res.status(401).json({
        message: "Current password is incorrect.",
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      `
      UPDATE users
      SET password_hash = ?
      WHERE id = ?
      `,
      [hashedPassword, userId]
    );

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("PUT /password error:", error);
    res.status(500).json({ message: "Failed to update password." });
  }
});

module.exports = router;