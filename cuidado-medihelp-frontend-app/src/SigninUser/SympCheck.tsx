import { useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import {
  Apple,
  BatteryWarning,
  ChevronDown,
  ClipboardList,
  HeartPulse,
  Languages,
  Lightbulb,
  MapPin,
  Scale,
  Stethoscope,
  Thermometer,
  UserRound,
  Wind,
} from "lucide-react";
import UserSidebar from "../Categories/UserSidebar";
import { apiUrl } from "../sharedBackendFetch";
import "./SympCheck.css";

type Tone = "teal" | "blue" | "amber" | "rose" | "lime";

type SymptomCard = {
  id: string;
  title: string;
  apiSymptom: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  tone: Tone;
};

type HealthTool = {
  id: string;
  title: string;
  desc: string;
  button: string;
  path: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  tone: Tone;
};

const symptomCards: SymptomCard[] = [
  { id: "cold", title: "Cold & Flu", apiSymptom: "Fever", Icon: Stethoscope, tone: "teal" },
  { id: "cough", title: "Cough", apiSymptom: "Cough", Icon: Wind, tone: "blue" },
  { id: "fever", title: "Fever", apiSymptom: "Fever", Icon: Thermometer, tone: "amber" },
  { id: "headache", title: "Headache", apiSymptom: "Headache", Icon: HeartPulse, tone: "rose" },
  { id: "fatigue", title: "Fatigue", apiSymptom: "Fatigue", Icon: BatteryWarning, tone: "lime" },
];

const healthTools: HealthTool[] = [
  {
    id: "bmi",
    title: "BMI Calculator",
    desc: "Discover your ideal weight",
    button: "Check BMI",
    path: "/bmi-calculator",
    Icon: Scale,
    tone: "teal",
  },
  {
    id: "clinic",
    title: "Find Clinic",
    desc: "Find a location",
    button: "Find Clinic",
    path: "/find-clinic",
    Icon: MapPin,
    tone: "rose",
  },
  {
    id: "tips",
    title: "Health Tips",
    desc: "Read useful tips",
    button: "Manage",
    path: "/browse-health",
    Icon: Apple,
    tone: "lime",
  },
];

type SymptomCheckerResponse = {
  success: boolean;
  message: string;
  data?: {
    logId: number;
    selectedSymptoms: string[];
    matchedSymptoms: string[];
    possibleConditions: string[];
    conditionDetails?: ConditionMatch[];
    redFlagSymptoms?: string[];
    adviceLevel: AdviceLevel;
    guidance?: string;
  };
};

type AdviceLevel = "self-care" | "consult" | "urgent";

type ConditionMatch = {
  id?: number;
  name: string;
  adviceLevel?: AdviceLevel;
  score?: number;
  scorePercent?: number;
  matchedCount?: number;
  totalSymptoms?: number;
  matchedSymptoms?: string[];
  whenToSeekHelp?: string | null;
};

const LANGUAGE_OPTIONS = [
  { label: "English", value: "en-PH" },
  { label: "Filipino", value: "fil-PH" },
];

const ADVICE_LABELS: Record<string, { title: string; detail: string }> = {
  "self-care": {
    title: "Self-care guidance",
    detail: "Monitor symptoms and seek care if they persist or worsen.",
  },
  consult: {
    title: "Clinic consultation recommended",
    detail: "Booking a clinic visit is a good next step.",
  },
  urgent: {
    title: "Urgent care recommended",
    detail: "Contact a healthcare professional as soon as possible.",
  },
};

const getConditionPercent = (condition: ConditionMatch) =>
  Math.max(
    0,
    Math.min(
      100,
      condition.scorePercent ??
        Math.round(Number(condition.score || 0) * 100)
    )
  );

const getStoredUserId = () => {
  try {
    const directId = localStorage.getItem("userId");
    if (directId) return Number(directId);

    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    return user?.id || 1;
  } catch {
    return 1;
  }
};

export default function SympCheck() {
  const navigate = useNavigate();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [symptomInput, setSymptomInput] = useState("");
  const [language, setLanguage] = useState("en-PH");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [possibleConditions, setPossibleConditions] = useState<string[]>([]);
  const [conditionDetails, setConditionDetails] = useState<ConditionMatch[]>([]);
  const [matchedSymptoms, setMatchedSymptoms] = useState<string[]>([]);
  const [redFlagSymptoms, setRedFlagSymptoms] = useState<string[]>([]);
  const [adviceLevel, setAdviceLevel] = useState("");
  const [guidance, setGuidance] = useState("");
  const isFilipino = language === "fil-PH";
  const topCondition = conditionDetails[0] || null;
  const visibleConditionDetails = conditionDetails.slice(0, 5);
  const adviceInfo = ADVICE_LABELS[adviceLevel] || {
    title: "Review with care",
    detail: "Use this result as a guide before consulting a professional.",
  };

  const handleSymptomCardClick = (symptom: string) => {
    const currentSymptoms = symptomInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (
      currentSymptoms.some(
        (item) => item.toLowerCase() === symptom.toLowerCase()
      )
    ) {
      return;
    }

    setSymptomInput([...currentSymptoms, symptom].join(", "));
  };

  const handleCheckSymptoms = async () => {
    setError("");
    setSuccessMessage("");
    setPossibleConditions([]);
    setConditionDetails([]);
    setMatchedSymptoms([]);
    setRedFlagSymptoms([]);
    setAdviceLevel("");
    setGuidance("");

    const selectedSymptoms = symptomInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (selectedSymptoms.length === 0) {
      setError("Please enter at least one symptom.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(apiUrl("/api/symptom-checker"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: getStoredUserId(),
          selectedSymptoms,
          age,
          gender,
          language,
        }),
      });

      const result: SymptomCheckerResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to check symptoms");
      }

      setSuccessMessage(result.message || "Symptom check completed.");
      setPossibleConditions(result.data?.possibleConditions || []);
      setConditionDetails(result.data?.conditionDetails || []);
      setMatchedSymptoms(result.data?.matchedSymptoms || []);
      setRedFlagSymptoms(result.data?.redFlagSymptoms || []);
      setAdviceLevel(result.data?.adviceLevel || "");
      setGuidance(result.data?.guidance || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`sympcheck-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
        searchPlaceholder="Search..."
      />

      <div className="sympcheck-content">
        <main className="sympcheck-main">
          <section className="sympcheck-hero">
            <div className="sympcheck-title-wrap">
              <h1>Symptom Checker</h1>
              <p>Assess your symptoms online.</p>
            </div>

            <div className="sympcheck-form-card">
              <div className="sympcheck-form-title">
                <span className="sympcheck-form-icon">
                  <ClipboardList size={18} />
                </span>
                <h2>Tell us about your symptoms</h2>
              </div>

              <div className="sympcheck-input-row full">
                <input
                  type="text"
                  placeholder={
                    isFilipino
                      ? "hal. lagnat, ubo, sakit ng ulo"
                      : "e.g. Fever, Cough, Shortness of Breath"
                  }
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                />
                <ChevronDown size={14} className="dropdown-arrow" />
              </div>

              <div className="sympcheck-bottom-row">
                <label className="sympcheck-select">
                  <UserRound size={16} className="select-icon" />
                  <select value={age} onChange={(e) => setAge(e.target.value)}>
                    <option value="">Age</option>
                    <option value="1-12">1-12</option>
                    <option value="13-18">13-18</option>
                    <option value="19-35">19-35</option>
                    <option value="36-60">36-60</option>
                    <option value="60+">60+</option>
                  </select>
                  <ChevronDown size={13} className="dropdown-arrow" />
                </label>

                <label className="sympcheck-select">
                  <UserRound size={16} className="select-icon" />
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  <ChevronDown size={13} className="dropdown-arrow" />
                </label>

                <label className="sympcheck-select">
                  <Languages size={16} className="select-icon" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    aria-label="Symptom language"
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="dropdown-arrow" />
                </label>
              </div>

              <button
                type="button"
                className="sympcheck-btn-primary"
                onClick={handleCheckSymptoms}
                disabled={loading}
              >
                {loading ? "Checking..." : "Check Symptoms"}
              </button>

              {error && <p className="sympcheck-alert error">{error}</p>}
              {successMessage && (
                <div className="sympcheck-result-card">
                  <div className="sympcheck-result-head">
                    <span>Symptom check completed</span>
                    <strong>{topCondition?.name || possibleConditions[0] || "Review your result"}</strong>
                    <p>
                      {matchedSymptoms.length > 0
                        ? `${matchedSymptoms.length} matched symptom${
                            matchedSymptoms.length === 1 ? "" : "s"
                          } found`
                        : "No exact symptom match found"}
                    </p>
                  </div>

                  <div className="sympcheck-result-stats">
                    <div>
                      <span>Top match</span>
                      <strong>
                        {topCondition ? `${getConditionPercent(topCondition)}%` : "--"}
                      </strong>
                    </div>
                    <div>
                      <span>Care level</span>
                      <strong>{adviceInfo.title}</strong>
                    </div>
                  </div>

                  <div className="sympcheck-result-section">
                    <span>Matched symptoms</span>
                    <div className="sympcheck-chip-row">
                      {matchedSymptoms.length > 0 ? (
                        matchedSymptoms.map((symptom) => (
                          <small
                            className={redFlagSymptoms.includes(symptom) ? "danger" : ""}
                            key={symptom}
                          >
                            {symptom}
                          </small>
                        ))
                      ) : (
                        <small>No exact symptom match</small>
                      )}
                    </div>
                  </div>

                  <div className="sympcheck-result-section">
                    <span>Possible conditions</span>
                    <div className="sympcheck-condition-list">
                      {visibleConditionDetails.length > 0 ? (
                        visibleConditionDetails.map((condition, index) => {
                          const percent = getConditionPercent(condition);
                          return (
                            <article className="sympcheck-condition-card" key={condition.name}>
                              <div className="sympcheck-condition-top">
                                <b>{index + 1}</b>
                                <div>
                                  <strong>{condition.name}</strong>
                                  <em>
                                    {condition.matchedCount ||
                                      condition.matchedSymptoms?.length ||
                                      0}
                                    {" of "}
                                    {condition.totalSymptoms || "mapped"} symptoms matched
                                  </em>
                                </div>
                                <span>{percent}%</span>
                              </div>
                              <div className="sympcheck-condition-meter">
                                <i style={{ width: `${percent}%` }} />
                              </div>
                            </article>
                          );
                        })
                      ) : (
                        <p>No possible conditions returned.</p>
                      )}
                    </div>
                  </div>

                  <div className={`sympcheck-advice-card ${adviceLevel || ""}`}>
                    <strong>{adviceInfo.title}</strong>
                    <p>{guidance || adviceInfo.detail}</p>
                  </div>

                  <button
                    type="button"
                    className="sympcheck-result-action"
                    onClick={() => navigate("/find-clinic")}
                  >
                    Find Clinic
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="common-symptoms-section">
            <h2>Common Symptoms</h2>

            <div className="symptom-card-list">
              {symptomCards.map((item) => (
                <button
                  key={item.id}
                  className="symptom-card"
                  type="button"
                  onClick={() => handleSymptomCardClick(item.apiSymptom)}
                >
                  <div className={`symptom-card-icon ${item.tone}`}>
                    <item.Icon size={23} strokeWidth={2.3} />
                  </div>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>

            <div className="consult-card">
              <div className="consult-icon">
                <Lightbulb size={21} strokeWidth={2.4} />
              </div>
              <p>
                Always consult with a healthcare professional for a proper
                diagnosis.
              </p>
            </div>
          </section>

          <section className="health-tools-section">
            <h2>Health Tools</h2>

            <div className="health-tools-list">
              {healthTools.map((tool) => (
                <div className="tool-card" key={tool.id}>
                  <div className="tool-left">
                    <div className={`tool-icon ${tool.tone}`}>
                      <tool.Icon size={22} strokeWidth={2.3} />
                    </div>
                    <div>
                      <h3>{tool.title}</h3>
                      <p>{tool.desc}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="tool-btn"
                    onClick={() => navigate(tool.path)}
                  >
                    {tool.button}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <footer className="sympcheck-footer">
            <span>About Us</span>
            <span>|</span>
            <span>Contact</span>
            <span>|</span>
            <span>Privacy Policy</span>
            <span>|</span>
            <span>Terms of Service</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
