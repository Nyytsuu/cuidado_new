import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import UserSidebar from "../Categories/UserSidebar";
import VoiceAssistantPopup from "./VoiceAssistantPopup";
import "./Cardio.css";
import searchIcon from "../img/search.png";

type BodySystemMenuItem = {
  id: number;
  slug: string;
  icon: string | null;
  name: string;
};

type BodySystemDetailsType = {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  short_description: string | null;
  hero_title: string | null;
  hero_description: string | null;
  hero_image: string | null;
  overview_title: string | null;
  overview_content: string | null;
  diagram_image: string | null;
  clinic_cta_label: string | null;
};

type ConditionItem = {
  condition_id: number;
  slug: string | null;
  condition_name: string;
  description: string | null;
  thumbnail_image: string | null;
  hero_image: string | null;
  is_common: number;
  is_featured: number;
};

type ArticleItem = {
  id: number;
  title: string;
  slug: string;
};

type PreventionTip = {
  id: number;
  tip_text: string;
};

type HealthFact = {
  id: number;
  title: string | null;
  fact_text: string;
};

type SymptomItem = {
  symptom_id: number;
  symptom_name: string;
};

const quickActions = [
  { id: "symptoms", icon: "🩺", label: "Check Symptoms", active: true },
  { id: "clinics", icon: "📍", label: "Find Clinics" },
  { id: "emergency", icon: "🧰", label: "Emergency Guide" },
];

export default function BodySystemDetails() {
  const navigate = useNavigate();
  const { slug } = useParams();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [bodySystems, setBodySystems] = useState<BodySystemMenuItem[]>([]);
  const [bodySystem, setBodySystem] = useState<BodySystemDetailsType | null>(null);
  const [conditions, setConditions] = useState<ConditionItem[]>([]);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomItem[]>([]);
  const [preventionTips, setPreventionTips] = useState<PreventionTip[]>([]);
  const [healthFacts, setHealthFacts] = useState<HealthFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedSlug = slug || "cardiovascular";

  useEffect(() => {
    const loadBodySystems = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/health/body-systems");
        if (!res.ok) throw new Error("Failed to load body systems");

        const data = await res.json();
        setBodySystems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load body systems:", err);
      }
    };

    loadBodySystems();
  }, []);

 useEffect(() => {
  const loadPageData = async () => {
    try {
      setLoading(true);
      setError("");

      const urls = {
        bodySystem: `http://localhost:5000/api/health/body-systems/${selectedSlug}`,
        conditions: `http://localhost:5000/api/health/body-systems/${selectedSlug}/conditions`,
        articles: `http://localhost:5000/api/health/body-systems/${selectedSlug}/articles`,
        symptoms: `http://localhost:5000/api/health/body-systems/${selectedSlug}/symptoms`,
        prevention: `http://localhost:5000/api/health/body-systems/${selectedSlug}/prevention-tips`,
        facts: `http://localhost:5000/api/health/body-systems/${selectedSlug}/facts`,
      };

      const [
        bodySystemRes,
        conditionsRes,
        articlesRes,
        symptomsRes,
        preventionRes,
        factsRes,
      ] = await Promise.all([
        fetch(urls.bodySystem),
        fetch(urls.conditions),
        fetch(urls.articles),
        fetch(urls.symptoms),
        fetch(urls.prevention),
        fetch(urls.facts),
      ]);

      console.log("bodySystemRes", bodySystemRes.status, urls.bodySystem);
      console.log("conditionsRes", conditionsRes.status, urls.conditions);
      console.log("articlesRes", articlesRes.status, urls.articles);
      console.log("symptomsRes", symptomsRes.status, urls.symptoms);
      console.log("preventionRes", preventionRes.status, urls.prevention);
      console.log("factsRes", factsRes.status, urls.facts);

      if (!bodySystemRes.ok) throw new Error(`Body system failed: ${bodySystemRes.status}`);
      if (!conditionsRes.ok) throw new Error(`Conditions failed: ${conditionsRes.status}`);
      if (!articlesRes.ok) throw new Error(`Articles failed: ${articlesRes.status}`);
      if (!symptomsRes.ok) throw new Error(`Symptoms failed: ${symptomsRes.status}`);
      if (!preventionRes.ok) throw new Error(`Prevention tips failed: ${preventionRes.status}`);
      if (!factsRes.ok) throw new Error(`Facts failed: ${factsRes.status}`);

      const bodySystemData = await bodySystemRes.json();
      const conditionsData = await conditionsRes.json();
      const articlesData = await articlesRes.json();
      const symptomsData = await symptomsRes.json();
      const preventionData = await preventionRes.json();
      const factsData = await factsRes.json();

      setBodySystem(bodySystemData || null);
      setConditions(Array.isArray(conditionsData) ? conditionsData : []);
      setArticles(Array.isArray(articlesData) ? articlesData : []);
      setSymptoms(Array.isArray(symptomsData) ? symptomsData : []);
      setPreventionTips(Array.isArray(preventionData) ? preventionData : []);
      setHealthFacts(Array.isArray(factsData) ? factsData : []);
    } catch (err) {
      console.error("Body system page error:", err);
      setError(err instanceof Error ? err.message : "Failed to load health information.");
    } finally {
      setLoading(false);
    }
  };

  loadPageData();
}, [selectedSlug]);

  const filteredBodySystems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return bodySystems;

    return bodySystems.filter((item) =>
      item.name.toLowerCase().includes(query)
    );
  }, [bodySystems, search]);

  const displayedConditions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conditions;

    return conditions.filter(
      (item) =>
        item.condition_name.toLowerCase().includes(query) ||
        (item.description || "").toLowerCase().includes(query)
    );
  }, [conditions, search]);

  const handleBodySystemClick = (systemSlug: string) => {
    navigate(`/health/body-system/${systemSlug}`);
  };

  const handleConditionClick = (item: ConditionItem) => {
    navigate(`/health/condition/${item.slug || item.condition_id}`);
  };

  const handleQuickActionClick = (actionId: string) => {
    if (actionId === "symptoms") {
      navigate("/symptom-checker");
      return;
    }

    if (actionId === "clinics") {
      navigate("/find-clinic");
      return;
    }

    if (actionId === "emergency") {
      navigate("/emergency-guide");
    }
  };

  const handleArticleClick = (articleSlug: string) => {
    navigate(`/health/article/${articleSlug}`);
  };

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
                      className={`menu-item ${selectedSlug === item.slug ? "active" : ""}`}
                      onClick={() => handleBodySystemClick(item.slug)}
                    >
                      <div className="menu-item-left">
                        <span className="menu-icon">{item.icon || "🩺"}</span>
                        <span className="menu-text">{item.name}</span>
                      </div>
                      <span className="menu-arrow">›</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="left-card">
                <h3 className="left-section-title">What are you looking?</h3>
                <div className="menu-list">
                  {quickActions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`quick-item ${item.active ? "active" : ""}`}
                      onClick={() => handleQuickActionClick(item.id)}
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
                <h3>💡 {healthFacts[0]?.title || "Did You Know?"}</h3>
                <p>
                  {healthFacts[0]?.fact_text ||
                    "Health facts will appear here once loaded from the database."}
                </p>
              </div>
            </aside>

            <section className="main-panel">
              {loading ? (
                <div className="hero-card">
                  <p>Loading health information...</p>
                </div>
              ) : error ? (
                <div className="hero-card">
                  <p>{error}</p>
                </div>
              ) : (
                <>
                  <section className="hero-card">
                    <div className="hero-left">
                      <div className="hero-heart">{bodySystem?.icon || "🩺"}</div>
                      <div>
                        <h1>{bodySystem?.hero_title || bodySystem?.name || "Health Topic"}</h1>
                        <p>
                          {bodySystem?.hero_description ||
                            bodySystem?.short_description ||
                            "Learn more about this health topic."}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="clinic-btn"
                      onClick={() => navigate("/find-clinic")}
                    >
                      {bodySystem?.clinic_cta_label || "Find Clinics"}
                    </button>
                  </section>

                  <section className="overview-grid">
                    <div className="overview-card">
                      <h2>{bodySystem?.overview_title || "Overview"}</h2>
                      <p>
                        {bodySystem?.overview_content ||
                          "Overview content will appear here once loaded from the database."}
                      </p>
                      <button type="button" className="diagram-link">
                        View diagram ›
                      </button>
                    </div>

                    <div className="heart-visual-card">
                      <div className="heart-visual">{bodySystem?.icon || "🫀"}</div>
                      <div className="heartbeat-line"></div>
                    </div>

                    <div className="related-card">
                      <h3>Related Articles</h3>
                      <div className="related-list">
                        {articles.length > 0 ? (
                          articles.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="related-item"
                              onClick={() => handleArticleClick(item.slug)}
                            >
                              <span>{item.title}</span>
                              <span>›</span>
                            </button>
                          ))
                        ) : (
                          <p>No related articles found.</p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="bottom-grid">
                    <div className="diseases-card">
                      <h2>Common {bodySystem?.name || "Health"} Conditions</h2>

                      <div className="disease-list">
                        {displayedConditions.length > 0 ? (
                          displayedConditions.map((item, index) => (
                            <button
                              key={item.condition_id}
                              type="button"
                              className="disease-item"
                              onClick={() => handleConditionClick(item)}
                            >
                              <div className="disease-left">
                                <div className="disease-icon">
                                  {index % 2 === 0 ? "🫀" : "❤️"}
                                </div>
                                <div className="disease-content">
                                  <h4>{item.condition_name}</h4>
                                  <p>
                                    {item.description ||
                                      "No description available for this condition."}
                                  </p>
                                </div>
                              </div>

                              {item.hero_image || item.thumbnail_image ? (
                                <div className="mini-preview">
                                  <div className="mini-image"></div>
                                  <span>View details</span>
                                </div>
                              ) : (
                                <span className="menu-arrow disease-arrow">›</span>
                              )}
                            </button>
                          ))
                        ) : (
                          <p>No conditions found.</p>
                        )}
                      </div>
                    </div>

                    <div className="symptoms-card">
                      <h3>Symptoms</h3>
                      <ul>
                        {symptoms.length > 0 ? (
                          symptoms.map((item) => (
                            <li key={item.symptom_id}>{item.symptom_name}</li>
                          ))
                        ) : (
                          <li>No symptoms found.</li>
                        )}
                      </ul>

                      <button
                        type="button"
                        className="tips-btn"
                        onClick={() => navigate("/symptom-checker")}
                      >
                        Read health tips ›
                      </button>
                    </div>

                    <div className="prevention-card">
                      <h3>Prevention Tips</h3>
                      <ul>
                        {preventionTips.length > 0 ? (
                          preventionTips.map((item) => <li key={item.id}>{item.tip_text}</li>)
                        ) : (
                          <li>No prevention tips found.</li>
                        )}
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

                      <VoiceAssistantPopup className="voice-fab" ariaLabel="Voice Search">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          className="voice-fab-svg"
                        >
                          <path d="M16 12V6c0-2.21-1.79-4-4-4S8 3.79 8 6v6c0 2.21 1.79 4 4 4s4-1.79 4-4m-6 0V6c0-1.1.9-2 2-2s2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2"></path>
                          <path d="M18 12c0 3.31-2.69 6-6 6s-6-2.69-6-6H4c0 4.07 3.06 7.44 7 7.93V22h2v-2.07c3.94-.49 7-3.86 7-7.93z"></path>
                        </svg>
                      </VoiceAssistantPopup>
                    </div>
                  </section>
                </>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
