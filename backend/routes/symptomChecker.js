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

const getAdviceCopy = (adviceLevel, topCondition, hasRedFlag) => {
  if (hasRedFlag) {
    return "A red-flag symptom was matched. Please seek urgent medical care or contact a healthcare professional immediately.";
  }

  if (topCondition?.whenToSeekHelp) {
    return topCondition.whenToSeekHelp;
  }

  if (adviceLevel === "urgent") {
    return "Your symptoms may need urgent care. Please contact a healthcare professional or visit an urgent care facility as soon as possible.";
  }

  if (adviceLevel === "consult") {
    return "A clinic consultation is recommended, especially if symptoms persist, worsen, or affect your daily activities.";
  }

  return "Monitor your symptoms, rest, stay hydrated, and consult a healthcare professional if symptoms persist or worsen.";
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
    let conditionDetails = [];
    let adviceLevel = "self-care";

    if (matchedSymptomIds.length > 0) {
      const conditionPlaceholders = matchedSymptomIds.map(() => "?").join(",");

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
          totals.total_count,
          string_agg(s.symptom_name, '||' ORDER BY s.symptom_name) AS matched_symptoms
        FROM condition_symptoms cs
        INNER JOIN conditions c ON c.condition_id = cs.condition_id
        INNER JOIN symptoms s ON s.symptom_id = cs.symptom_id
        INNER JOIN (
          SELECT
            condition_id,
            COALESCE(SUM(weight), 0) AS total_weight,
            COUNT(*) AS total_count
          FROM condition_symptoms
          GROUP BY condition_id
        ) totals ON totals.condition_id = c.condition_id
        WHERE cs.symptom_id IN (${conditionPlaceholders})
        GROUP BY
          c.condition_id,
          c.condition_name,
          c.advice_level,
          c.when_to_seek_help,
          totals.total_weight,
          totals.total_count
        ORDER BY matched_weight DESC, matched_count DESC, c.condition_name ASC
        `,
        matchedSymptomIds
      );

      conditionDetails = conditionRows.map((row) => {
        const matchedWeight = Number(row.matched_weight) || 0;
        const totalWeight = Number(row.total_weight) || 0;
        const matchedCount = Number(row.matched_count) || 0;
        const totalSymptoms = Number(row.total_count) || matchedCount || 1;
        const score =
          totalWeight > 0
            ? matchedWeight / totalWeight
            : matchedCount / totalSymptoms;

        return {
          id: row.condition_id,
          name: row.condition_name,
          adviceLevel: row.advice_level || "self-care",
          score: Math.max(0, Math.min(1, score)),
          scorePercent: Math.round(Math.max(0, Math.min(1, score)) * 100),
          matchedCount,
          totalSymptoms,
          matchedSymptoms: row.matched_symptoms
            ? String(row.matched_symptoms).split("||")
            : [],
          whenToSeekHelp: row.when_to_seek_help || null,
        };
      });

      possibleConditions = conditionDetails.map((condition) => condition.name);

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

    const redFlagSymptoms = matchedSymptoms
      .filter((row) => Number(row.is_red_flag) === 1)
      .map((row) => row.symptom_name);

    const topCondition = conditionDetails[0] || null;
    const guidance = getAdviceCopy(adviceLevel, topCondition, hasRedFlag);

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
        conditionDetails,
        redFlagSymptoms,
        adviceLevel,
        guidance,
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
