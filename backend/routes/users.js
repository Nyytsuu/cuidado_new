const express = require("express");
const bcrypt = require("bcrypt");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const axios = require("axios");
const nodemailer = require("nodemailer");
const pool = require("../db/pool");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// /meta/* routes are public (used during signup — no account yet)
// All /:userId/* routes require a valid JWT
router.use((req, res, next) => {
  if (req.path.startsWith("/meta/")) return next();
  return verifyToken(req, res, next);
});

// Ownership guard: a user can only access their OWN data.
// Admins can access any user's data.
router.param("userId", (req, res, next, userId) => {
  if (!req.user) return res.status(401).json({ message: "Authentication required." });
  if (req.user.role === "admin") return next();

  const jwtId = String(req.user.id ?? req.user.userId ?? "");
  const paramId = String(userId ?? "");

  console.log(`[ownership] jwt.id=${JSON.stringify(req.user.id)} jwt.userId=${JSON.stringify(req.user.userId)} param=${JSON.stringify(userId)} role=${req.user.role}`);

  if (!jwtId || jwtId !== paramId) {
    return res.status(403).json({ message: "Access denied." });
  }
  next();
});

const NOTIFICATION_CATEGORIES = new Set(["Appointments", "System", "Promotions"]);
const SUPPORT_TOPICS = new Set([
  "Account",
  "Appointments",
  "Clinic Search",
  "Notifications",
  "Voice Assistant",
  "Emergency Page",
  "Technical Issue",
  "Other",
]);
const SUPPORT_PRIORITIES = new Set(["low", "normal", "urgent"]);
const PROFILE_UPLOAD_DIR = path.join("uploads", "profile-pictures");
const PROFILE_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const PROFILE_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const PROFILE_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

// Supabase Storage — set SUPABASE_URL + SUPABASE_SERVICE_KEY in env to enable cloud storage.
// Without these, the server falls back to local disk (dev-only; Render will wipe local files on restart).
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const SUPABASE_BUCKET = "profile-pictures";
const USE_SUPABASE_STORAGE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

const cleanEnv = (value) => String(value || "").trim();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const parseEmailList = (value) =>
  cleanEnv(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const MAIL_USER = cleanEnv(process.env.MAIL_USER || process.env.EMAIL_USER);
const MAIL_PASS = String(process.env.MAIL_PASS || process.env.EMAIL_PASS || "").replace(/\s+/g, "");
const configuredMailFrom = cleanEnv(process.env.MAIL_FROM);
const MAIL_FROM =
  configuredMailFrom && (configuredMailFrom.includes("<") || EMAIL_RE.test(configuredMailFrom))
    ? configuredMailFrom
    : MAIL_USER
    ? `"Cuidado MediHelp" <${MAIL_USER}>`
    : "";
const MAIL_HOST = cleanEnv(process.env.MAIL_HOST || process.env.EMAIL_HOST);
const MAIL_PORT = Number(process.env.MAIL_PORT || process.env.EMAIL_PORT || 587);
const MAIL_SECURE =
  String(process.env.MAIL_SECURE || process.env.EMAIL_SECURE || "").toLowerCase() === "true" ||
  MAIL_PORT === 465;
const SUPPORT_RECIPIENTS = parseEmailList(
  process.env.SUPPORT_EMAIL ||
  process.env.CONTACT_SUPPORT_EMAIL ||
  process.env.SUPPORT_TO_EMAIL ||
  MAIL_USER
);
const reminderMailer =
  MAIL_USER && MAIL_PASS
    ? nodemailer.createTransport(
        MAIL_HOST
          ? {
              host: MAIL_HOST,
              port: MAIL_PORT,
              secure: MAIL_SECURE,
              auth: {
                user: MAIL_USER,
                pass: MAIL_PASS,
              },
            }
          : {
              service: process.env.MAIL_SERVICE || process.env.EMAIL_SERVICE || "gmail",
              auth: {
                user: MAIL_USER,
                pass: MAIL_PASS,
              },
            }
      )
    : null;

if (reminderMailer) {
  reminderMailer.verify((error) => {
    if (error) {
      console.error("SUPPORT MAILER ERROR:", error.message || error);
    } else {
      console.log("Support mailer ready");
    }
  });
} else {
  console.warn("Support mailer disabled: MAIL_USER or MAIL_PASS is not configured.");
}

// Only create the local uploads directory when NOT using Supabase Storage (i.e. local dev).
if (!USE_SUPABASE_STORAGE) {
  fs.mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });
}

// Use in-memory multer when Supabase Storage is configured so there is nothing to write to disk.
// Fall back to disk storage for local development.
const profilePictureStorage = USE_SUPABASE_STORAGE
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, PROFILE_UPLOAD_DIR),
      filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname || "").toLowerCase();
        const baseName = path
          .basename(file.originalname || "profile", extension)
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .slice(0, 40);

        cb(null, `user-${Date.now()}-${baseName || "profile"}${extension}`);
      },
    });

const profilePictureUpload = multer({
  storage: profilePictureStorage,
  limits: { fileSize: PROFILE_IMAGE_MAX_SIZE },
});

const uploadProfilePicture = (req, res, next) => {
  profilePictureUpload.single("profile_picture")(req, res, (error) => {
    if (!error) return next();

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Profile picture must be 5MB or smaller."
        : "Failed to upload profile picture.";

    return res.status(400).json({ message });
  });
};

const getProfilePictureValidationError = (file) => {
  if (!file) return "Profile picture is required.";

  const extension = path.extname(file.originalname || "").toLowerCase();
  if (!PROFILE_IMAGE_EXTENSIONS.has(extension) || !PROFILE_IMAGE_MIME_TYPES.has(file.mimetype)) {
    return "Profile picture must be a JPG, PNG, or WEBP image.";
  }

  if (file.size > PROFILE_IMAGE_MAX_SIZE) {
    return "Profile picture must be 5MB or smaller.";
  }

  return "";
};

const removeUploadedFile = async (filePath) => {
  if (!filePath) return;
  await fs.promises.unlink(filePath).catch(() => {});
};

const ensureUserProfilePictureColumn = async () => {
  const [columns] = await pool.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'profile_picture'
    LIMIT 1
    `
  );

  if (columns.length === 0) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN profile_picture VARCHAR(255) DEFAULT NULL
    `);
  }
};

let appointmentRescheduleSchemaPromise = null;

const ensureAppointmentRescheduleColumns = async () => {
  if (!appointmentRescheduleSchemaPromise) {
    appointmentRescheduleSchemaPromise = (async () => {
      const [columns] = await pool.query(
        `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'appointments'
          AND column_name IN (
            'status',
            'proposed_start_at',
            'proposed_end_at',
            'reschedule_reason',
            'reschedule_requested_by',
            'reschedule_requested_at'
          )
        `
      );

      const existing = new Map(
        columns.map((column) => [column.column_name, column.data_type])
      );

      if (!existing.has("proposed_start_at")) {
        await pool.query(`
          ALTER TABLE appointments
          ADD COLUMN proposed_start_at TIMESTAMP NULL
        `);
      }

      if (!existing.has("proposed_end_at")) {
        await pool.query(`
          ALTER TABLE appointments
          ADD COLUMN proposed_end_at TIMESTAMP NULL
        `);
      }

      if (!existing.has("reschedule_reason")) {
        await pool.query(`
          ALTER TABLE appointments
          ADD COLUMN reschedule_reason TEXT NULL
        `);
      }

      if (!existing.has("reschedule_requested_by")) {
        await pool.query(`
          ALTER TABLE appointments
          ADD COLUMN reschedule_requested_by VARCHAR(20) NULL
        `);
      }

      if (!existing.has("reschedule_requested_at")) {
        await pool.query(`
          ALTER TABLE appointments
          ADD COLUMN reschedule_requested_at TIMESTAMP NULL
        `);
      }

    })().catch((error) => {
      appointmentRescheduleSchemaPromise = null;
      throw error;
    });
  }

  return appointmentRescheduleSchemaPromise;
};

const ensureUserNotificationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      unique_key VARCHAR(160) NOT NULL,
      title VARCHAR(180) NOT NULL,
      message TEXT NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'System',
      icon VARCHAR(40) NOT NULL DEFAULT 'bell',
      is_read SMALLINT NOT NULL DEFAULT 0,
      appointment_id INTEGER DEFAULT NULL,
      read_at TIMESTAMP DEFAULT NULL,
      email_sent_at TIMESTAMP DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_user_notification UNIQUE (user_id, unique_key)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_notifications_user
    ON user_notifications (user_id, is_read, created_at)
  `);

  await pool.query(`
    ALTER TABLE user_notifications
    ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP DEFAULT NULL
  `);
};

const ensureUserSupportRequestsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_support_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      topic VARCHAR(80) NOT NULL,
      priority VARCHAR(20) NOT NULL DEFAULT 'normal',
      subject VARCHAR(180) NOT NULL,
      message TEXT NOT NULL,
      contact_email VARCHAR(255) DEFAULT NULL,
      contact_phone VARCHAR(40) DEFAULT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_support_requests_user
    ON user_support_requests (user_id, created_at)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_support_requests_status
    ON user_support_requests (status)
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

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const sendSupportTicketEmails = async ({
  requestId,
  user,
  topic,
  priority,
  subject,
  message,
  contactEmail,
  contactPhone,
}) => {
  if (!reminderMailer || SUPPORT_RECIPIENTS.length === 0) {
    const missing = !reminderMailer ? "mailer credentials" : "support recipient";
    console.error(`SUPPORT EMAIL SKIPPED: missing ${missing}.`);
    return {
      supportEmailSent: false,
      confirmationEmailSent: false,
      supportEmailError: `Missing ${missing}.`,
      confirmationEmailError: "",
    };
  }

  const requesterName = user?.full_name || user?.name || "Cuidado user";
  const submittedEmail = cleanEnv(contactEmail);
  const accountEmail = cleanEnv(user?.email);
  const requesterEmail = EMAIL_RE.test(submittedEmail)
    ? submittedEmail
    : EMAIL_RE.test(accountEmail)
    ? accountEmail
    : submittedEmail || accountEmail;
  const requesterPhone = contactPhone || user?.phone || "";
  const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);
  const replyToEmail = EMAIL_RE.test(requesterEmail) ? requesterEmail : "";

  let supportEmailSent = false;
  let confirmationEmailSent = false;
  let supportEmailError = "";
  let confirmationEmailError = "";

  try {
    const info = await reminderMailer.sendMail({
      from: MAIL_FROM,
      to: SUPPORT_RECIPIENTS,
      replyTo: replyToEmail || undefined,
      subject: `[Cuidado Support #${requestId}] ${subject}`,
      text: [
        `New support ticket #${requestId}`,
        `User: ${requesterName}`,
        `User ID: ${user?.id || "Unknown"}`,
        `Topic: ${topic}`,
        `Priority: ${priorityLabel}`,
        `Reply email: ${requesterEmail || "Not provided"}`,
        `Phone: ${requesterPhone || "Not provided"}`,
        "",
        subject,
        "",
        message,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#123;">
          <h2 style="margin:0 0 12px;color:#0b716b;">New support ticket #${escapeHtml(
            requestId
          )}</h2>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <p><strong>Topic:</strong> ${escapeHtml(topic)}</p>
          <p><strong>Priority:</strong> ${escapeHtml(priorityLabel)}</p>
          <p><strong>User:</strong> ${escapeHtml(requesterName)} (#${escapeHtml(
            user?.id || "Unknown"
          )})</p>
          <p><strong>Reply email:</strong> ${escapeHtml(requesterEmail || "Not provided")}</p>
          <p><strong>Phone:</strong> ${escapeHtml(requesterPhone || "Not provided")}</p>
          <hr style="border:none;border-top:1px solid #dce8e8;margin:16px 0;" />
          <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
        </div>
      `,
    });
    const accepted = Array.isArray(info.accepted) ? info.accepted : [];
    const rejected = Array.isArray(info.rejected) ? info.rejected : [];
    supportEmailSent = accepted.length > 0 && rejected.length === 0;
    console.log("Support email accepted:", accepted);
    console.log("Support email rejected:", rejected);
  } catch (error) {
    supportEmailError = error?.message || "Support email failed to send.";
    console.error("SUPPORT EMAIL SEND ERROR:", supportEmailError);
  }

  if (EMAIL_RE.test(requesterEmail)) {
    try {
      const info = await reminderMailer.sendMail({
        from: MAIL_FROM,
        to: requesterEmail,
        subject: `Cuidado support received your request #${requestId}`,
        text: `Hi ${requesterName}, we received your support request "${subject}". Ticket #${requestId} is now open.`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#123;">
            <h2 style="margin:0 0 12px;color:#0b716b;">Support request received</h2>
            <p>Hi ${escapeHtml(requesterName)},</p>
            <p>We received your support request and saved it as ticket <strong>#${escapeHtml(
              requestId
            )}</strong>.</p>
            <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
            <p>You can close it from your Help page once the issue is resolved.</p>
          </div>
        `,
      });
      const accepted = Array.isArray(info.accepted) ? info.accepted : [];
      const rejected = Array.isArray(info.rejected) ? info.rejected : [];
      confirmationEmailSent = accepted.length > 0 && rejected.length === 0;
      console.log("Support confirmation accepted:", accepted);
      console.log("Support confirmation rejected:", rejected);
    } catch (error) {
      confirmationEmailError = error?.message || "Support confirmation email failed to send.";
      console.error("SUPPORT CONFIRMATION EMAIL SEND ERROR:", confirmationEmailError);
    }
  }

  return {
    supportEmailSent,
    confirmationEmailSent,
    supportEmailError,
    confirmationEmailError,
  };
};

const sendAppointmentReminderEmailOnce = async ({
  userId,
  uniqueKey,
  to,
  patientName,
  clinicName,
  appointmentDate,
}) => {
  if (!reminderMailer || !to) return;

  const [notifications] = await pool.query(
    `
    SELECT id, email_sent_at
    FROM user_notifications
    WHERE user_id = ? AND unique_key = ?
    LIMIT 1
    `,
    [userId, uniqueKey]
  );

  const notification = notifications[0];
  if (!notification || notification.email_sent_at) return;

  const safeName = patientName || "there";
  const subject = "Upcoming clinic appointment reminder";
  const text = `Hi ${safeName}, this is a reminder that you have an appointment with ${clinicName} on ${appointmentDate}.`;

  try {
    await reminderMailer.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      text,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #123;">
          <h2 style="margin: 0 0 12px;">Upcoming clinic appointment</h2>
          <p>Hi ${escapeHtml(safeName)},</p>
          <p>This is a reminder that you have an appointment with <strong>${escapeHtml(
            clinicName
          )}</strong>.</p>
          <p><strong>Schedule:</strong> ${escapeHtml(appointmentDate)}</p>
          <p>Please check your Cuidado notifications for appointment updates.</p>
        </div>
      `,
    });

    await pool.query(
      `
      UPDATE user_notifications
      SET email_sent_at = NOW()
      WHERE id = ?
      `,
      [notification.id]
    );
  } catch (error) {
    console.error("Appointment reminder email error:", error.message || error);
  }
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

  const [result] = await pool.query(
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
    ON CONFLICT (user_id, unique_key) DO UPDATE SET
      title = EXCLUDED.title,
      message = EXCLUDED.message,
      category = EXCLUDED.category,
      icon = EXCLUDED.icon,
      appointment_id = EXCLUDED.appointment_id,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id
    `,
    [userId, uniqueKey, title, message, safeCategory, icon, appointmentId, createdAt]
  );

  return result;
};

const syncAppointmentNotifications = async (userId) => {
  await ensureAppointmentRescheduleColumns();

  const [appointments] = await pool.query(
    `
    SELECT
      a.id,
      a.status,
      a.start_at,
      a.proposed_start_at,
      a.proposed_end_at,
      a.reschedule_reason,
      a.reschedule_requested_at,
      a.created_at,
      a.updated_at,
      a.cancelled_at,
      a.completed_at,
      a.cancel_reason,
      COALESCE(a.clinic_name_snapshot, c.clinic_name, 'the clinic') AS clinic_name,
      u.full_name AS user_name,
      u.email AS user_email
    FROM appointments a
    LEFT JOIN clinics c ON c.id = a.clinic_id
    LEFT JOIN users u ON u.id = a.user_id
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
    const proposedDate = toDisplayDate(
      appointment.proposed_start_at || appointment.start_at
    );
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

    if (appointment.status === "reschedule_requested") {
      const requestTimestamp = new Date(
        appointment.reschedule_requested_at || appointment.updated_at || new Date()
      ).getTime();

      await insertNotification({
        userId,
        uniqueKey: `appointment:${appointment.id}:reschedule:${requestTimestamp}`,
        title: "Reschedule Request",
        message: `${clinicName} proposed moving your appointment to ${proposedDate}. Please accept it or cancel the appointment.`,
        category: "Appointments",
        icon: "clock",
        appointmentId: appointment.id,
        createdAt:
          appointment.reschedule_requested_at ||
          appointment.updated_at ||
          new Date(),
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
      const upcomingKey = `appointment:${appointment.id}:upcoming`;
      await insertNotification({
        userId,
        uniqueKey: upcomingKey,
        title: "Upcoming Appointment Reminder",
        message: `You have an appointment with ${clinicName} on ${appointmentDate}.`,
        category: "Appointments",
        icon: "clock",
        appointmentId: appointment.id,
        createdAt: new Date(),
      });

      await sendAppointmentReminderEmailOnce({
        userId,
        uniqueKey: upcomingKey,
        to: appointment.user_email,
        patientName: appointment.user_name,
        clinicName,
        appointmentDate,
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
 * GET /api/users/:userId/support-requests
 */
router.get("/:userId/support-requests", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId) {
      return res.status(400).json({ message: "Valid userId is required." });
    }

    await ensureUserSupportRequestsTable();

    const [rows] = await pool.query(
      `
      SELECT
        id,
        user_id,
        topic,
        priority,
        subject,
        message,
        contact_email,
        contact_phone,
        status,
        created_at,
        updated_at
      FROM user_support_requests
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 10
      `,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error("GET /support-requests error:", error);
    res.status(500).json({ message: "Failed to load support requests." });
  }
});

/**
 * POST /api/users/:userId/support-requests
 */
router.post("/:userId/support-requests", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const topic = String(req.body.topic || "").trim();
    const priority = String(req.body.priority || "normal").trim().toLowerCase();
    const subject = String(req.body.subject || "").trim();
    const message = String(req.body.message || "").trim();
    const contactEmail = String(req.body.contact_email || "").trim();
    const contactPhone = String(req.body.contact_phone || "").trim();

    if (!userId) {
      return res.status(400).json({ message: "Valid userId is required." });
    }

    if (!SUPPORT_TOPICS.has(topic)) {
      return res.status(400).json({ message: "Please choose a valid support topic." });
    }

    if (!SUPPORT_PRIORITIES.has(priority)) {
      return res.status(400).json({ message: "Please choose a valid priority." });
    }

    if (subject.length < 5 || subject.length > 180) {
      return res.status(400).json({
        message: "Subject must be between 5 and 180 characters.",
      });
    }

    if (message.length < 15 || message.length > 2000) {
      return res.status(400).json({
        message: "Message must be between 15 and 2000 characters.",
      });
    }

    const [users] = await pool.query(
      `
      SELECT id, full_name, email, phone
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = users[0];

    await ensureUserSupportRequestsTable();

    const [result] = await pool.query(
      `
      INSERT INTO user_support_requests (
        user_id,
        topic,
        priority,
        subject,
        message,
        contact_email,
        contact_phone,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
      `,
      [
        userId,
        topic,
        priority,
        subject,
        message,
        contactEmail || null,
        contactPhone || null,
      ]
    );

    const ticketId = result.insertId;
    const {
      supportEmailSent,
      confirmationEmailSent,
      supportEmailError,
      confirmationEmailError,
    } = await sendSupportTicketEmails({
      requestId: ticketId,
      user,
      topic,
      priority,
      subject,
      message,
      contactEmail,
      contactPhone,
    });

    await ensureUserNotificationsTable();
    await insertNotification({
      userId,
      uniqueKey: `support:${ticketId}:created`,
      title: "Support Request Received",
      message: `Your support request "${subject}" was submitted.`,
      category: "System",
      icon: "info",
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "Support request submitted successfully.",
      request_id: ticketId,
      status: "open",
      email_sent: supportEmailSent,
      confirmation_email_sent: confirmationEmailSent,
      email_error: supportEmailSent ? "" : supportEmailError || "Support email was not accepted.",
      confirmation_email_error: confirmationEmailSent ? "" : confirmationEmailError,
    });
  } catch (error) {
    console.error("POST /support-requests error:", error);
    res.status(500).json({ message: "Failed to submit support request." });
  }
});

/**
 * PATCH /api/users/:userId/support-requests/:requestId/close
 */
router.patch("/:userId/support-requests/:requestId/close", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const requestId = Number(req.params.requestId);

    if (!userId || !requestId) {
      return res.status(400).json({ message: "Valid userId and requestId are required." });
    }

    await ensureUserSupportRequestsTable();

    const [result] = await pool.query(
      `
      UPDATE user_support_requests
      SET status = 'closed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
      RETURNING id
      `,
      [requestId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Support request not found." });
    }

    await ensureUserNotificationsTable();
    await insertNotification({
      userId,
      uniqueKey: `support:${requestId}:closed`,
      title: "Support Request Closed",
      message: `Support ticket #${requestId} was closed.`,
      category: "System",
      icon: "info",
      createdAt: new Date(),
    });

    res.json({ message: "Support request closed.", request_id: requestId, status: "closed" });
  } catch (error) {
    console.error("PATCH /support-requests/:requestId/close error:", error);
    res.status(500).json({ message: "Failed to close support request." });
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

    await ensureUserProfilePictureColumn();

    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.profile_picture,
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
 * PATCH /api/users/:userId/deactivate
 * Deactivates (or reactivates) the account without requiring full profile fields.
 */
router.patch("/:userId/deactivate", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const allowed = ["active", "disabled"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    await pool.query(
      "UPDATE users SET status = ? WHERE id = ?",
      [status, userId]
    );

    res.json({ message: "Account status updated." });
  } catch (error) {
    console.error("PATCH /deactivate error:", error);
    res.status(500).json({ message: "Failed to update account status." });
  }
});

/**
 * PUT /api/users/:userId/profile-picture
 */
router.put(
  "/:userId/profile-picture",
  uploadProfilePicture,
  async (req, res) => {
    try {
      const userId = Number(req.params.userId);

      if (!userId) {
        await removeUploadedFile(req.file?.path);
        return res.status(400).json({ message: "Valid userId is required." });
      }

      const validationError = getProfilePictureValidationError(req.file);
      if (validationError) {
        await removeUploadedFile(req.file?.path);
        return res.status(400).json({ message: validationError });
      }

      await ensureUserProfilePictureColumn();

      const [users] = await pool.query(
        `
        SELECT id
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [userId]
      );

      if (users.length === 0) {
        await removeUploadedFile(req.file?.path);
        return res.status(404).json({ message: "User not found." });
      }

      let profilePicturePath;

      if (USE_SUPABASE_STORAGE) {
        // --- Cloud storage path (Render production) ---
        const ext =
          path.extname(req.file.originalname || "").toLowerCase() || ".jpg";
        const safeName = path
          .basename(req.file.originalname || "profile", ext)
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .slice(0, 40) || "profile";
        const fileName = `user-${userId}-${Date.now()}-${safeName}${ext}`;

        try {
          await axios.post(
            `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`,
            req.file.buffer,
            {
              headers: {
                Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
                "Content-Type": req.file.mimetype,
                "x-upsert": "true",
              },
              maxBodyLength: Infinity,
              maxContentLength: Infinity,
            }
          );
        } catch (uploadErr) {
          const detail =
            uploadErr?.response?.data?.message ||
            uploadErr?.message ||
            "Unknown error";
          console.error("Supabase Storage upload error:", detail);
          return res
            .status(500)
            .json({ message: "Failed to upload profile picture to storage." });
        }

        // Public URL — bucket must be set to "Public" in Supabase dashboard
        profilePicturePath = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${fileName}`;
      } else {
        // --- Local disk fallback (development only) ---
        profilePicturePath = path.posix.join(
          "uploads",
          "profile-pictures",
          req.file.filename
        );
      }

      await pool.query(
        `
        UPDATE users
        SET profile_picture = ?
        WHERE id = ?
        `,
        [profilePicturePath, userId]
      );

      res.json({
        message: "Profile picture updated successfully.",
        profile_picture: profilePicturePath,
      });
    } catch (error) {
      await removeUploadedFile(req.file?.path);
      console.error("PUT /profile-picture error:", error);
      res.status(500).json({ message: "Failed to update profile picture." });
    }
  }
);

const ensureOtpRequestsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS otp_requests (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      otp_hash TEXT NOT NULL,
      purpose VARCHAR(80) NOT NULL DEFAULT 'forgot_password',
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_otp_requests_email_purpose
    ON otp_requests (email, purpose)
  `);
  // Add columns if missing (for existing tables created before these columns existed)
  await pool.query(`ALTER TABLE otp_requests ADD COLUMN IF NOT EXISTS purpose VARCHAR(80) NOT NULL DEFAULT 'forgot_password'`);
  await pool.query(`ALTER TABLE otp_requests ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0`);
};

/**
 * POST /api/users/:userId/send-verify-email
 * Sends a 6-digit code to the user's registered email for identity verification.
 */
router.post("/:userId/send-verify-email", async (req, res) => {
  try {
    await ensureOtpRequestsTable();
    const userId = Number(req.params.userId);

    const [rows] = await pool.query(
      "SELECT email FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found." });
    }

    const email = rows[0].email;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const bcrypt = require("bcrypt");
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await pool.query(
      `DELETE FROM otp_requests WHERE email = ? AND purpose = ?`,
      [email, "password_view"]
    );

    await pool.query(
      `INSERT INTO otp_requests (email, otp_hash, purpose, expires_at) VALUES (?, ?, ?, ?)`,
      [email, codeHash, "password_view", expiresAt]
    );

    if (reminderMailer) {
      await reminderMailer.sendMail({
        from: MAIL_FROM,
        to: email,
        subject: "Cuidado Medihelp — Password View Verification",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;">
            <h2 style="color:#004d40;">Password View Verification</h2>
            <p>Use this 6-digit code to verify your identity and view your current password:</p>
            <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0;color:#111;">
              ${code}
            </div>
            <p>This code expires in <b>5 minutes</b>.</p>
            <p style="font-size:12px;color:#6b7280;">If you did not request this, ignore this email.</p>
          </div>
        `,
      });
    }

    return res.json({ message: "Verification code sent." });
  } catch (error) {
    console.error("POST /send-verify-email error:", error);
    res.status(500).json({ message: "Failed to send verification code." });
  }
});

/**
 * POST /api/users/:userId/verify-email-code
 * Verifies the 6-digit code sent to the user's email.
 */
router.post("/:userId/verify-email-code", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const code = String(req.body.code || "").trim();

    if (!code || code.length !== 6) {
      return res.status(400).json({ message: "A 6-digit code is required." });
    }

    const [userRows] = await pool.query(
      "SELECT email FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ message: "User not found." });
    }

    const email = userRows[0].email;
    const bcrypt = require("bcrypt");

    const [rows] = await pool.query(
      `SELECT * FROM otp_requests WHERE email = ? AND purpose = ? ORDER BY id DESC LIMIT 1`,
      [email, "password_view"]
    );

    if (!rows.length) {
      return res.status(400).json({ message: "No verification request found. Please request a new code." });
    }

    const record = rows[0];

    if (new Date(record.expires_at).getTime() < Date.now()) {
      await pool.query("DELETE FROM otp_requests WHERE id = ?", [record.id]);
      return res.status(400).json({ message: "Code expired. Please request a new one." });
    }

    if ((record.attempts || 0) >= 5) {
      await pool.query("DELETE FROM otp_requests WHERE id = ?", [record.id]);
      return res.status(429).json({ message: "Too many attempts. Please request a new code." });
    }

    const ok = await bcrypt.compare(code, record.otp_hash);

    if (!ok) {
      await pool.query("UPDATE otp_requests SET attempts = COALESCE(attempts, 0) + 1 WHERE id = ?", [record.id]);
      return res.status(400).json({ message: "Invalid code. Please try again." });
    }

    await pool.query("DELETE FROM otp_requests WHERE id = ?", [record.id]);

    return res.json({ message: "Verified successfully." });
  } catch (error) {
    console.error("POST /verify-email-code error:", error);
    res.status(500).json({ message: "Failed to verify code." });
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
