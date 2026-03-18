// backend/routes/admin.symptoms.routes.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT symptom_id, symptom_name, category, is_red_flag
      FROM symptoms
      ORDER BY symptom_name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Fetch symptoms error:", err);
    res.status(500).json({ message: "Failed to fetch symptoms" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { symptom_name, category, is_red_flag } = req.body;

    if (!symptom_name) {
      return res.status(400).json({ message: "Symptom name is required" });
    }

    const [result] = await pool.query(
      `INSERT INTO symptoms (symptom_name, category, is_red_flag) VALUES (?, ?, ?)`,
      [symptom_name, category || null, is_red_flag || false]
    );

    res.status(201).json({
      message: "Symptom created",
      symptom_id: result.insertId,
    });
  } catch (err) {
    console.error("Create symptom error:", err);
    res.status(500).json({ message: "Failed to create symptom" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { symptom_name, category, is_red_flag } = req.body;

    const [result] = await pool.query(
      `UPDATE symptoms SET symptom_name = ?, category = ?, is_red_flag = ? WHERE symptom_id = ?`,
      [symptom_name, category || null, is_red_flag, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Symptom not found" });
    }

    res.json({ message: "Symptom updated" });
  } catch (err) {
    console.error("Update symptom error:", err);
    res.status(500).json({ message: "Failed to update symptom" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `DELETE FROM symptoms WHERE symptom_id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Symptom not found" });
    }

    res.json({ message: "Symptom deleted" });
  } catch (err) {
    console.error("Delete symptom error:", err);
    res.status(500).json({ message: "Failed to delete symptom" });
  }
});

module.exports = router;