import { useState } from "react";
import UserSidebar from "../Categories/UserSidebar";
import "./Cardio.css";
import searchIcon from "../img/search.png";

const bodySystems = [
  { id: "cardio", icon: "❤️", title: "Cardiovascular", active: true },
  { id: "resp", icon: "🫁", title: "Respiratory" },
  { id: "digest", icon: "🫀", title: "Digestive" },
  { id: "derma", icon: "🧴", title: "Dermatology" },
  { id: "mental", icon: "🧠", title: "Mental Health" },
];

const quickActions = [
  { id: "symptoms", icon: "🩺", label: "Check Symptoms", active: true },
  { id: "clinics", icon: "📍", label: "Find Clinics" },
  { id: "emergency", icon: "🧰", label: "Emergency Guide" },
];

const diseaseList = [
  {
    id: "cad",
    icon: "🫀",
    title: "Coronary Artery Disease (CAD)",
    desc: "Narrowing of the coronary arteries due to plaque buildup, reducing blood flow to the heart.",
    withPreview: true,
  },
  {
    id: "attack",
    icon: "❤️",
    title: "Heart Attack",
    desc: "Occurs when blood flow to a part of the heart is blocked, often due to a blood clot.",
  },
  {
    id: "arry",
    icon: "🫀",
    title: "Arrhythmia",
    desc: "Irregular heartbeats due to disrupted electrical impulses.",
  },
  {
    id: "failure",
    icon: "❤️",
    title: "Heart Failure",
    desc: "The heart is unable to pump blood effectively leading to fluid buildup in the lungs and body.",
  },
];

const relatedArticles = [
  "Coronary Artery Disease",
  "Healthy Eating Tips",
  "Lowering High Blood Pressure",
];

const symptoms = [
  "Chest pain or discomfort",
  "Shortness of breath",
  "Fatigue",
  "Dizziness or lightheadedness",
  "Swelling in the legs, ankles, or feet",
];

const preventionTips = [
  "Eat a healthy diet rich in fruits, vegetables, whole grains, and lean proteins.",
  "Exercise regularly, aiming for at least 150 minutes of moderate-intensity exercise per week.",
  "Maintain a healthy weight and quit smoking if applicable.",
  "Check your blood pressure and cholesterol levels regularly.",
  "Manage stress.",
];

export default function Cardio() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const matches = (...values: string[]) =>
    !query || values.some((value) => value.toLowerCase().includes(query));
  const filteredBodySystems = bodySystems.filter((item) => matches(item.title));
  const filteredQuickActions = quickActions.filter((item) => matches(item.label));
  const filteredDiseaseList = diseaseList.filter((item) =>
    matches(item.title, item.desc)
  );
  const filteredRelatedArticles = relatedArticles.filter((item) => matches(item));
  const filteredSymptoms = symptoms.filter((item) => matches(item));
  const filteredPreventionTips = preventionTips.filter((item) => matches(item));

  return (
    <div className={`browse-health-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search health topics..."
      />

      <div className="browse-page-content">
        <main className="browse-health-main">
          <div className="health-browser-layout">
            <aside className="left-panel">
              <div className="left-card">
                <h2 className="left-title">Browse Health Topics</h2>

                <div className="left-search">
                  <img src={searchIcon} alt="Search" />
                  <input
                    type="text"
                    placeholder="Search for health topics..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="left-card">
                <h3 className="left-section-title">Body System</h3>
                <div className="menu-list">
                  {filteredBodySystems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`menu-item ${item.active ? "active" : ""}`}
                    >
                      <div className="menu-item-left">
                        <span className="menu-icon">{item.icon}</span>
                        <span className="menu-text">{item.title}</span>
                      </div>
                      <span className="menu-arrow">›</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="left-card">
                <h3 className="left-section-title">What are you looking?</h3>
                <div className="menu-list">
                  {filteredQuickActions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`quick-item ${item.active ? "active" : ""}`}
                    >
                      <div className="menu-item-left">
                        <span className="quick-icon">{item.icon}</span>
                        <span className="menu-text">{item.label}</span>
                      </div>
                      <span className="menu-arrow">›</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="left-card did-you-know">
                <h3>💡 Did You Know?</h3>
                <p>
                  A healthy lifestyle, including a balanced diet and regular exercise,
                  can reduce the risk of heart disease by up to 90%.
                </p>
              </div>
            </aside>

            <section className="main-panel">
              <section className="hero-card">
                <div className="hero-left">
                  <div className="hero-heart">🫀</div>
                  <div className="hero-copy">
                    <h1>Heart</h1>
                    <p>
                      Learn about heart health, the cardiovascular system, common heart
                      diseases, preventative tips, and more.
                    </p>
                  </div>
                </div>

                <button type="button" className="clinic-btn">
                  Find Cardiology Clinics
                </button>
              </section>

              <section className="overview-grid">
                <div className="overview-card">
                  <h2>Overview</h2>
                  <p>
                    The heart is a muscular organ that pumps blood throughout the body
                    via the cardiovascular system. It beats approximately 1000 times a
                    day and circulates about 2,000 gallons of blood daily.
                  </p>
                  <button type="button" className="diagram-link">
                    View diagram of the heart ›
                  </button>
                </div>

                <div className="visual-article-row">
                  <div className="heart-visual-card">
                    <div className="heartbeat-line"></div>
                    <div className="heart-visual">🫀</div>
                  </div>

                  <div className="related-card">
                    <h3>Related Articles</h3>
                    <div className="related-list">
                      {filteredRelatedArticles.map((item) => (
                        <button key={item} type="button" className="related-item">
                          <span>{item}</span>
                          <span>›</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="bottom-grid">
                <div className="diseases-card">
                  <h2>Common Heart Diseases</h2>

                  <div className="disease-list">
                    {filteredDiseaseList.map((item) => (
                      <button key={item.id} type="button" className="disease-item">
                        <div className="disease-left">
                          <div className="disease-icon">{item.icon}</div>
                          <div className="disease-content">
                            <h4>{item.title}</h4>
                            <p>{item.desc}</p>
                          </div>
                        </div>

                        {item.withPreview ? (
                          <div className="mini-preview">
                            <div className="mini-image"></div>
                            <span>View diagram of the heart</span>
                          </div>
                        ) : (
                          <span className="menu-arrow disease-arrow">›</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="side-cards-column">
                  <div className="symptoms-card">
                    <h3>Symptoms of Heart Problems</h3>
                    <ul>
                      {filteredSymptoms.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <button type="button" className="tips-btn">
                      Read heart health tips ›
                    </button>
                  </div>

                  <div className="prevention-card">
                    <h3>Prevention Tips</h3>
                    <ul>
                      {filteredPreventionTips.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="footer-voice-row">
                    <footer className="heart-footer">
                      <div className="footer-links">
                        <span>About Us</span>
                        <span>|</span>
                        <span>Contact</span>
                        <span>|</span>
                        <span>Privacy Policy</span>
                        <span>|</span>
                        <span>Terms of Service</span>
                      </div>
                      <p>
                        This is a general health information page. For serious symptoms,
                        consult a doctor immediately.
                      </p>
                    </footer>

                    <button type="button" className="voice-fab" aria-label="Voice Search">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        className="voice-fab-svg"
                      >
                        <path d="M16 12V6c0-2.21-1.79-4-4-4S8 3.79 8 6v6c0 2.21 1.79 4 4 4s4-1.79 4-4m-6 0V6c0-1.1.9-2 2-2s2 .9 2 2v6c0 1.1-.9 1.9-2 2s-2-.9-2-2"></path>
                        <path d="M18 12c0 3.31-2.69 6-6 6s-6-2.69-6-6H4c0 4.07 3.06 7.44 7 7.93V22h2v-2.07c3.94-.49 7-3.86 7-7.93z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </section>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
