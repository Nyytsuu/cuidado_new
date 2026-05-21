// backend/routes/admin.symptoms.routes.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

const ensureSymptomAdminColumns = async () => {
  const [columns] = await pool.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'symptoms'
      AND COLUMN_NAME IN ('description', 'body_system_id')
    `
  );

  const existing = new Set(columns.map((column) => column.COLUMN_NAME));

  if (!existing.has("description")) {
    await pool.query(`
      ALTER TABLE symptoms
      ADD COLUMN description TEXT NULL
    `);
  }

  if (!existing.has("body_system_id")) {
    await pool.query(`
      ALTER TABLE symptoms
      ADD COLUMN body_system_id INT NULL
    `);
  }
};

const normalizeBodySystemId = (value) => {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
};

router.get("/", async (req, res) => {
  try {
    await ensureSymptomAdminColumns();

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
    console.error("Fetch symptoms error:", err);
    res.status(500).json({ message: "Failed to fetch symptoms" });
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
    console.error("Fetch body systems for symptoms error:", err);
    res.status(500).json({ message: "Failed to fetch body systems" });
  }
});

router.post("/", async (req, res) => {
  try {
    await ensureSymptomAdminColumns();

    const { symptom_name, description, category, body_system_id, is_red_flag } = req.body;

    if (!symptom_name) {
      return res.status(400).json({ message: "Symptom name is required" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO symptoms
        (symptom_name, description, category, body_system_id, is_red_flag)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        symptom_name.trim(),
        description?.trim() || null,
        category || null,
        normalizeBodySystemId(body_system_id),
        is_red_flag ? 1 : 0,
      ]
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
    await ensureSymptomAdminColumns();

    const { id } = req.params;
    const { symptom_name, description, category, body_system_id, is_red_flag } = req.body;

    const [result] = await pool.query(
      `
      UPDATE symptoms
      SET
        symptom_name = ?,
        description = ?,
        category = ?,
        body_system_id = ?,
        is_red_flag = ?
      WHERE symptom_id = ?
      `,
      [
        symptom_name?.trim() || "",
        description?.trim() || null,
        category || null,
        normalizeBodySystemId(body_system_id),
        is_red_flag ? 1 : 0,
        id,
      ]
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
