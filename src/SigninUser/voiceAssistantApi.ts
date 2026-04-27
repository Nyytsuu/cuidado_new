export type PossibleCondition = {
  name: string;
  score: number;
  matchedSymptoms: string[];
};

export type SymptomResult = {
  transcript: string;
  symptoms: string[];
  possible_conditions: PossibleCondition[];
  urgency: "low" | "medium" | "high";
  advice: string;
  emergency: boolean;
};

type VoiceAssistantApiResponse = {
  success: boolean;
  message?: string;
  data?: {
    transcript?: string;
    symptoms?: string[];
    matchedSymptoms?: string[];
    possible_conditions?: PossibleCondition[];
    possibleConditions?: string[];
    adviceLevel?: "self-care" | "consult" | "urgent";
    urgency?: "low" | "medium" | "high";
    advice?: string;
    emergency?: boolean;
  };
};

const API_URL = "http://localhost:5000/api/voice-assistant/analyze";

const adviceLevelToUrgency = (
  adviceLevel?: "self-care" | "consult" | "urgent"
): "low" | "medium" | "high" => {
  if (adviceLevel === "urgent") return "high";
  if (adviceLevel === "consult") return "medium";
  return "low";
};

export const getStoredUserId = () => {
  try {
    const storedUser = localStorage.getItem("user");
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    return currentUser?.id ? Number(currentUser.id) : null;
  } catch {
    return null;
  }
};

export const analyzeVoiceTranscript = async (
  transcript: string,
  userId: number | null = getStoredUserId()
): Promise<SymptomResult> => {
  const cleanTranscript = transcript.trim();

  if (!cleanTranscript) {
    throw new Error("Please describe your symptoms first.");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transcript: cleanTranscript,
      userId,
    }),
  });

  const result: VoiceAssistantApiResponse = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to analyze symptoms.");
  }

  const data = result.data || {};
  const possibleConditions =
    data.possible_conditions ||
    (data.possibleConditions || []).map((name) => ({
      name,
      score: 0,
      matchedSymptoms: [],
    }));

  return {
    transcript: data.transcript || cleanTranscript,
    symptoms: data.symptoms || data.matchedSymptoms || [],
    possible_conditions: possibleConditions,
    urgency: data.urgency || adviceLevelToUrgency(data.adviceLevel),
    advice:
      data.advice ||
      "Please consult a healthcare professional if symptoms persist or worsen.",
    emergency: Boolean(data.emergency),
  };
};
