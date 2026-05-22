return (
  <div style={{ padding: 40, fontSize: 30, color: "red" }}>
    CLINIC DASHBOARD TEST
  </div>
);
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

const getClinicId = (req) => {
  return Number(req.query.clinic_id || req.body?.clinic_id || req.user?.clinic_id || req.user?.id);
};

/**
 * GET /api/clinic/dashboard/metrics?clinic_id=1
 */
router.get("/metrics", async (req, res) => {
  try {
    const clinicId = getClinicId(req);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required." });
    }

    const [todayAppointmentsRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM appointments
      WHERE clinic_id = ?
        AND start_at::date = CURRENT_DATE
      `,
      [clinicId]
    );

    const [pendingRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM appointments
      WHERE clinic_id = ?
        AND status = 'pending'
      `,
      [clinicId]
    );

    const [completedRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM appointments
      WHERE clinic_id = ?
        AND status = 'completed'
        AND start_at >= date_trunc('week', CURRENT_DATE)
        AND start_at < date_trunc('week', CURRENT_DATE) + interval '7 days'
      `,
      [clinicId]
    );

    const [patientsRows] = await pool.query(
      `
      SELECT COUNT(DISTINCT user_id) AS total
      FROM appointments
      WHERE clinic_id = ?
      `,
      [clinicId]
    );

    return res.json({
      totalPatients: Number(patientsRows[0]?.total || 0),
      totalAppointments: Number(todayAppointmentsRows[0]?.total || 0),
      pendingAppointments: Number(pendingRows[0]?.total || 0),
      completedAppointments: Number(completedRows[0]?.total || 0),
    });
  } catch (error) {
    console.error("metrics error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
      code: error.code || null,
    });
  }
});

/**
 * GET /api/clinic/dashboard/appointments?clinic_id=1
 */
router.get("/appointments", async (req, res) => {
  try {
    const clinicId = getClinicId(req);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required." });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        a.id,
        a.patient_name_snapshot AS patient,
        COALESCE(
          STRING_AGG(DISTINCT aps.service_name_snapshot, ', '),
          a.purpose,
          'Consultation'
        ) AS service,
        TO_CHAR(a.start_at, 'YYYY-MM-DD HH24:MI:SS') AS schedule,
        a.status
      FROM appointments a
      LEFT JOIN appointment_services aps 
        ON aps.appointment_id = a.id
      WHERE a.clinic_id = ?
        AND a.start_at::date = CURRENT_DATE
      GROUP BY a.id, a.patient_name_snapshot, a.purpose, a.start_at, a.status
      ORDER BY a.start_at ASC
      LIMIT 10
      `,
      [clinicId]
    );

    res.json(rows);
  } catch (error) {
    console.error("appointments error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
      code: error.code || null,
    });
  }
});

/**
 * GET /api/clinic/dashboard/patients?clinic_id=1
 */
router.get("/patients", async (req, res) => {
  try {
    const clinicId = getClinicId(req);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required." });
    }

    const [rows] = await pool.query(
      `
      SELECT
        MIN(a.id) AS id,
        a.patient_name_snapshot AS full_name,
        '' AS email,
        a.patient_phone_snapshot AS phone,
        TO_CHAR(MIN(a.created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at
      FROM appointments a
      WHERE a.clinic_id = ?
        AND a.patient_name_snapshot IS NOT NULL
        AND a.patient_name_snapshot <> ''
      GROUP BY a.user_id, a.patient_name_snapshot, a.patient_phone_snapshot
      ORDER BY MIN(a.created_at) DESC
      LIMIT 10
      `,
      [clinicId]
    );

    res.json(rows);
  } catch (error) {
    console.error("patients error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
      code: error.code || null,
    });
  }
});

/**
 * GET /api/clinic/dashboard/activities?clinic_id=1
 */
router.get("/activities", async (req, res) => {
  try {
    const clinicId = getClinicId(req);

    if (!clinicId) {
      return res.status(400).json({ message: "clinic_id is required." });
    }

    const [rows] = await pool.query(
      `
      SELECT
        ash.id,
        CASE
          WHEN ash.new_status = 'completed' THEN 'completed'
          WHEN ash.new_status = 'cancelled' THEN 'cancelled'
          ELSE 'appointment'
        END AS type,
        CONCAT(
          COALESCE(a.patient_name_snapshot, 'Patient'),
          ' appointment changed from ',
          COALESCE(ash.old_status, 'none'),
          ' to ',
          ash.new_status
        ) AS text,
        TO_CHAR(ash.changed_at, 'YYYY-MM-DD HH24:MI:SS') AS time
      FROM appointment_status_history ash
      INNER JOIN appointments a ON a.id = ash.appointment_id
      WHERE a.clinic_id = ?
      ORDER BY ash.changed_at DESC
      LIMIT 10
      `,
      [clinicId]
    );

    res.json(rows);
  } catch (error) {
    console.error("activities error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
      code: error.code || null,
    });
  }
});

module.exports = router;