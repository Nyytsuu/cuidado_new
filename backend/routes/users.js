const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db/pool");

const router = express.Router();

const NOTIFICATION_CATEGORIES = new Set(["Appointments", "System", "Promotions"]);

const ensureUserNotificationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      unique_key VARCHAR(160) NOT NULL,
      title VARCHAR(180) NOT NULL,
      message TEXT NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'System',
      icon VARCHAR(40) NOT NULL DEFAULT 'bell',
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      appointment_id INT DEFAULT NULL,
      read_at DATETIME DEFAULT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY unique_user_notification (user_id, unique_key),
      INDEX idx_user_notifications_user (user_id, is_read, created_at)
    )
  `);
};

const toDisplayDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "the selected date";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const insertNotification = async ({
  userId,
  uniqueKey,
  title,
  message,
  category = "System",
  icon = "bell",
  appointmentId = null,
  createdAt = new Date(),
}) => {
  const safeCategory = NOTIFICATION_CATEGORIES.has(category) ? category : "System";

  await pool.query(
    `
    INSERT INTO user_notifications (
      user_id,
      unique_key,
      title,
      message,
      category,
      icon,
      appointment_id,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      message = VALUES(message),
      category = VALUES(category),
      icon = VALUES(icon),
      appointment_id = VALUES(appointment_id),
      updated_at = NOW()
    `,
    [userId, uniqueKey, title, message, safeCategory, icon, appointmentId, createdAt]
  );
};

const syncAppointmentNotifications = async (userId) => {
  const [appointments] = await pool.query(
    `
    SELECT
      a.id,
      a.status,
      a.start_at,
      a.created_at,
      a.updated_at,
      a.cancelled_at,
      a.completed_at,
      a.cancel_reason,
      COALESCE(a.clinic_name_snapshot, c.clinic_name, 'the clinic') AS clinic_name
    FROM appointments a
    LEFT JOIN clinics c ON c.id = a.clinic_id
    WHERE a.user_id = ?
    ORDER BY a.updated_at DESC
    LIMIT 100
    `,
    [userId]
  );

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const appointment of appointments) {
    const appointmentDate = toDisplayDate(appointment.start_at);
    const clinicName = appointment.clinic_name || "the clinic";

    await insertNotification({
      userId,
      uniqueKey: `appointment:${appointment.id}:created`,
      title: "Appointment Request Sent",
      message: `Your appointment request with ${clinicName} for ${appointmentDate} was submitted.`,
      category: "Appointments",
      icon: "calendar",
      appointmentId: appointment.id,
      createdAt: appointment.created_at || new Date(),
    });

    if (appointment.status === "confirmed") {
      await insertNotification({
        userId,
        uniqueKey: `appointment:${appointment.id}:confirmed`,
        title: "Appointment Confirmed",
        message: `${clinicName} confirmed your appointment for ${appointmentDate}.`,
        category: "Appointments",
        icon: "check",
        appointmentId: appointment.id,
        createdAt: appointment.updated_at || new Date(),
      });
    }

    if (appointment.status === "cancelled") {
      await insertNotification({
        userId,
        uniqueKey: `appointment:${appointment.id}:cancelled`,
        title: "Appointment Cancelled",
        message: `Your appointment with ${clinicName} for ${appointmentDate} was cancelled.`,
        category: "Appointments",
        icon: "x-circle",
        appointmentId: appointment.id,
        createdAt: appointment.cancelled_at || appointment.updated_at || new Date(),
      });
    }

    if (appointment.status === "completed") {
      await insertNotification({
        userId,
        uniqueKey: `appointment:${appointment.id}:completed`,
        title: "Appointment Completed",
        message: `Your appointment with ${clinicName} has been marked as completed.`,
        category: "Appointments",
        icon: "check",
        appointmentId: appointment.id,
        createdAt: appointment.completed_at || appointment.updated_at || new Date(),
      });
    }

    const startAt = new Date(appointment.start_at).getTime();
    if (
      !Number.isNaN(startAt) &&
      startAt > now &&
      startAt - now <= oneDayMs &&
      ["pending", "confirmed"].includes(appointment.status)
    ) {
      await insertNotification({
        userId,
        uniqueKey: `appointment:${appointment.id}:upcoming`,
        title: "Upcoming Appointment Reminder",
        message: `You have an appointment with ${clinicName} on ${appointmentDate}.`,
        category: "Appointments",
        icon: "clock",
        appointmentId: appointment.id,
        createdAt: new Date(),
      });
    }
  }
};

/**
 * GET /api/users/:userId/notifications
 */
router.get("/:userId/notifications", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId) {
      return res.status(400).json({ message: "Valid userId is required." });
    }

    await ensureUserNotificationsTable();
    await syncAppointmentNotifications(userId);

    const [rows] = await pool.query(
      `
      SELECT
        id,
        user_id,
        title,
        message,
        category,
        icon,
        is_read,
        appointment_id,
        read_at,
        created_at
      FROM user_notifications
      WHERE user_id = ?
      ORDER BY is_read ASC, created_at DESC, id DESC
      LIMIT 100
      `,
      [userId]
    );

    res.json(
      rows.map((row) => ({
        ...row,
        unread: Number(row.is_read) === 0,
      }))
    );
  } catch (error) {
    console.error("GET /notifications error:", error);
    res.status(500).json({ message: "Failed to load notifications." });
  }
});

/**
 * PATCH /api/users/:userId/notifications/mark-all-read
 */
router.patch("/:userId/notifications/mark-all-read", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId) {
      return res.status(400).json({ message: "Valid userId is required." });
    }

    await ensureUserNotificationsTable();

    const [result] = await pool.query(
      `
      UPDATE user_notifications
      SET is_read = 1, read_at = NOW()
      WHERE user_id = ? AND is_read = 0
      `,
      [userId]
    );

    res.json({
      message: "Notifications marked as read.",
      updated: result.affectedRows,
    });
  } catch (error) {
    console.error("PATCH /notifications/mark-all-read error:", error);
    res.status(500).json({ message: "Failed to update notifications." });
  }
});

/**
 * PATCH /api/users/:userId/notifications/:notificationId/read
 */
router.patch("/:userId/notifications/:notificationId/read", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const notificationId = Number(req.params.notificationId);

    if (!userId || !notificationId) {
      return res.status(400).json({
        message: "Valid userId and notificationId are required.",
      });
    }

    await ensureUserNotificationsTable();

    const [result] = await pool.query(
      `
      UPDATE user_notifications
      SET is_read = 1, read_at = NOW()
      WHERE user_id = ? AND id = ?
      `,
      [userId, notificationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found." });
    }

    res.json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("PATCH /notifications/:id/read error:", error);
    res.status(500).json({ message: "Failed to update notification." });
  }
});

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
