const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

/* GET all conditions for dropdown */
router.get("/conditions", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT condition_id, condition_name
      FROM conditions
      ORDER BY condition_name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Fetch conditions for mapping error:", err);
    res.status(500).json({ message: "Failed to fetch conditions", error: err.message });
  }
});

/* GET all symptoms for checkbox list */
router.get("/symptoms", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT symptom_id, symptom_name, category, is_red_flag
      FROM symptoms
      ORDER BY symptom_name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Fetch symptoms for mapping error:", err);
    res.status(500).json({ message: "Failed to fetch symptoms", error: err.message });
  }
});

/* GET mapped symptoms for one condition */
router.get("/:conditionId", async (req, res) => {
  try {
    const { conditionId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        cs.id,
        cs.condition_id,
        cs.symptom_id,
        cs.weight,
        cs.required_symptom
      FROM condition_symptoms cs
      WHERE cs.condition_id = ?
      `,
      [conditionId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Fetch condition symptoms error:", err);
    res.status(500).json({ message: "Failed to fetch condition symptoms", error: err.message });
  }
});

/* SAVE mapped symptoms for one condition
   This replaces existing mappings for that condition */
router.post("/:conditionId", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { conditionId } = req.params;
    const { symptoms } = req.body;

    if (!Array.isArray(symptoms)) {
      return res.status(400).json({ message: "Symptoms must be an array." });
    }

    await connection.beginTransaction();

    await connection.query(
      `DELETE FROM condition_symptoms WHERE condition_id = ?`,
      [conditionId]
    );

    for (const item of symptoms) {
      await connection.query(
        `
        INSERT INTO condition_symptoms
          (condition_id, symptom_id, weight, required_symptom)
        VALUES (?, ?, ?, ?)
        `,
        [
          conditionId,
          item.symptom_id,
          item.weight ?? 1,
          item.required_symptom ? 1 : 0,
        ]
      );
    }

    await connection.commit();

    res.json({ message: "Condition symptoms saved successfully." });
  } catch (err) {
    await connection.rollback();
    console.error("Save condition symptoms error:", err);
    res.status(500).json({ message: "Failed to save condition symptoms", error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;