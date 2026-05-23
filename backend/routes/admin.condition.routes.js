const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { verifyToken, requireRole } = require("../middleware/auth");

router.use(verifyToken, requireRole("admin"));

const ensureConditionBodySystemColumn = async () => {
  const [columns] = await pool.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'conditions'
      AND COLUMN_NAME = 'body_system_id'
    LIMIT 1
    `
  );

  if (columns.length === 0) {
    await pool.query(`
      ALTER TABLE conditions
      ADD COLUMN body_system_id INT NULL
    `);
  }
};

const normalizeBodySystemId = (value) => {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
};

/* GET all conditions */
router.get("/", async (req, res) => {
  try {
    await ensureConditionBodySystemColumn();

    const [rows] = await pool.query(`
      SELECT
        c.condition_id,
        c.condition_name,
        c.description,
        c.advice_level,
        c.when_to_seek_help,
        c.disclaimer,
        c.body_system_id,
        bs.name AS body_system_name,
        COUNT(cs.symptom_id) AS symptoms_count
      FROM conditions c
      LEFT JOIN body_systems bs
        ON bs.id = c.body_system_id
      LEFT JOIN condition_symptoms cs
        ON c.condition_id = cs.condition_id
      GROUP BY
        c.condition_id,
        c.condition_name,
        c.description,
        c.advice_level,
        c.when_to_seek_help,
        c.disclaimer,
        c.body_system_id,
        bs.name
      ORDER BY c.condition_name ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Fetch conditions error:", err);
    res.status(500).json({
      message: "Failed to fetch conditions",
      error: err.message,
    });
  }
});


router.get("/body-systems/options", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, slug, icon
      FROM body_systems
      WHERE COALESCE(is_active, 1) = 1
      ORDER BY sort_order ASC, name ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Fetch body systems for conditions error:", err);
    res.status(500).json({ message: "Failed to fetch body systems" });
  }
});

/* GET one condition */
router.get("/:id", async (req, res) => {
  try {
    await ensureConditionBodySystemColumn();

    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        condition_id,
        condition_name,
        description,
        advice_level,
        when_to_seek_help,
        disclaimer,
        body_system_id
      FROM conditions
      WHERE condition_id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Condition not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Fetch condition error:", err);
    res.status(500).json({ message: "Failed to fetch condition", error: err.message });
  }
});

/* CREATE condition */
router.post("/", async (req, res) => {
  try {
    await ensureConditionBodySystemColumn();

    const {
      condition_name,
      description,
      advice_level,
      when_to_seek_help,
      disclaimer,
      body_system_id,
    } = req.body;

    if (!condition_name || !description || !advice_level) {
      return res.status(400).json({
        message: "Condition name, description, and advice level are required.",
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO conditions
        (condition_name, description, advice_level, when_to_seek_help, disclaimer, body_system_id)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        condition_name.trim(),
        description.trim(),
        advice_level,
        when_to_seek_help || null,
        disclaimer || null,
        normalizeBodySystemId(body_system_id),
      ]
    );

    res.status(201).json({
      message: "Condition created successfully",
      condition_id: result.insertId,
    });
  } catch (err) {
    console.error("Create condition error:", err);
    res.status(500).json({ message: "Failed to create condition", error: err.message });
  }
});

/* UPDATE condition */
router.put("/:id", async (req, res) => {
  try {
    await ensureConditionBodySystemColumn();

    const { id } = req.params;
    const {
      condition_name,
      description,
      advice_level,
      when_to_seek_help,
      disclaimer,
      body_system_id,
    } = req.body;

    if (!condition_name || !description || !advice_level) {
      return res.status(400).json({
        message: "Condition name, description, and advice level are required.",
      });
    }

    const [result] = await pool.query(
      `
      UPDATE conditions
      SET
        condition_name = ?,
        description = ?,
        advice_level = ?,
        when_to_seek_help = ?,
        disclaimer = ?,
        body_system_id = ?
      WHERE condition_id = ?
      `,
      [
        condition_name.trim(),
        description.trim(),
        advice_level,
        when_to_seek_help || null,
        disclaimer || null,
        normalizeBodySystemId(body_system_id),
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Condition not found" });
    }

    res.json({ message: "Condition updated successfully" });
  } catch (err) {
    console.error("Update condition error:", err);
    res.status(500).json({ message: "Failed to update condition", error: err.message });
  }
});

/* DELETE condition */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `DELETE FROM conditions WHERE condition_id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Condition not found" });
    }

    res.json({ message: "Condition deleted successfully" });
  } catch (err) {
    console.error("Delete condition error:", err);
    res.status(500).json({ message: "Failed to delete condition", error: err.message });
  }
});

module.exports = router;
