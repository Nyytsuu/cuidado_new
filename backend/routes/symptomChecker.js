const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { verifyToken } = require("../middleware/auth");

router.use(verifyToken);

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

const FILIPINO_SYMPTOM_ALIASES = [
  { aliases: ["ubo", "inuubo", "paulit ulit na ubo"], symptoms: ["cough"] },
  { aliases: ["lagnat", "sinat", "nilalagnat", "trangkaso"], symptoms: ["fever"] },
  { aliases: ["sipon", "sinisipon", "tumutulong sipon"], symptoms: ["runny nose", "nasal congestion"] },
  { aliases: ["baradong ilong", "bara ang ilong", "sikip ng ilong"], symptoms: ["nasal congestion"] },
  { aliases: ["sakit ulo", "sakit ng ulo", "masakit ang ulo", "sumasakit ang ulo"], symptoms: ["headache"] },
  { aliases: ["hilo", "nahihilo", "pagkahilo"], symptoms: ["dizziness"] },
  { aliases: ["suka", "pagsusuka", "nagsusuka"], symptoms: ["vomiting"] },
  { aliases: ["nasusuka", "pagduduwal"], symptoms: ["nausea"] },
  {
    aliases: ["sakit tiyan", "sakit ng tiyan", "masakit ang tiyan", "pananakit ng tiyan"],
    symptoms: ["stomach pain", "abdominal pain"],
  },
  { aliases: ["pagtatae", "nagtatae", "diarrhea"], symptoms: ["diarrhea"] },
  {
    aliases: [
      "hirap huminga",
      "hirap sa paghinga",
      "nahihirapan huminga",
      "kinakapos ng hininga",
    ],
    symptoms: ["shortness of breath", "difficulty breathing"],
  },
  {
    aliases: ["sakit dibdib", "sakit ng dibdib", "masakit ang dibdib", "pananakit ng dibdib"],
    symptoms: ["chest pain"],
  },
  { aliases: ["pantal", "butlig", "rashes"], symptoms: ["rash"] },
  { aliases: ["kati", "pangangati", "makati"], symptoms: ["itching"] },
  { aliases: ["pagod", "pagkapagod", "panghihina", "mahina ang katawan"], symptoms: ["fatigue", "weakness"] },
  {
    aliases: ["sakit lalamunan", "sakit ng lalamunan", "masakit ang lalamunan", "namamagang lalamunan"],
    symptoms: ["sore throat"],
  },
  { aliases: ["panginginig", "giniginaw"], symptoms: ["chills"] },
  { aliases: ["sakit katawan", "pananakit ng katawan", "masakit ang katawan"], symptoms: ["body aches"] },
  { aliases: ["pawis sa gabi", "pinapawisan sa gabi"], symptoms: ["night sweats"] },
  { aliases: ["bumababa timbang", "pagbaba ng timbang", "pumapayat"], symptoms: ["weight loss"] },
  { aliases: ["ubo na may dugo", "dugo sa ubo"], symptoms: ["coughing blood", "blood in cough"] },
  { aliases: ["namamaga", "pamamaga"], symptoms: ["swelling"] },
  { aliases: ["nanlalabo ang mata", "malabo ang paningin"], symptoms: ["blurred vision"] },
];

const buildSearchableSymptomText = (symptoms) => {
  const normalizedInput = normalizeText(symptoms.join(" "));
  const aliasSymptoms = new Set();

  FILIPINO_SYMPTOM_ALIASES.forEach(({ aliases, symptoms: mappedSymptoms }) => {
    if (aliases.some((alias) => includesPhrase(normalizedInput, alias))) {
      mappedSymptoms.forEach((symptom) => aliasSymptoms.add(normalizeText(symptom)));
    }
  });

  return [normalizedInput, ...aliasSymptoms].filter(Boolean).join(" ");
};

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

    const searchableSymptoms = buildSearchableSymptomText(cleanedSymptoms);

    const [symptomRows] = await pool.query(`
      SELECT symptom_id, symptom_name, is_red_flag
      FROM symptoms
      ORDER BY CHAR_LENGTH(symptom_name) DESC, symptom_name ASC
    `);

    const matchedSymptoms = symptomRows.filter((symptom) =>
      includesPhrase(searchableSymptoms, symptom.symptom_name)
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
