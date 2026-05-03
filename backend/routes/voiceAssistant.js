const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

const ADVICE_TO_URGENCY = {
  "self-care": "low",
  consult: "medium",
  urgent: "high",
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const includesPhrase = (text, phrase) => {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return false;

  const escaped = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i").test(text);
};

const compactText = (value) => normalizeText(value).replace(/\s/g, "");

const matchesConditionName = (text, conditionName) => {
  const normalizedCondition = normalizeText(conditionName);
  if (!normalizedCondition) return false;

  return (
    includesPhrase(text, normalizedCondition) ||
    compactText(text).includes(compactText(normalizedCondition))
  );
};

const getAdvice = (adviceLevel, topCondition) => {
  if (adviceLevel === "urgent") {
    return (
      topCondition?.when_to_seek_help ||
      "Seek urgent medical attention immediately."
    );
  }

  if (adviceLevel === "consult") {
    return (
      topCondition?.when_to_seek_help ||
      "Schedule a consultation with a healthcare professional."
    );
  }

  return (
    topCondition?.when_to_seek_help ||
    "Monitor your symptoms, rest, and consult a healthcare professional if symptoms persist or worsen."
  );
};

router.post("/analyze", async (req, res) => {
  try {
    const { transcript, userId = null } = req.body;
    const cleanTranscript = String(transcript || "").trim();

    if (!cleanTranscript) {
      return res.status(400).json({
        success: false,
        message: "Transcript is required.",
      });
    }

    const normalizedTranscript = normalizeText(cleanTranscript);

    const [symptomRows] = await pool.query(`
      SELECT symptom_id, symptom_name, is_red_flag
      FROM symptoms
      ORDER BY CHAR_LENGTH(symptom_name) DESC, symptom_name ASC
    `);

    const [conditionNameRows] = await pool.query(`
      SELECT
        c.condition_id,
        c.condition_name,
        c.advice_level,
        c.when_to_seek_help,
        COALESCE(SUM(cs.weight), 0) AS total_weight,
        GROUP_CONCAT(
          DISTINCT s.symptom_name
          ORDER BY cs.required_symptom DESC, cs.weight DESC, s.symptom_name ASC
          SEPARATOR '||'
        ) AS mapped_symptoms,
        MAX(COALESCE(s.is_red_flag, 0)) AS has_red_flag
      FROM conditions c
      LEFT JOIN condition_symptoms cs
        ON cs.condition_id = c.condition_id
      LEFT JOIN symptoms s
        ON s.symptom_id = cs.symptom_id
      GROUP BY
        c.condition_id,
        c.condition_name,
        c.advice_level,
        c.when_to_seek_help
      ORDER BY CHAR_LENGTH(c.condition_name) DESC, c.condition_name ASC
    `);

    const matchedSymptoms = symptomRows.filter((symptom) =>
      includesPhrase(normalizedTranscript, symptom.symptom_name)
    );
    const recognizedConditions = conditionNameRows.filter((condition) =>
      matchesConditionName(normalizedTranscript, condition.condition_name)
    );

    const matchedSymptomIds = matchedSymptoms.map((symptom) => symptom.symptom_id);
    const matchedSymptomNames = matchedSymptoms.map(
      (symptom) => symptom.symptom_name
    );

    let possibleConditions = [];
    let adviceLevel = "self-care";

    if (recognizedConditions.length > 0) {
      possibleConditions = recognizedConditions.map((condition) => ({
        name: condition.condition_name,
        score: 1,
        matchedSymptoms: condition.mapped_symptoms
          ? String(condition.mapped_symptoms).split("||")
          : [],
        adviceLevel: condition.advice_level,
        when_to_seek_help: condition.when_to_seek_help,
        recognizedByName: true,
        hasRedFlagSymptom: Number(condition.has_red_flag) === 1,
      }));

      if (recognizedConditions.some((condition) => condition.advice_level === "urgent")) {
        adviceLevel = "urgent";
      } else if (
        recognizedConditions.some((condition) => condition.advice_level === "consult")
      ) {
        adviceLevel = "consult";
      }
    }

    if (matchedSymptomIds.length > 0) {
      const placeholders = matchedSymptomIds.map(() => "?").join(",");

      const [conditionRows] = await pool.query(
        `
        SELECT
          c.condition_id,
          c.condition_name,
          c.advice_level,
          c.when_to_seek_help,
          COALESCE(SUM(cs.weight), 0) AS matched_weight,
          COUNT(cs.symptom_id) AS matched_count,
          totals.total_weight,
          GROUP_CONCAT(s.symptom_name ORDER BY s.symptom_name SEPARATOR '||') AS matched_symptoms
        FROM condition_symptoms cs
        INNER JOIN conditions c
          ON c.condition_id = cs.condition_id
        INNER JOIN symptoms s
          ON s.symptom_id = cs.symptom_id
        INNER JOIN (
          SELECT condition_id, COALESCE(SUM(weight), 0) AS total_weight
          FROM condition_symptoms
          GROUP BY condition_id
        ) totals
          ON totals.condition_id = c.condition_id
        WHERE cs.symptom_id IN (${placeholders})
        GROUP BY
          c.condition_id,
          c.condition_name,
          c.advice_level,
          c.when_to_seek_help,
          totals.total_weight
        ORDER BY matched_weight DESC, matched_count DESC, c.condition_name ASC
        `,
        matchedSymptomIds
      );

      const symptomMatchedConditions = conditionRows.map((condition) => ({
        name: condition.condition_name,
        score:
          Number(condition.total_weight) > 0
            ? Number(condition.matched_weight) / Number(condition.total_weight)
            : 0,
        matchedSymptoms: condition.matched_symptoms
          ? String(condition.matched_symptoms).split("||")
          : [],
        adviceLevel: condition.advice_level,
        when_to_seek_help: condition.when_to_seek_help,
      }));

      const existingConditionNames = new Set(
        possibleConditions.map((condition) => normalizeText(condition.name))
      );

      possibleConditions = [
        ...possibleConditions,
        ...symptomMatchedConditions.filter(
          (condition) => !existingConditionNames.has(normalizeText(condition.name))
        ),
      ].sort(
        (a, b) =>
          Number(b.score) - Number(a.score) ||
          String(a.name).localeCompare(String(b.name))
      );

      if (conditionRows.some((condition) => condition.advice_level === "urgent")) {
        adviceLevel = "urgent";
      } else if (
        conditionRows.some((condition) => condition.advice_level === "consult")
      ) {
        adviceLevel = "consult";
      }
    }

    const emergency =
      matchedSymptoms.some((symptom) => Number(symptom.is_red_flag) === 1) ||
      possibleConditions.some((condition) => condition.hasRedFlagSymptom);

    if (emergency) {
      adviceLevel = "urgent";
    }

    const [insertResult] = await pool.query(
      `
      INSERT INTO symptom_checker_logs
        (user_id, selected_symptoms, possible_conditions, advice_level)
      VALUES (?, ?, ?, ?)
      `,
      [
        userId ? Number(userId) : null,
        JSON.stringify(matchedSymptomNames),
        JSON.stringify(possibleConditions.map((condition) => condition.name)),
        adviceLevel,
      ]
    );

    const topCondition = possibleConditions[0];

    return res.status(201).json({
      success: true,
      message: "Voice symptom analysis completed.",
      data: {
        logId: insertResult.insertId,
        transcript: cleanTranscript,
        symptoms: matchedSymptomNames,
        recognized_conditions: recognizedConditions.map(
          (condition) => condition.condition_name
        ),
        possible_conditions: possibleConditions.map((condition) => ({
          name: condition.name,
          score: condition.score,
          matchedSymptoms: condition.matchedSymptoms,
          recognizedByName: Boolean(condition.recognizedByName),
        })),
        adviceLevel,
        urgency: ADVICE_TO_URGENCY[adviceLevel] || "low",
        advice: getAdvice(adviceLevel, topCondition),
        emergency,
      },
    });
  } catch (error) {
    console.error("Voice assistant analysis error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while analyzing voice symptoms.",
    });
  }
});

module.exports = router;
