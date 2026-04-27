import { useMemo, useState, useEffect } from "react";
import UserSidebar from "../Categories/UserSidebar";
import "./BMICalculator.css";

type Clinic = {
  id: number;
  clinic_name: string;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export default function BMICalculator() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [showBmiPopup, setShowBmiPopup] = useState(false);
  const [unit, setUnit] = useState<"Metric" | "Imperial">("Metric");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);
  const [clinicsError, setClinicsError] = useState("");

  useEffect(() => {
    const loadClinics = async () => {
      try {
        setClinicsLoading(true);
        setClinicsError("");

        const res = await fetch("http://localhost:5000/api/clinics");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load clinics.");
        }

        setClinics(Array.isArray(data) ? data : []);
      } catch (err) {
        setClinicsError(
          err instanceof Error ? err.message : "Failed to load clinics."
        );
        setClinics([]);
      } finally {
        setClinicsLoading(false);
      }
    };

    loadClinics();
  }, []);

  const bmiData = useMemo(() => {
  const weightNum = Number(weight);
  const heightNum = Number(height);

  if (!weightNum || !heightNum || weightNum <= 0 || heightNum <= 0) {
    return {
      bmi: null as number | null,
      category: "Enter valid values",
      description: "Please provide valid height and weight values.",
      indicatorPercent: 0,
    };
  }

  let bmi = 0;

  if (unit === "Metric") {
    const heightMeters = heightNum / 100;
    bmi = weightNum / (heightMeters * heightMeters);
  } else {
    bmi = (weightNum / (heightNum * heightNum)) * 703;
  }

  let category = "";
  let description = "";

  if (bmi < 18.5) {
    category = "Underweight";
    description =
      "A BMI below 18.5 is considered underweight. Consider consulting a doctor or nutrition professional.";
  } else if (bmi < 23) {
    category = "Normal";
    description =
      "Your BMI is within the normal range. Maintain a balanced diet and active lifestyle.";
  } else if (bmi < 25) {
    category = "At Risk";
    description =
      "Your BMI is slightly elevated. Consider monitoring your diet and physical activity.";
  } else if (bmi < 30) {
    category = "Overweight";
    description =
      "A BMI between 25 and 29.9 is considered overweight for adults. Consult your doctor for a health assessment.";
  } else {
    category = "Obese";
    description =
      "A BMI of 30 or above may indicate obesity. Consider professional medical advice for a full assessment.";
  }

  const clamped = Math.max(10, Math.min(50, bmi));
  const indicatorPercent = ((clamped - 10) / (50 - 10)) * 100;

  return {
    bmi: Number(bmi.toFixed(1)),
    category,
    description,
    indicatorPercent,
  };
}, [weight, height, unit]);

const bmiCheckupAdvice = useMemo(() => {
  if (bmiData.bmi === null) {
    return {
      title: "Invalid BMI",
      needCheckup: false,
      message: "Please enter valid height and weight values first.",
    };
  }

  if (bmiData.bmi < 18.5) {
    return {
      title: "Underweight",
      needCheckup: true,
      message:
        "Your BMI is below the normal range. A medical check-up is recommended to assess your nutrition and overall health.",
    };
  }

  if (bmiData.bmi < 23) {
    return {
      title: "Normal",
      needCheckup: false,
      message:
        "Your BMI is within the normal range. A routine check-up is still good for preventive care, but there is no urgent BMI-related concern.",
    };
  }

  if (bmiData.bmi < 25) {
    return {
      title: "At Risk",
      needCheckup: true,
      message:
        "Your BMI is slightly above the normal range. A check-up may help you review your weight, diet, and lifestyle early.",
    };
  }

  if (bmiData.bmi < 30) {
    return {
      title: "Overweight",
      needCheckup: true,
      message:
        "Your BMI falls in the overweight range. It is a good idea to schedule a check-up for a health assessment and guidance.",
    };
  }

  return {
    title: "Obese",
    needCheckup: true,
    message:
      "Your BMI is in the obesity range. A medical check-up is strongly recommended for proper evaluation and support.",
  };
}, [bmiData]);

  const displayedClinics = useMemo(() => clinics.slice(0, 4), [clinics]);

  return (
    <div className={`bmi-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <div className="bmi-content">
        <main className="bmi-main">
          <section className="bmi-top-section">
            <div className="bmi-left-panel">
              <div className="bmi-title-wrap">
                <h1>BMI Calculator</h1>
                <p>Calculate your Body Mass Index</p>
              </div>

              <div className="bmi-card">
                <div className="bmi-unit-toggle">
                  <button
                    type="button"
                    className={unit === "Metric" ? "active" : ""}
                    onClick={() => setUnit("Metric")}
                  >
                    ☰ <span>Metric</span>
                  </button>
                  <button
                    type="button"
                    className={unit === "Imperial" ? "active" : ""}
                    onClick={() => setUnit("Imperial")}
                  >
                    Imperial
                  </button>
                </div>

                <div className="bmi-input-group">
                  <div className="bmi-input-row">
                    <span className="input-icon">👤</span>
                    <input
                      type="text"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                    <span className="label-text">Age</span>
                  </div>

                  <div className="bmi-input-row split">
                    <div className="split-left">
                      <span className="input-icon">🫀</span>
                      <span className="label-text">
                        {unit === "Metric" ? "Weight (kg)" : "Weight (lb)"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                    <span className="unit-text">
                      {unit === "Metric" ? "kg" : "lb"}
                    </span>
                  </div>

                  <div className="bmi-input-row split">
                    <div className="split-left">
                      <span className="input-icon">🧍</span>
                      <span className="label-text">
                        {unit === "Metric" ? "Height (cm)" : "Height (in)"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                    <span className="unit-text">
                      {unit === "Metric" ? "cm" : "in"}
                    </span>
                  </div>
                </div>

                <button type="button" className="bmi-primary-btn" onClick={() => setShowBmiPopup(true)}>
                  Calculate BMI 
                </button>
              </div>

              <div className="bmi-result-card">
                <h2>
                  Your BMI Result:{" "}
                  <span>{bmiData.bmi !== null ? bmiData.bmi : "--"}</span>
                </h2>

                <div className="bmi-scale-wrap">
                  <div className="bmi-scale-bar">
                    <span className="seg blue"></span>
                    <span className="seg teal"></span>
                    <span className="seg green"></span>
                    <span className="seg orange"></span>
                    <span className="seg red"></span>
                    <div
                      className="bmi-indicator"
                      style={{ left: `${bmiData.indicatorPercent}%` }}
                    ></div>
                  </div>

                  <div className="bmi-scale-labels">
                    <span>10</span>
                    <span>18.5</span>
                    <span>22.5</span>
                    <span>25</span>
                    <span>30</span>
                    <span>50</span>
                  </div>

                  <div className="bmi-scale-categories">
                    <span>&lt; 18.5</span>
                    <span>18.5 - 22.9</span>
                    <span>23 - 24.9</span>
                    <span>25 - 29.9</span>
                    <span>30+</span>
                  </div>
                </div>

                <p className="bmi-result-desc">
                  <strong>{bmiData.category}.</strong> {bmiData.description}
                </p>
              </div>

              <div className="bmi-tip-card">
                <div className="tip-icon">🍏</div>
                <p>
                  <strong>Eat a balanced diet</strong> rich in fruits, vegetables,
                  lean proteins, and whole grains. Limit sugary foods and drinks.
                </p>
              </div>
            </div>

            <div className="bmi-right-panel">
              <div className="near-clinic-card only-card">
                <h3>Near Clinics</h3>

                {clinicsLoading ? (
                  <p>Loading clinics...</p>
                ) : clinicsError ? (
                  <p>{clinicsError}</p>
                ) : displayedClinics.length === 0 ? (
                  <p>No clinics found.</p>
                ) : (
                  <div className="clinic-list">
                    {displayedClinics.map((clinic) => (
                      <div key={clinic.id} className="clinic-item">
                        <div className="clinic-left">
                          <div className="clinic-avatar">👨‍⚕️</div>

                          <div className="clinic-info">
                            <h4>{clinic.clinic_name}</h4>
                            <p>{clinic.address || "Address unavailable"}</p>

                            <div className="clinic-meta">
                              <span>📞 {clinic.phone || "No phone available"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="clinic-right">
                          <button type="button" className="near-btn">
                            View Clinic
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <footer className="bmi-footer">
            <span>About Us</span>
            <span>|</span>
            <span>Contact</span>
            <span>|</span>
            <span>Privacy Policy</span>
            <span>|</span>
            <span>Terms of Service</span>
            {showBmiPopup && (
  <div className="bmi-popup-overlay" onClick={() => setShowBmiPopup(false)}>
    <div
      className="bmi-popup-card"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="bmi-popup-close"
        onClick={() => setShowBmiPopup(false)}
      >
        ×
      </button>

      <h2>Your BMI Result</h2>

      <div className="bmi-popup-value">
        {bmiData.bmi !== null ? bmiData.bmi : "--"}
      </div>

      <p className="bmi-popup-category">
        <strong>Category:</strong> {bmiCheckupAdvice.title}
      </p>

      <p className="bmi-popup-message">{bmiCheckupAdvice.message}</p>

      <div
        className={`bmi-popup-checkup ${
          bmiCheckupAdvice.needCheckup ? "warning" : "ok"
        }`}
      >
        {bmiCheckupAdvice.needCheckup
          ? "A clinic check-up is recommended."
          : "No urgent check-up needed based on BMI alone."}
      </div>

      <button
        type="button"
        className="bmi-popup-btn"
        onClick={() => setShowBmiPopup(false)}
      >
        OK
      </button>
    </div>
  </div>
)}
          </footer>
        </main>
      </div>
    </div>
  );
}