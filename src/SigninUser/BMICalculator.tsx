import { useState } from "react";
import UserSidebar from "../Categories/UserSidebar";
import "./BMICalculator.css";

const nearbyClinics = [
  {
    id: 1,
    name: "CareClinic",
    address: "133 Mapile- St... New York, NY",
    distance: "0.5 km",
    phone: "Call: (555) 897 6943",
    extra: "0.5 km",
    avatar: "👨‍⚕️",
  },
  {
    id: 2,
    name: "Dr. David Brown",
    address: "455-Cak, Are . Brooklyn, MyC",
    distance: "1.2 km",
    phone: "Call: (555) 125-9576",
    extra: "1.2 km",
    avatar: "👨‍⚕️",
  },
  {
    id: 3,
    name: "Dr. David Brown",
    address: "455-Cak, Are . Brooklyn, MyC",
    distance: "1.2 km",
    phone: "Call: (555) 125-9576",
    extra: "1.2 km",
    avatar: "👨‍⚕️",
  },
 {
    id: 4,
    name: "CareClinic",
    address: "133 Mapile- St... New York, NY",
    distance: "0.5 km",
    phone: "Call: (555) 897 6943",
    extra: "0.5 km",
    avatar: "👨‍⚕️",
  },
];

export default function BMICalculator() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [unit, setUnit] = useState("Metric");
  const [age, setAge] = useState("43");
  const [weight, setWeight] = useState("73");
  const [height, setHeight] = useState("170");

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
                    <span className="input-arrow">⌄</span>
                  </div>

                  <div className="bmi-input-row split">
                    <div className="split-left">
                      <span className="input-icon">🫀</span>
                      <span className="label-text">Weight (kg)</span>
                    </div>
                    <input
                      type="text"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                    <span className="unit-text">kg</span>
                  </div>

                  <div className="bmi-input-row split">
                    <div className="split-left">
                      <span className="input-icon">🧍</span>
                      <span className="label-text">Height (cm)</span>
                    </div>
                    <input
                      type="text"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                    <span className="unit-text">cm</span>
                  </div>
                </div>

                <button type="button" className="bmi-primary-btn">
                  Calculate BMI
                </button>
              </div>

              <div className="bmi-result-card">
                <h2>
                  Your BMI Result: <span>25.8</span>
                </h2>

                <div className="bmi-scale-wrap">
                  <div className="bmi-scale-bar">
                    <span className="seg blue"></span>
                    <span className="seg teal"></span>
                    <span className="seg green"></span>
                    <span className="seg orange"></span>
                    <span className="seg red"></span>
                    <div className="bmi-indicator"></div>
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
                  A BMI between 25 and 29.9 is considered overweight for adults.
                  Consult your doctor for a health assessment.
                </p>
              </div>

              <div className="bmi-tip-card">
                <div className="tip-icon">🍏</div>
                <p>
                  <strong>Eat a balanced diet</strong> rich in fruits, vegetable,
                  lean proteins, and whole grains. Limit sugary foods and drinks.
                </p>
              </div>
            </div>

            <div className="bmi-right-panel">
  <div className="near-clinic-card only-card">
    <h3>Near Clinics</h3>

    <div className="clinic-list">
      {nearbyClinics.map((clinic) => (
        <div key={clinic.id} className="clinic-item">
          <div className="clinic-left">
            <div className="clinic-avatar">{clinic.avatar}</div>

            <div className="clinic-info">
              <h4>{clinic.name}</h4>
              <p>{clinic.address}</p>

              <div className="clinic-meta">
                <span>📞 {clinic.phone}</span>
                <span>•</span>
                <span>{clinic.extra}</span>
              </div>
            </div>
          </div>

          <div className="clinic-right">
            <div className="clinic-distance">📍 {clinic.distance}</div>
            <button type="button" className="near-btn">
              Near Me
            </button>
          </div>
        </div>
      ))}
    </div>
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
          </footer>
        </main>
      </div>
    </div>
  );
}