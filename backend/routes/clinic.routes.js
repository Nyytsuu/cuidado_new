const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const pool = require("../db/pool");

/* ================= DB CONNECTION ================= */
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Cuidado_2026-cp1!",
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

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PH_PHONE_RE = /^(\+639|09)\d{9}$/;
const LICENSE_RE = /^R\d{2}-\d{2}-\d{6}$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const SIGNUP_SPECIALIZATIONS = new Set(["general", "dental", "pediatric", "laboratory"]);
const SIGNUP_SERVICES = new Set(["general", "dental", "pediatric", "laboratory"]);
const UPLOAD_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp"]);
const UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;

const cleanText = (value) => String(value || "").trim();
const cleanEmail = (value) => cleanText(value).toLowerCase();
const cleanLicense = (value) => cleanText(value).toUpperCase();
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const isValidClinicTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
const clinicTimeToMinutes = (value) => {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
};

const hasValidOperatingDays = (value) =>
  /(mon|tue|wed|thu|fri|sat|sun|daily|everyday|weekday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(
    cleanText(value)
  );

const getUploadValidationError = (file, label) => {
  if (!file) return `${label} is required.`;

  const extension = path.extname(file.originalname || "").toLowerCase();
  if (!UPLOAD_EXTENSIONS.has(extension) || !UPLOAD_MIME_TYPES.has(file.mimetype)) {
    return `${label} must be a PDF, JPG, PNG, or WEBP file.`;
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return `${label} must be 8MB or smaller.`;
  }

  return "";
};

const findAccountByEmail = (email) =>
  pool.query(
    `
    SELECT 'user' AS account_type FROM users WHERE LOWER(email) = ?
    UNION ALL
    SELECT 'clinic' AS account_type FROM clinics WHERE LOWER(email) = ?
    UNION ALL
    SELECT 'admin' AS account_type FROM admins WHERE LOWER(email) = ?
    LIMIT 1
    `,
    [email, email, email]
  );

const ensureEmailVerificationTokensTable = () =>
  pool.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id INT NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL,
      purpose VARCHAR(80) NOT NULL,
      token VARCHAR(128) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY unique_email_verification (email, purpose),
      INDEX idx_email_verification_token (token)
    )
  `);

/* =================================================
   CLINIC SIGNUP
   Mounted at: /api
   Final route: POST /api/clinic/signup
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
        email_verification_token,
      } = req.body;

      const clinicLicense = req.files?.clinic_license_file?.[0];
      const repValidId = req.files?.rep_valid_id_file?.[0];

      const normalizedClinicName = cleanText(clinic_name);
      const normalizedEmail = cleanEmail(email);
      const normalizedPhone = cleanText(phone);
      const provinceId = Number(province_id);
      const municipalityId = Number(municipality_id);
      const barangayId = Number(barangay_id);
      const normalizedAddress = cleanText(address);
      const normalizedSpecialization = cleanText(specialization).toLowerCase();
      const normalizedLicenseNumber = cleanLicense(license_number);
      const yearsOperation =
        cleanText(years_operation) === "" ? 0 : Number(cleanText(years_operation));
      const normalizedRepName = cleanText(rep_full_name);
      const normalizedRepPosition = cleanText(rep_position);
      const normalizedRepPhone = cleanText(rep_phone);
      const normalizedServicesOffered = cleanText(services_offered).toLowerCase();
      const normalizedOpeningTime = cleanText(opening_time);
      const normalizedClosingTime = cleanText(closing_time);
      const normalizedOperatingDays = cleanText(operating_days).toLowerCase();
      const normalizedPassword = String(password || "");
      const emailVerificationToken = cleanText(email_verification_token);
      const validationErrors = [];

      if (normalizedClinicName.length < 3) {
        validationErrors.push("Clinic name must be at least 3 characters.");
      }

      if (!EMAIL_RE.test(normalizedEmail)) {
        validationErrors.push("Please enter a valid clinic email.");
      }

      if (!PH_PHONE_RE.test(normalizedPhone)) {
        validationErrors.push("Clinic phone must use +639XXXXXXXXX or 09XXXXXXXXX.");
      }

      if (!isPositiveInteger(provinceId) || !isPositiveInteger(municipalityId) || !isPositiveInteger(barangayId)) {
        validationErrors.push("Please complete the clinic location selection.");
      }

      if (normalizedAddress.length < 10) {
        validationErrors.push("Clinic address must be at least 10 characters.");
      }

      if (!SIGNUP_SPECIALIZATIONS.has(normalizedSpecialization)) {
        validationErrors.push("Invalid clinic type or specialization.");
      }

      if (!LICENSE_RE.test(normalizedLicenseNumber)) {
        validationErrors.push("License number must use the format R06-23-007645.");
      }

      if (!Number.isInteger(yearsOperation) || yearsOperation < 0 || yearsOperation > 150) {
        validationErrors.push("Years of operation must be between 0 and 150.");
      }

      if (normalizedRepName.length < 2) {
        validationErrors.push("Representative full name is required.");
      }

      if (normalizedRepPosition.length < 2) {
        validationErrors.push("Representative position is required.");
      }

      if (!PH_PHONE_RE.test(normalizedRepPhone)) {
        validationErrors.push("Representative phone must use +639XXXXXXXXX or 09XXXXXXXXX.");
      }

      if (!SIGNUP_SERVICES.has(normalizedServicesOffered)) {
        validationErrors.push("Invalid service offered.");
      }

      if (!isValidClinicTime(normalizedOpeningTime) || !isValidClinicTime(normalizedClosingTime)) {
        validationErrors.push("Opening and closing time must be valid.");
      } else if (clinicTimeToMinutes(normalizedOpeningTime) >= clinicTimeToMinutes(normalizedClosingTime)) {
        validationErrors.push("Opening time must be before closing time.");
      }

      if (!hasValidOperatingDays(normalizedOperatingDays)) {
        validationErrors.push("Please choose valid operating days.");
      }

      if (!PASSWORD_RE.test(normalizedPassword)) {
        validationErrors.push("Password must be 8+ characters with uppercase, lowercase, number, and symbol.");
      }

      if (!emailVerificationToken) {
        validationErrors.push("Email verification is required.");
      }

      const clinicLicenseError = getUploadValidationError(clinicLicense, "Clinic license");
      if (clinicLicenseError) validationErrors.push(clinicLicenseError);

      const repValidIdError = getUploadValidationError(repValidId, "Representative valid ID");
      if (repValidIdError) validationErrors.push(repValidIdError);

      if (validationErrors.length > 0) {
        return res.status(400).json({
          message: validationErrors[0],
          errors: validationErrors,
        });
      }

      const [[locationCheck]] = await pool.query(
        `
        SELECT
          EXISTS(SELECT 1 FROM provinces WHERE id = ?) AS province_exists,
          EXISTS(SELECT 1 FROM municipalities WHERE id = ? AND province_id = ?) AS municipality_exists,
          EXISTS(SELECT 1 FROM barangays WHERE id = ? AND municipality_id = ?) AS barangay_exists
        `,
        [provinceId, municipalityId, provinceId, barangayId, municipalityId]
      );

      if (
        !locationCheck?.province_exists ||
        !locationCheck?.municipality_exists ||
        !locationCheck?.barangay_exists
      ) {
        return res.status(400).json({ message: "Selected clinic location is invalid." });
      }

      const [existingAccounts] = await findAccountByEmail(normalizedEmail);
      if (existingAccounts.length > 0) {
        return res.status(400).json({ message: "Email is already registered." });
      }

      const [existingClinics] = await pool.query(
        `
        SELECT id
        FROM clinics
        WHERE LOWER(clinic_name) = LOWER(?) OR license_number = ?
        LIMIT 1
        `,
        [normalizedClinicName, normalizedLicenseNumber]
      );

      if (existingClinics.length > 0) {
        return res.status(400).json({
          message: "A clinic with this name or license number is already registered.",
        });
      }

      await ensureEmailVerificationTokensTable();
      const [emailVerificationRows] = await pool.query(
        `
        SELECT id
        FROM email_verification_tokens
        WHERE email = ?
          AND purpose = 'clinic_signup_verification'
          AND token = ?
          AND expires_at > NOW()
        LIMIT 1
        `,
        [normalizedEmail, emailVerificationToken]
      );

      if (emailVerificationRows.length === 0) {
        return res.status(400).json({
          message: "Please verify the clinic email before submitting signup.",
        });
      }

      const password_hash = await bcrypt.hash(normalizedPassword, 10);

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
          normalizedClinicName,
          normalizedEmail,
          normalizedPhone,
          provinceId,
          municipalityId,
          barangayId,
          normalizedAddress,
          normalizedSpecialization,
          normalizedLicenseNumber,
          yearsOperation,
          normalizedRepName,
          normalizedRepPosition,
          normalizedRepPhone,
          normalizedServicesOffered,
          normalizedOpeningTime,
          normalizedClosingTime,
          normalizedOperatingDays,
          clinicLicense.filename,
          repValidId.filename,
          password_hash,
        ],
        (err) => {
          if (err) {
            console.error("CLINIC SIGNUP ERROR:", err);
            return res.status(500).json({ message: err.message });
          }

          pool
            .query("DELETE FROM email_verification_tokens WHERE id = ?", [
              emailVerificationRows[0].id,
            ])
            .catch((deleteErr) => {
              console.error("EMAIL VERIFICATION TOKEN DELETE ERROR:", deleteErr);
            });

          res.status(201).json({ message: "Clinic signup submitted for admin approval." });
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

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DAY_SUMMARY = {
  Monday: "mon",
  Tuesday: "tue",
  Wednesday: "wed",
  Thursday: "thu",
  Friday: "fri",
  Saturday: "sat",
  Sunday: "sun",
};

const ensureScheduleTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_weekly_schedules (
      id INT NOT NULL AUTO_INCREMENT,
      clinic_id INT NOT NULL,
      day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
      is_working TINYINT(1) NOT NULL DEFAULT 1,
      opening_time TIME DEFAULT NULL,
      closing_time TIME DEFAULT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY unique_clinic_day (clinic_id, day_of_week),
      CONSTRAINT fk_clinic_weekly_schedules_clinic
        FOREIGN KEY (clinic_id) REFERENCES clinics(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_blocked_dates (
      id INT NOT NULL AUTO_INCREMENT,
      clinic_id INT NOT NULL,
      blocked_date DATE NOT NULL,
      reason VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY unique_clinic_blocked_date (clinic_id, blocked_date),
      CONSTRAINT fk_clinic_blocked_dates_clinic
        FOREIGN KEY (clinic_id) REFERENCES clinics(id)
        ON DELETE CASCADE
    )
  `);
};

const toTimeInput = (value, fallback) => {
  const match = String(value || "").match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : fallback;
};

const isValidTime = (value) => {
  if (!/^\d{2}:\d{2}$/.test(String(value || ""))) return false;
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

const timeToMinutes = (value) => {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
};

const parseOperatingDays = (value) => {
  const raw = String(value || "").toLowerCase();

  if (/mon\s*-\s*fri|monday\s*-\s*friday|weekdays?/.test(raw)) {
    return new Set(DAYS.slice(0, 5));
  }

  if (/mon\s*-\s*sat|monday\s*-\s*saturday/.test(raw)) {
    return new Set(DAYS.slice(0, 6));
  }

  if (/daily|everyday|all days/.test(raw)) {
    return new Set(DAYS);
  }

  const normalized = raw.replace(/[^a-z]/g, " ");
  const detected = new Set();

  DAYS.forEach((day) => {
    const full = day.toLowerCase();
    const short = DAY_SUMMARY[day];

    if (
      new RegExp(`(^|\\s)${full}(\\s|$)`).test(normalized) ||
      new RegExp(`(^|\\s)${short}(\\s|$)`).test(normalized)
    ) {
      detected.add(day);
    }
  });

  return detected.size > 0 ? detected : new Set(DAYS.slice(0, 5));
};

const buildScheduleFromClinic = (clinic) => {
  const workingDays = parseOperatingDays(clinic.operating_days);
  const open = toTimeInput(clinic.opening_time, "08:00");
  const close = toTimeInput(clinic.closing_time, "17:00");

  return DAYS.map((day) => ({
    day,
    working: workingDays.has(day),
    open,
    close,
  }));
};

const normalizeSchedule = (items) => {
  if (!Array.isArray(items)) {
    throw new Error("Schedule must be an array.");
  }

  const byDay = new Map();

  items.forEach((item) => {
    if (!DAYS.includes(item.day)) {
      throw new Error("Invalid schedule day.");
    }

    const working = Boolean(item.working);
    const open = String(item.open || "").trim();
    const close = String(item.close || "").trim();

    if (working) {
      if (!isValidTime(open) || !isValidTime(close)) {
        throw new Error(`Invalid opening or closing time for ${item.day}.`);
      }

      if (timeToMinutes(open) >= timeToMinutes(close)) {
        throw new Error(`Opening time must be before closing time for ${item.day}.`);
      }
    }

    byDay.set(item.day, {
      day: item.day,
      working,
      open: isValidTime(open) ? open : "08:00",
      close: isValidTime(close) ? close : "17:00",
    });
  });

  return DAYS.map(
    (day) =>
      byDay.get(day) || {
        day,
        working: false,
        open: "08:00",
        close: "17:00",
      }
  );
};

const summarizeOperatingDays = (schedule) => {
  const workingDays = schedule.filter((item) => item.working).map((item) => item.day);

  if (workingDays.length === 7) return "daily";
  if (DAYS.slice(0, 5).every((day) => workingDays.includes(day)) && workingDays.length === 5) {
    return "mon-fri";
  }
  if (DAYS.slice(0, 6).every((day) => workingDays.includes(day)) && workingDays.length === 6) {
    return "mon-sat";
  }

  return workingDays.map((day) => DAY_SUMMARY[day]).join(",");
};

const toScheduleResponse = (rows) =>
  DAYS.map((day) => {
    const row = rows.find((item) => item.day_of_week === day || item.day === day);

    return {
      day,
      working: Boolean(row?.is_working ?? row?.working),
      open: toTimeInput(row?.opening_time ?? row?.open, "08:00"),
      close: toTimeInput(row?.closing_time ?? row?.close, "17:00"),
    };
  });

/* =================================================
   CLINIC SCHEDULE
   Final routes:
   GET    /api/clinic/schedule?clinic_id=1
   PUT    /api/clinic/schedule
   POST   /api/clinic/schedule/blocked-dates
   DELETE /api/clinic/schedule/blocked-dates/:id?clinic_id=1
================================================= */

router.get("/clinic/schedule", async (req, res) => {
  try {
    const clinicId = Number(req.query.clinic_id);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required." });
    }

    await ensureScheduleTables();

    const [[clinic]] = await pool.query(
      `
      SELECT id, opening_time, closing_time, operating_days
      FROM clinics
      WHERE id = ?
      `,
      [clinicId]
    );

    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found." });
    }

    let [scheduleRows] = await pool.query(
      `
      SELECT day_of_week, is_working, opening_time, closing_time
      FROM clinic_weekly_schedules
      WHERE clinic_id = ?
      ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
      `,
      [clinicId]
    );

    if (scheduleRows.length === 0) {
      const legacySchedule = buildScheduleFromClinic(clinic);

      for (const item of legacySchedule) {
        await pool.query(
          `
          INSERT INTO clinic_weekly_schedules
            (clinic_id, day_of_week, is_working, opening_time, closing_time)
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            clinicId,
            item.day,
            item.working ? 1 : 0,
            `${item.open}:00`,
            `${item.close}:00`,
          ]
        );
      }

      [scheduleRows] = await pool.query(
        `
        SELECT day_of_week, is_working, opening_time, closing_time
        FROM clinic_weekly_schedules
        WHERE clinic_id = ?
        ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
        `,
        [clinicId]
      );
    }

    const [blockedDates] = await pool.query(
      `
      SELECT
        id,
        DATE_FORMAT(blocked_date, '%Y-%m-%d') AS date,
        reason
      FROM clinic_blocked_dates
      WHERE clinic_id = ?
      ORDER BY blocked_date ASC
      `,
      [clinicId]
    );

    return res.json({
      clinicId,
      schedule: toScheduleResponse(scheduleRows),
      blockedDates,
    });
  } catch (err) {
    console.error("Load clinic schedule error:", err);
    return res.status(500).json({ message: "Failed to load clinic schedule." });
  }
});

router.put("/clinic/schedule", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const clinicId = Number(req.body.clinic_id);
    const schedule = normalizeSchedule(req.body.schedule);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required." });
    }

    await ensureScheduleTables();

    const [[clinic]] = await pool.query("SELECT id FROM clinics WHERE id = ?", [clinicId]);

    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found." });
    }

    const workingDays = schedule.filter((item) => item.working);
    const earliestOpen =
      workingDays.length > 0
        ? workingDays.reduce((min, item) =>
            timeToMinutes(item.open) < timeToMinutes(min) ? item.open : min
          , workingDays[0].open)
        : "00:00";
    const latestClose =
      workingDays.length > 0
        ? workingDays.reduce((max, item) =>
            timeToMinutes(item.close) > timeToMinutes(max) ? item.close : max
          , workingDays[0].close)
        : "00:00";

    await connection.beginTransaction();

    for (const item of schedule) {
      await connection.query(
        `
        INSERT INTO clinic_weekly_schedules
          (clinic_id, day_of_week, is_working, opening_time, closing_time)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          is_working = VALUES(is_working),
          opening_time = VALUES(opening_time),
          closing_time = VALUES(closing_time)
        `,
        [
          clinicId,
          item.day,
          item.working ? 1 : 0,
          `${item.open}:00`,
          `${item.close}:00`,
        ]
      );
    }

    await connection.query(
      `
      UPDATE clinics
      SET opening_time = ?, closing_time = ?, operating_days = ?
      WHERE id = ?
      `,
      [
        `${earliestOpen}:00`,
        `${latestClose}:00`,
        summarizeOperatingDays(schedule),
        clinicId,
      ]
    );

    await connection.commit();

    return res.json({
      message: "Clinic schedule updated.",
      schedule,
    });
  } catch (err) {
    await connection.rollback();

    const message =
      err instanceof Error ? err.message : "Failed to update clinic schedule.";

    console.error("Update clinic schedule error:", err);
    return res.status(400).json({ message });
  } finally {
    connection.release();
  }
});

router.post("/clinic/schedule/blocked-dates", async (req, res) => {
  try {
    const clinicId = Number(req.body.clinic_id);
    const date = String(req.body.date || "").trim();
    const reason = String(req.body.reason || "").trim() || "Blocked";

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required." });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "A valid blocked date is required." });
    }

    await ensureScheduleTables();

    const [result] = await pool.query(
      `
      INSERT INTO clinic_blocked_dates (clinic_id, blocked_date, reason)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        reason = VALUES(reason),
        id = LAST_INSERT_ID(id)
      `,
      [clinicId, date, reason]
    );

    return res.status(201).json({
      message: "Blocked date saved.",
      blockedDate: {
        id: result.insertId,
        date,
        reason,
      },
    });
  } catch (err) {
    console.error("Save blocked date error:", err);
    return res.status(500).json({ message: "Failed to save blocked date." });
  }
});

router.delete("/clinic/schedule/blocked-dates/:id", async (req, res) => {
  try {
    const clinicId = Number(req.query.clinic_id);
    const blockedDateId = Number(req.params.id);

    if (!clinicId || !blockedDateId) {
      return res.status(400).json({ message: "clinic_id and blocked date id are required." });
    }

    await ensureScheduleTables();

    const [result] = await pool.query(
      `
      DELETE FROM clinic_blocked_dates
      WHERE id = ? AND clinic_id = ?
      `,
      [blockedDateId, clinicId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Blocked date not found." });
    }

    return res.json({ message: "Blocked date removed." });
  } catch (err) {
    console.error("Remove blocked date error:", err);
    return res.status(500).json({ message: "Failed to remove blocked date." });
  }
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
