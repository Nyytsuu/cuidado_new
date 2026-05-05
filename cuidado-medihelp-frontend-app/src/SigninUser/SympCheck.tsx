import { useState } from "react";
import UserSidebar from "../Categories/UserSidebar";
import "./SympCheck.css";

const symptomCards = [
  { id: "cold", title: "Cold & Flu", icon: "👤" },
  { id: "cough", title: "Cough", icon: "😷" },
  { id: "fever", title: "Fever", icon: "🪐" },
  { id: "headache", title: "Headache", icon: "💊" },
  { id: "fatigue", title: "Fatigue", icon: "😵" },
];

const leftTools = [
  {
    id: "bmi",
    title: "BMI Calculator",
    desc: "Discover your ideal weight",
    icon: "⚖️",
    button: "Check BMI",
  },
];

const rightTools = [
  {
    id: "clinic",
    title: "Find Clinic",
    desc: "Find a location",
    icon: "📍",
    button: "Find Clinic",
  },
  {
    id: "tips",
    title: "Health Tips",
    desc: "Read useful tips",
    icon: "🍎",
    button: "Manage",
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
    adviceLevel: "self-care" | "consult" | "urgent";
  };
};

export default function SympCheck() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [symptomInput, setSymptomInput] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [possibleConditions, setPossibleConditions] = useState<string[]>([]);
  const [matchedSymptoms, setMatchedSymptoms] = useState<string[]>([]);
  const [adviceLevel, setAdviceLevel] = useState("");

  const handleSymptomCardClick = (title: string) => {
    let mappedTitle = title;

    if (title === "Cold & Flu") mappedTitle = "Fever";
    if (title === "Headache") mappedTitle = "Fever";
    if (title === "Fatigue") mappedTitle = "Fever";

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

    const updatedSymptoms = [...currentSymptoms, mappedTitle];
    setSymptomInput(updatedSymptoms.join(", "));
  };

  const handleCheckSymptoms = async () => {
    setError("");
    setSuccessMessage("");
    setPossibleConditions([]);
    setMatchedSymptoms([]);
    setAdviceLevel("");

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

      const response = await fetch("http://localhost:5000/api/symptom-checker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: 1, // replace with real logged in user id later
          selectedSymptoms,
          age,
          gender,
        }),
      });

      const result: SymptomCheckerResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to check symptoms");
      }

      setSuccessMessage(result.message || "Symptom check completed.");
      setPossibleConditions(result.data?.possibleConditions || []);
      setMatchedSymptoms(result.data?.matchedSymptoms || []);
      setAdviceLevel(result.data?.adviceLevel || "");
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
              <h1>Symptom Checker</h1>
              <p>Assess your symptoms online.</p>
            </div>

            <div className="sympcheck-form-card">
              <div className="sympcheck-form-left">
                <div className="sympcheck-form-title">
                  <span className="sympcheck-form-icon">📝</span>
                  <h2>Tell us about your symptoms</h2>
                </div>

                <div className="sympcheck-input-row full">
                  <input
                    type="text"
                    placeholder="e.g. Fever, Cough, Shortness of Breath"
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                  />
                  <span className="dropdown-arrow">▼</span>
                </div>

                <div className="sympcheck-bottom-row">
                  <div className="sympcheck-select">
                    <span className="select-icon">👤</span>
                    <select value={age} onChange={(e) => setAge(e.target.value)}>
                      <option value="">Age</option>
                      <option value="1-12">1-12</option>
                      <option value="13-18">13-18</option>
                      <option value="19-35">19-35</option>
                      <option value="36-60">36-60</option>
                      <option value="60+">60+</option>
                    </select>
                    <span className="dropdown-arrow">▼</span>
                  </div>

                  <div className="sympcheck-select">
                    <span className="select-icon">👤</span>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    <span className="dropdown-arrow">▼</span>
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

                {error && (
                  <p style={{ color: "red", marginTop: "12px" }}>{error}</p>
                )}

                {successMessage && (
                  <p style={{ color: "green", marginTop: "12px" }}>
                    {successMessage}
                  </p>
                )}

                {matchedSymptoms.length > 0 && (
                  <div style={{ marginTop: "14px" }}>
                    <strong>Matched Symptoms:</strong> {matchedSymptoms.join(", ")}
                  </div>
                )}

                {possibleConditions.length > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    <strong>Possible Conditions:</strong>{" "}
                    {possibleConditions.join(", ")}
                  </div>
                )}

                {adviceLevel && (
                  <div style={{ marginTop: "10px" }}>
                    <strong>Advice Level:</strong> {adviceLevel}
                  </div>
                )}
              </div>
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
                    <div className="symptom-card-icon">{item.icon}</div>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>

              <div className="consult-card">
                <div className="consult-icon">💡</div>
                <p>
                  Always consult with a healthcare professional for a proper
                  diagnosis.
                </p>
              </div>
            </div>
          </section>

          <section className="health-tools-grid">
            <div className="tools-column">
              <h2>Health Tools</h2>

              <div className="tool-stack">
                {leftTools.map((tool) => (
                  <div className="tool-card large" key={tool.id}>
                    <div className="tool-left">
                      <div className="tool-icon">{tool.icon}</div>
                      <div>
                        <h3>{tool.title}</h3>
                        <p>{tool.desc}</p>
                      </div>
                    </div>

                    <button type="button" className="tool-btn">
                      {tool.button}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="tools-column">
              <h2>Health Tools</h2>

              <div className="tool-grid">
                {rightTools.map((tool) => (
                  <div className="tool-card small" key={tool.id}>
                    <div className="tool-left">
                      <div className="tool-icon">{tool.icon}</div>
                      <div>
                        <h3>{tool.title}</h3>
                        <p>{tool.desc}</p>
                      </div>
                    </div>

                    {tool.button && (
                      <button type="button" className="tool-btn">
                        {tool.button}
                      </button>
                    )}
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
        </main>
      </div>
    </div>
  );
}