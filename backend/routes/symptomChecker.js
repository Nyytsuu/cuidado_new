const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.post("/", async (req, res) => {
  try {
    const { userId = null, selectedSymptoms } = req.body;

    if (!Array.isArray(selectedSymptoms) || selectedSymptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "selectedSymptoms is required",
      });
    }

    const cleanedSymptoms = selectedSymptoms
      .map((item) => String(item).trim())
      .filter(Boolean);

    if (cleanedSymptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter at least one symptom",
      });
    }

    const symptomPlaceholders = cleanedSymptoms.map(() => "?").join(",");

    const [matchedSymptoms] = await pool.query(
      `
      SELECT symptom_id, symptom_name, is_red_flag
      FROM symptoms
      WHERE LOWER(symptom_name) IN (${symptomPlaceholders})
      `,
      cleanedSymptoms.map((symptom) => symptom.toLowerCase())
    );

    const matchedSymptomIds = matchedSymptoms.map((row) => row.symptom_id);

    let possibleConditions = [];
    let adviceLevel = "self-care";

    if (matchedSymptomIds.length > 0) {
      const conditionPlaceholders = matchedSymptomIds.map(() => "?").join(",");

      const [conditionRows] = await pool.query(
        `
        SELECT
          c.condition_id,
          c.condition_name,
          c.advice_level,
          COUNT(*) AS matched_count
        FROM condition_symptoms cs
        INNER JOIN conditions c ON c.condition_id = cs.condition_id
        WHERE cs.symptom_id IN (${conditionPlaceholders})
        GROUP BY c.condition_id, c.condition_name, c.advice_level
        ORDER BY matched_count DESC, c.condition_name ASC
        `,
        matchedSymptomIds
      );

      possibleConditions = conditionRows.map((row) => row.condition_name);

      if (conditionRows.some((row) => row.advice_level === "urgent")) {
        adviceLevel = "urgent";
      } else if (conditionRows.some((row) => row.advice_level === "consult")) {
        adviceLevel = "consult";
      }
    }

    const hasRedFlag = matchedSymptoms.some(
      (row) => Number(row.is_red_flag) === 1
    );

    if (hasRedFlag) {
      adviceLevel = "urgent";
    }

    const [insertResult] = await pool.query(
      `
      INSERT INTO symptom_checker_logs
      (user_id, selected_symptoms, possible_conditions, advice_level)
      VALUES (?, ?, ?, ?)
      `,
      [
        userId,
        JSON.stringify(cleanedSymptoms),
        JSON.stringify(possibleConditions),
        adviceLevel,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Symptom check completed",
      data: {
        logId: insertResult.insertId,
        selectedSymptoms: cleanedSymptoms,
        matchedSymptoms: matchedSymptoms.map((row) => row.symptom_name),
        possibleConditions,
        adviceLevel,
      },
    });
  } catch (error) {
    console.error("Symptom checker error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while checking symptoms",
    });
  }
});

module.exports = router;