const express = require("express");
const pool = require("../db/pool"); // <-- change if your db file name is different

const router = express.Router();

// ✅ GET /api/admin/reports/summary
router.get("/summary", async (req, res) => {
  try {
    // total appointments this month
    const [[apptMonth]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM appointments
      WHERE start_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND start_at <  DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
    `);

    // most active clinic (last 30 days)
    const [[topClinic]] = await pool.query(`
      SELECT c.clinic_name, COUNT(a.id) AS total
      FROM appointments a
      JOIN clinics c ON c.id = a.clinic_id
      WHERE a.start_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY a.clinic_id
      ORDER BY total DESC
      LIMIT 1
    `);

    // new users this week
    const [[newUsers]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    res.json({
      totalAppointmentsThisMonth: apptMonth.total || 0,
      mostActiveClinic: topClinic?.clinic_name || "—",
      newUsersThisWeek: newUsers.total || 0,
    });
  } catch (err) {
    console.error("Reports summary error:", err);
    res.status(500).json({ message: "Failed to load report summary" });
  }
});

module.exports = router;