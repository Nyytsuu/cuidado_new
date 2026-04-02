const express = require("express");
const router = express.Router();
const pool = require("../db");

// Example auth middleware assumption:
// req.user = { id: 5, clinic_id: 5, role: "clinic" }

/**
 * GET /api/clinic/dashboard/metrics
 */
router.get("/metrics", async (req, res) => {
  try {
    const clinicId = req.user?.clinic_id || req.user?.id;

    if (!clinicId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // today's appointments
    const [todayAppointmentsRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM appointments
      WHERE clinic_id = ?
        AND DATE(start_at) = CURDATE()
      `,
      [clinicId]
    );

    // pending appointments
    const [pendingRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM appointments
      WHERE clinic_id = ?
        AND status = 'pending'
      `,
      [clinicId]
    );

    // completed appointments this week
    const [completedRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM appointments
      WHERE clinic_id = ?
        AND status = 'completed'
        AND YEARWEEK(start_at, 1) = YEARWEEK(CURDATE(), 1)
      `,
      [clinicId]
    );

    // total distinct patients of this clinic
    const [patientsRows] = await pool.query(
      `
      SELECT COUNT(DISTINCT user_id) AS total
      FROM appointments
      WHERE clinic_id = ?
      `,
      [clinicId]
    );

    return res.json({
      totalPatients: patientsRows[0]?.total || 0,
      totalAppointments: todayAppointmentsRows[0]?.total || 0,
      pendingAppointments: pendingRows[0]?.total || 0,
      completedAppointments: completedRows[0]?.total || 0,
    });
  } catch (error) {
    console.error("metrics error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/clinic/dashboard/appointments
 * Returns today's appointments first, newest/nearest first
 */
router.get("/appointments", async (req, res) => {
  try {
    const clinicId = req.user?.clinic_id || req.user?.id;

    if (!clinicId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        a.id,
        a.patient_name_snapshot AS patient,
        COALESCE(
          GROUP_CONCAT(DISTINCT aps.service_name_snapshot SEPARATOR ', '),
          a.purpose
        ) AS service,
        a.start_at AS schedule,
        a.status
      FROM appointments a
      LEFT JOIN appointment_services aps 
        ON aps.appointment_id = a.id
      WHERE a.clinic_id = ?
        AND DATE(a.start_at) = CURDATE()
      GROUP BY a.id, a.patient_name_snapshot, a.purpose, a.start_at, a.status
      ORDER BY a.start_at ASC
      LIMIT 10
      `,
      [clinicId]
    );

    res.json(rows);
  } catch (error) {
    console.error("appointments error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/clinic/dashboard/patients
 * Since you only shared clinic + appointments tables,
 * this gets patients from appointment snapshots.
 */
router.get("/patients", async (req, res) => {
  try {
    const clinicId = req.user?.clinic_id || req.user?.id;

    if (!clinicId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        MIN(a.id) AS id,
        a.patient_name_snapshot AS full_name,
        '' AS email,
        a.patient_phone_snapshot AS phone,
        MIN(a.created_at) AS created_at
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
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/clinic/dashboard/activities
 * Uses appointment_status_history for timeline activity
 */
router.get("/activities", async (req, res) => {
  try {
    const clinicId = req.user?.clinic_id || req.user?.id;

    if (!clinicId) {
      return res.status(401).json({ message: "Unauthorized" });
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
        ash.changed_at AS time
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
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;