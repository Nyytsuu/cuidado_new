import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Apple,
  BatteryWarning,
  CheckCircle2,
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
  X,
  type LucideIcon,
} from "lucide-react";
import UserSidebar from "../Categories/UserSidebar";
import { apiUrl } from "../sharedBackendFetch";
import "./SympCheck.css";

type IconTone = "teal" | "blue" | "amber" | "rose" | "lime";

type SymptomCard = {
  id: string;
  title: string;
  Icon: LucideIcon;
  tone: IconTone;
};

type HealthTool = {
  id: string;
  title: string;
  desc: string;
  Icon: LucideIcon;
  button: string;
  path: string;
  tone: IconTone;
};

const symptomCards = [
  { id: "cold", title: "Cold & Flu", Icon: Stethoscope, tone: "teal" },
  { id: "cough", title: "Cough", Icon: Wind, tone: "blue" },
  { id: "fever", title: "Fever", Icon: Thermometer, tone: "amber" },
  { id: "headache", title: "Headache", Icon: HeartPulse, tone: "rose" },
  { id: "fatigue", title: "Fatigue", Icon: BatteryWarning, tone: "lime" },
] satisfies SymptomCard[];

const leftTools = [
  {
    id: "bmi",
    title: "BMI Calculator",
    desc: "Discover your ideal weight",
    Icon: Scale,
    button: "Check BMI",
    path: "/bmi-calculator",
    tone: "teal",
  },
] satisfies HealthTool[];

const rightTools = [
  {
    id: "clinic",
    title: "Find Clinic",
    desc: "Find a location",
    Icon: MapPin,
    button: "Find Clinic",
    path: "/find-clinic",
    tone: "blue",
  },
  {
    id: "tips",
    title: "Health Tips",
    desc: "Read useful tips",
    Icon: Apple,
    button: "Manage",
    path: "/browse-health",
    tone: "lime",
  },
] satisfies HealthTool[];

const checkerSteps = [
  {
    title: "Describe",
    desc: "Enter the symptoms you are feeling now.",
    Icon: ClipboardList,
  },
  {
    title: "Review",
    desc: "Cuidado compares your symptoms with mapped conditions.",
    Icon: Stethoscope,
  },
  {
    title: "Act",
    desc: "Use the result to choose self-care, clinic care, or urgent help.",
    Icon: Lightbulb,
  },
];

const LANGUAGE_OPTIONS = [
  { label: "English", value: "en-PH" },
  { label: "Filipino", value: "fil-PH" },
];

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

function getStoredUserId() {
  try {
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    return user?.id || 1;
  } catch {
    return 1;
  }
}

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
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const isFilipino = language === "fil-PH";
  const topCondition = conditionDetails[0] || null;
  const visibleConditionDetails = conditionDetails.slice(0, 5);
  const adviceInfo = ADVICE_LABELS[adviceLevel] || {
    title: "Review with care",
    detail: "Use this result as a guide before consulting a professional.",
  };

  const handleSymptomCardClick = (title: string) => {
    const mappedTitle =
      title === "Cold & Flu" || title === "Headache" || title === "Fatigue"
        ? "Fever"
        : title;

    const currentSymptoms = symptomInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (
      currentSymptoms.some(
        (item) => item.toLowerCase() === mappedTitle.toLowerCase()
      )
    ) {
      return;
    }

    setSymptomInput([...currentSymptoms, mappedTitle].join(", "));
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
    setResultModalOpen(false);

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
      setResultModalOpen(true);
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
      />

      <div className="sympcheck-content">
        <main className="sympcheck-main">
          <section className="sympcheck-hero">
            <div className="sympcheck-title-wrap">
              <span className="sympcheck-eyebrow">Cuidado Health Guide</span>
              <h1>Symptom Checker</h1>
              <p>Assess your symptoms online and get a clearer next step.</p>
              <div className="sympcheck-hero-pills">
                <span>Fast symptom review</span>
                <span>Clinic-ready guidance</span>
                <span>For informational use</span>
              </div>
            </div>

            <div className="sympcheck-hero-grid">
              <div className="sympcheck-form-card">
                <div className="sympcheck-form-left">
                  <div className="sympcheck-form-title">
                    <span className="sympcheck-form-icon">
                      <ClipboardList size={22} />
                    </span>
                    <h2>Tell us about your symptoms</h2>
                  </div>

                  <div className="sympcheck-input-row full">
                    <input
                      type="text"
                      placeholder={
                        isFilipino
                          ? "hal. lagnat, ubo, sakit ng ulo, hirap huminga"
                          : "e.g. Fever, cough, shortness of breath"
                      }
                      value={symptomInput}
                      onChange={(e) => setSymptomInput(e.target.value)}
                    />
                  </div>

                  <div className="sympcheck-bottom-row">
                    <div className="sympcheck-select">
                      <span className="select-icon">
                        <UserRound size={18} />
                      </span>
                      <select value={age} onChange={(e) => setAge(e.target.value)}>
                        <option value="">Age</option>
                        <option value="1-12">1-12</option>
                        <option value="13-18">13-18</option>
                        <option value="19-35">19-35</option>
                        <option value="36-60">36-60</option>
                        <option value="60+">60+</option>
                      </select>
                    </div>

                    <div className="sympcheck-select">
                      <span className="select-icon">
                        <UserRound size={18} />
                      </span>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div className="sympcheck-select">
                      <span className="select-icon">
                        <Languages size={18} />
                      </span>
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
                    </div>

                    <button
                      type="button"
                      className="sympcheck-btn-primary"
                      onClick={handleCheckSymptoms}
                      disabled={loading}
                    >
                      {loading ? "Checking..." : "Check Symptoms"}
                    </button>
                  </div>

                  {error && <p className="sympcheck-alert error">{error}</p>}

                  <div className="sympcheck-helper-strip">
                    <div>
                      <CheckCircle2 size={18} />
                      <span>
                        {isFilipino
                          ? "Tumatanggap ng Filipino symptoms"
                          : "Separate symptoms with commas"}
                      </span>
                    </div>
                    <div>
                      <Stethoscope size={18} />
                      <span>Review possible condition matches</span>
                    </div>
                    <div>
                      <Lightbulb size={18} />
                      <span>Use results to choose your next step</span>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="sympcheck-guide-card">
                <div className="guide-card-head">
                  <div className="guide-icon">
                    <Stethoscope size={24} />
                  </div>
                  <div>
                    <h2>How it helps</h2>
                    <p>Use this as a quick guide before booking care.</p>
                  </div>
                </div>

                <div className="guide-step-list">
                  {checkerSteps.map((step, index) => (
                    <div className="guide-step" key={step.title}>
                      <span className="guide-step-number">{index + 1}</span>
                      <step.Icon size={18} />
                      <div>
                        <strong>{step.title}</strong>
                        <p>{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="guide-care-note">
                  <Lightbulb size={18} />
                  <span>Severe symptoms should be checked by a doctor immediately.</span>
                </div>
              </aside>
            </div>
          </section>

          <section className="common-symptoms-section">
            <h2>Common Symptoms</h2>

            <div className="common-symptoms-row">
              <div className="symptom-card-list">
                {symptomCards.map((item) => (
                  <button
                    key={item.id}
                    className="symptom-card"
                    type="button"
                    onClick={() => handleSymptomCardClick(item.title)}
                  >
                    <div className={`symptom-card-icon ${item.tone}`}>
                      <item.Icon size={28} />
                    </div>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>

              <div className="consult-card">
                <div className="consult-icon">
                  <Lightbulb size={30} />
                </div>
                <p>
                  Always consult with a healthcare professional for a proper
                  diagnosis.
                </p>
              </div>
            </div>
          </section>

          <section className="health-tools-grid">
            <h2 className="health-tools-title">Health Tools</h2>
            <div className="tools-column">
              <div className="tool-stack">
                {leftTools.map((tool) => (
                  <div className="tool-card large" key={tool.id}>
                    <div className="tool-left">
                      <div className={`tool-icon ${tool.tone}`}>
                        <tool.Icon size={26} />
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
            </div>

            <div className="tools-column">
              <div className="tool-grid">
                {rightTools.map((tool) => (
                  <div className="tool-card small" key={tool.id}>
                    <div className="tool-left">
                      <div className={`tool-icon ${tool.tone}`}>
                        <tool.Icon size={23} />
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

          {resultModalOpen && (
            <div
              className="symptom-result-overlay"
              role="presentation"
              onClick={() => setResultModalOpen(false)}
            >
              <div
                className="symptom-result-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="symptomResultTitle"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="symptom-result-close"
                  aria-label="Close result"
                  onClick={() => setResultModalOpen(false)}
                >
                  <X size={20} />
                </button>

                <div className="symptom-result-head">
                  <div className="symptom-result-icon">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <span>Symptom check completed</span>
                    <h2 id="symptomResultTitle">
                      {topCondition?.name || possibleConditions[0] || "Review your result"}
                    </h2>
                    <p>
                      {successMessage || "Your symptom check is ready."}{" "}
                      {matchedSymptoms.length > 0
                        ? `${matchedSymptoms.length} symptom match${
                            matchedSymptoms.length === 1 ? "" : "es"
                          } found.`
                        : "No exact symptom match was found."}
                    </p>
                  </div>
                </div>

                <div className="symptom-result-summary">
                  <div className="symptom-result-stat">
                    <span>Top match</span>
                    <strong>
                      {topCondition ? `${getConditionPercent(topCondition)}%` : "--"}
                    </strong>
                    <small>match strength</small>
                  </div>
                  <div className="symptom-result-stat">
                    <span>Symptoms</span>
                    <strong>{matchedSymptoms.length}</strong>
                    <small>matched terms</small>
                  </div>
                  <div className="symptom-result-stat urgent">
                    <span>Care level</span>
                    <strong>{adviceInfo.title}</strong>
                    <small>{adviceInfo.detail}</small>
                  </div>
                </div>

                <section className="symptom-result-section">
                  <div className="symptom-result-section-head">
                    <span>Matched symptoms</span>
                    {redFlagSymptoms.length > 0 && (
                      <strong>{redFlagSymptoms.length} red flag</strong>
                    )}
                  </div>
                  <div className="symptom-chip-row">
                    {matchedSymptoms.length > 0 ? (
                      matchedSymptoms.map((symptom) => (
                        <span
                          className={`symptom-chip${
                            redFlagSymptoms.includes(symptom) ? " danger" : ""
                          }`}
                          key={symptom}
                        >
                          {symptom}
                        </span>
                      ))
                    ) : (
                      <span className="symptom-chip muted">No exact symptom match</span>
                    )}
                  </div>
                </section>

                <section className="symptom-result-section">
                  <div className="symptom-result-section-head">
                    <span>Possible conditions</span>
                    <strong>{possibleConditions.length} found</strong>
                  </div>

                  <div className="symptom-condition-list">
                    {visibleConditionDetails.length > 0 ? (
                      visibleConditionDetails.map((condition, index) => {
                        const percent = getConditionPercent(condition);
                        return (
                          <article className="symptom-condition-card" key={condition.name}>
                            <div className="symptom-condition-title">
                              <span>{index + 1}</span>
                              <div>
                                <h3>{condition.name}</h3>
                                <p>
                                  {condition.matchedCount || condition.matchedSymptoms?.length || 0}
                                  {" of "}
                                  {condition.totalSymptoms || "mapped"} symptoms matched
                                </p>
                              </div>
                              <strong>{percent}%</strong>
                            </div>
                            <div className="symptom-condition-meter">
                              <span style={{ width: `${percent}%` }} />
                            </div>
                            {condition.matchedSymptoms &&
                              condition.matchedSymptoms.length > 0 && (
                                <div className="symptom-condition-tags">
                                  {condition.matchedSymptoms.slice(0, 4).map((symptom) => (
                                    <small key={`${condition.name}-${symptom}`}>
                                      {symptom}
                                    </small>
                                  ))}
                                </div>
                              )}
                          </article>
                        );
                      })
                    ) : (
                      <div className="symptom-result-empty">
                        No possible conditions returned from the matched symptoms.
                      </div>
                    )}
                  </div>
                </section>

                <div className={`symptom-result-note ${adviceLevel || ""}`}>
                  <Lightbulb size={18} />
                  <p>
                    <strong>{adviceInfo.title}.</strong>{" "}
                    {guidance ||
                      "This result is for general guidance. If symptoms are severe, worsening, or urgent, contact a healthcare professional."}
                  </p>
                </div>

                <div className="symptom-result-actions">
                  <button
                    type="button"
                    className="symptom-result-secondary"
                    onClick={() => setResultModalOpen(false)}
                  >
                    Review again
                  </button>
                  <button
                    type="button"
                    className="symptom-result-primary"
                    onClick={() => {
                      setResultModalOpen(false);
                      navigate("/find-clinic");
                    }}
                  >
                    Find Clinic
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
