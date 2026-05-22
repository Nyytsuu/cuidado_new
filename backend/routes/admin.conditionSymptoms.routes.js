const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

const ensureHealthLinkColumns = async () => {
  const [symptomColumns] = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'symptoms'
      AND column_name IN ('description', 'body_system_id')
    `
  );

  const existingSymptoms = new Set(
    symptomColumns.map((column) => column.column_name)
  );

  if (!existingSymptoms.has("description")) {
    await pool.query(`
      ALTER TABLE symptoms
      ADD COLUMN description TEXT NULL
    `);
  }

  if (!existingSymptoms.has("body_system_id")) {
    await pool.query(`
      ALTER TABLE symptoms
      ADD COLUMN body_system_id INT NULL
    `);
  }

  const [conditionColumns] = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'conditions'
      AND column_name = 'body_system_id'
    LIMIT 1
    `
  );

  if (conditionColumns.length === 0) {
    await pool.query(`
      ALTER TABLE conditions
      ADD COLUMN body_system_id INT NULL
    `);
  }
};

/* GET all conditions for dropdown */
router.get("/conditions", async (req, res) => {
  try {
    await ensureHealthLinkColumns();

    const [rows] = await pool.query(`
      SELECT
        c.condition_id,
        c.condition_name,
        c.body_system_id,
        bs.name AS body_system_name
      FROM conditions c
      LEFT JOIN body_systems bs
        ON bs.id = c.body_system_id
      ORDER BY c.condition_name ASC
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
    await ensureHealthLinkColumns();

    const [rows] = await pool.query(`
      SELECT
        s.symptom_id,
        s.symptom_name,
        s.description,
        s.category,
        s.body_system_id,
        bs.name AS body_system_name,
        s.is_red_flag
      FROM symptoms s
      LEFT JOIN body_systems bs
        ON bs.id = s.body_system_id
      ORDER BY s.symptom_name ASC
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
