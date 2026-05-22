const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

const ensureClinicFeedbackTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_feedback (
      id SERIAL PRIMARY KEY,
      appointment_id INTEGER NOT NULL,
      clinic_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      feedback TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_feedback_appointment_user UNIQUE (appointment_id, user_id)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_clinic_feedback_clinic
    ON clinic_feedback (clinic_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_clinic_feedback_user
    ON clinic_feedback (user_id)
  `);
};

router.post("/", async (req, res) => {
  try {
    await ensureClinicFeedbackTable();

    const appointmentId = Number(req.body.appointment_id);
    const userId = Number(req.body.user_id);
    const clinicId = Number(req.body.clinic_id);
    const rating = Number(req.body.rating);
    const feedback = String(req.body.feedback || "").trim();

    if (!appointmentId || !userId || !clinicId) {
      return res.status(400).json({
        message: "appointment_id, user_id, and clinic_id are required.",
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5.",
      });
    }

    const [[appointment]] = await pool.query(
      `
      SELECT id, user_id, clinic_id, status
      FROM appointments
      WHERE id = ?
      LIMIT 1
      `,
      [appointmentId]
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (
      Number(appointment.user_id) !== userId ||
      Number(appointment.clinic_id) !== clinicId
    ) {
      return res.status(403).json({
        message: "This appointment does not match the selected user or clinic.",
      });
    }

    if (String(appointment.status).toLowerCase() !== "completed") {
      return res.status(400).json({
        message: "You can rate a clinic after the appointment is completed.",
      });
    }

    const [existingFeedback] = await pool.query(
      `
      SELECT id
      FROM clinic_feedback
      WHERE appointment_id = ? AND user_id = ?
      LIMIT 1
      `,
      [appointmentId, userId]
    );

    if (existingFeedback.length > 0) {
      return res.status(409).json({
        message: "You already rated this clinic for this appointment.",
      });
    }

    const [insertResult] = await pool.query(
      `
      INSERT INTO clinic_feedback
        (appointment_id, clinic_id, user_id, rating, feedback, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      RETURNING id
      `,
      [appointmentId, clinicId, userId, rating, feedback || null]
    );

    return res.json({
      message: "Clinic feedback saved.",
      feedback_id: insertResult?.[0]?.id || null,
    });
  } catch (err) {
    console.error("Save clinic feedback error:", err);
    return res.status(500).json({
      message: "Failed to save clinic feedback.",
      error: err.message,
      code: err.code || null,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    await ensureClinicFeedbackTable();

    const clinicId = Number(req.query.clinic_id);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required." });
    }

    const [[summary]] = await pool.query(
      `
      SELECT
        ROUND(AVG(rating)::numeric, 1) AS average_rating,
        COUNT(*) AS rating_count
      FROM clinic_feedback
      WHERE clinic_id = ?
      `,
      [clinicId]
    );

    const [reviews] = await pool.query(
      `
      SELECT
        cf.id,
        cf.appointment_id,
        cf.clinic_id,
        cf.user_id,
        cf.rating,
        cf.feedback,
        TO_CHAR(cf.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
        TO_CHAR(cf.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at,
        COALESCE(u.full_name, 'Cuidado user') AS reviewer_name
      FROM clinic_feedback cf
      LEFT JOIN users u ON u.id = cf.user_id
      WHERE cf.clinic_id = ?
      ORDER BY cf.updated_at DESC, cf.id DESC
      LIMIT 30
      `,
      [clinicId]
    );

    return res.json({
      average_rating: summary?.average_rating
        ? Number(summary.average_rating)
        : null,
      rating_count: summary?.rating_count
        ? Number(summary.rating_count)
        : 0,
      reviews,
    });
  } catch (err) {
    console.error("Load clinic feedback error:", err);
    return res.status(500).json({
      message: "Failed to load clinic feedback.",
      error: err.message,
      code: err.code || null,
    });
  }
});

module.exports = router;