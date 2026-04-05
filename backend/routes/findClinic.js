const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.get("/", async (req, res) => {
  try {
    const { search = "", specialization = "", openNow = "" } = req.query;

    let sql = `
      SELECT
        id,
        clinic_name,
        email,
        phone,
        address,
        specialization,
        services_offered,
        opening_time,
        closing_time,
        operating_days,
        created_at,
        status,
        account_status,
        latitude,
        longitude
      FROM clinics
      WHERE status = 'approved'
    `;

    const params = [];

    if (search) {
      sql += `
        AND (
          clinic_name LIKE ?
          OR address LIKE ?
          OR specialization LIKE ?
          OR services_offered LIKE ?
        )
      `;
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    if (specialization && specialization !== "All") {
      sql += ` AND specialization = ? `;
      params.push(specialization);
    }

    if (openNow === "true") {
      sql += ` AND CURTIME() BETWEEN opening_time AND closing_time `;
    }

    sql += ` ORDER BY created_at DESC `;

    const [rows] = await pool.query(sql, params);

    res.json(rows);
  } catch (error) {
    console.error("Find clinic error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;