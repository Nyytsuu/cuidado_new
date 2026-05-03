import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import UserSidebar from "../Categories/UserSidebar";
import "./Cardio.css";
import searchIcon from "../img/search.png";

type BodySystemMenuItem = {
  id: number;
  slug: string;
  icon: string | null;
  name: string;
};

type ConditionDetailsType = {
  condition_id: number;
  slug: string | null;
  condition_name: string;
  description: string | null;
  advice_level: string | null;
  when_to_seek_help: string | null;
  disclaimer: string | null;
  hero_image: string | null;
  thumbnail_image: string | null;
  body_system_id?: number | null;
  body_system_name?: string | null;
  body_system_slug?: string | null;
  body_system_icon?: string | null;
  body_system_description?: string | null;
  symptoms?: SymptomItem[];
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
  category?: string | null;
  is_red_flag?: number | boolean | null;
};

const quickActions = [
  { id: "symptoms", icon: "🩺", label: "Check Symptoms", active: true },
  { id: "clinics", icon: "📍", label: "Find Clinics" },
  { id: "emergency", icon: "🧰", label: "Emergency Guide" },
];

const API_BASE = "http://localhost:5000";

const toTitle = (value?: string | null) => {
  const text = String(value || "").trim();
  if (!text) return "";

  return text
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const toAssetUrl = (value?: string | null) => {
  const path = String(value || "").trim();
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}/${path.replace(/^\/+/, "")}`;
};

export default function ConditionDetails() {
  const navigate = useNavigate();
  const { slug } = useParams();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [bodySystems, setBodySystems] = useState<BodySystemMenuItem[]>([]);
  const [condition, setCondition] = useState<ConditionDetailsType | null>(null);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomItem[]>([]);
  const [preventionTips, setPreventionTips] = useState<PreventionTip[]>([]);
  const [healthFacts, setHealthFacts] = useState<HealthFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedSlug = slug || "";
  const currentUser = useMemo(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (err) {
      console.error("User parse error:", err);
      return null;
    }
  }, []);
  const userId = currentUser?.id ? Number(currentUser.id) : 0;

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
    const loadConditionData = async () => {
      try {
        setLoading(true);
        setError("");

        const urls = {
          details: `http://localhost:5000/api/health/condition/${selectedSlug}?user_id=${userId}`,
          symptoms: `http://localhost:5000/api/health/condition/${selectedSlug}/symptoms`,
          articles: `http://localhost:5000/api/health/condition/${selectedSlug}/articles`,
          prevention: `http://localhost:5000/api/health/condition/${selectedSlug}/prevention-tips`,
          facts: `http://localhost:5000/api/health/condition/${selectedSlug}/facts`,
        };

        const [detailsRes, symptomsRes, articlesRes, preventionRes, factsRes] =
          await Promise.all([
            fetch(urls.details),
            fetch(urls.symptoms),
            fetch(urls.articles),
            fetch(urls.prevention),
            fetch(urls.facts),
          ]);

        if (!detailsRes.ok) throw new Error(`Condition failed: ${detailsRes.status}`);

        const detailsData = await detailsRes.json();
        const symptomsData = symptomsRes.ok ? await symptomsRes.json() : null;
        const articlesData = articlesRes.ok ? await articlesRes.json() : [];
        const preventionData = preventionRes.ok ? await preventionRes.json() : [];
        const factsData = factsRes.ok ? await factsRes.json() : [];

        setCondition(detailsData || null);
        setSymptoms(
          Array.isArray(symptomsData)
            ? symptomsData
            : Array.isArray(detailsData?.symptoms)
              ? detailsData.symptoms
              : []
        );
        setArticles(Array.isArray(articlesData) ? articlesData : []);
        setPreventionTips(Array.isArray(preventionData) ? preventionData : []);
        setHealthFacts(Array.isArray(factsData) ? factsData : []);
      } catch (err) {
        console.error("Condition page error:", err);
        setError(err instanceof Error ? err.message : "Failed to load condition information.");
      } finally {
        setLoading(false);
      }
    };

    if (selectedSlug) {
      loadConditionData();
    }
  }, [selectedSlug, userId]);

  const filteredBodySystems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return bodySystems;

    return bodySystems.filter((item) => item.name.toLowerCase().includes(query));
  }, [bodySystems, search]);

  const filteredSymptoms = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return symptoms;

    return symptoms.filter((item) => item.symptom_name.toLowerCase().includes(query));
  }, [symptoms, search]);

  const handleBodySystemClick = (systemSlug: string) => {
    navigate(`/health/body-system/${systemSlug}`);
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

  const handleArticleClick = (articleQuery: string) => {
    navigate(`/browse-health?search=${encodeURIComponent(articleQuery)}`);
  };

  const conditionImageUrl = toAssetUrl(condition?.hero_image || condition?.thumbnail_image);
  const bodySystemName = condition?.body_system_name || "General Health";
  const adviceLabel = toTitle(condition?.advice_level) || "General Guidance";
  const redFlagSymptoms = symptoms.filter((item) => Number(item.is_red_flag) === 1);
  const hasSymptomSearch = search.trim().length > 0;
  const symptomsToShow = hasSymptomSearch ? filteredSymptoms : symptoms;
  const supportCards = [
    {
      title: "Care Guidance",
      value:
        condition?.advice_level && condition.advice_level !== "general"
          ? `Advice level: ${adviceLabel}`
          : "Monitor symptoms and use the symptom checker when details are unclear.",
    },
    {
      title: "When To Seek Help",
      value:
        condition?.when_to_seek_help ||
        "Contact a clinic if symptoms worsen, last longer than expected, or affect breathing, hydration, or daily activity.",
    },
    {
      title: "Related Body System",
      value:
        condition?.body_system_description ||
        `This topic is grouped under ${bodySystemName}.`,
    },
  ];

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
                      className={`menu-item ${
                        condition?.body_system_slug === item.slug ? "active" : ""
                      }`}
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
                <h3 className="left-section-title">What are you looking for?</h3>
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
                    "Use this page as a quick guide, then check symptoms or book a clinic when you need care."}
                </p>
              </div>
            </aside>

            <section className="main-panel">
              {loading ? (
                <div className="hero-card">
                  <p>Loading condition information...</p>
                </div>
              ) : error ? (
                <div className="hero-card">
                  <p>{error}</p>
                </div>
              ) : !condition ? (
                <div className="hero-card">
                  <p>Condition not found.</p>
                </div>
              ) : (
                <>
                  <section className="hero-card">
                    <div className="hero-left">
                      <div className="condition-hero-visual">
                        {conditionImageUrl && (
                          <img src={conditionImageUrl} alt={condition.condition_name} />
                        )}
                        {condition.body_system_icon || "🩺"}
                      </div>
                      <div className="hero-copy">
                        <div className="condition-kicker">{bodySystemName}</div>
                        <h1>{condition.condition_name}</h1>
                        <p>
                          {condition.description ||
                            "Learn more about this condition, its symptoms, and prevention."}
                        </p>
                        <div className="condition-meta-pills">
                          <span>{adviceLabel}</span>
                          <span>{symptoms.length} mapped symptoms</span>
                          {redFlagSymptoms.length > 0 ? (
                            <span>{redFlagSymptoms.length} red flag</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="clinic-btn"
                      onClick={() => navigate("/find-clinic")}
                    >
                      Find Clinics
                    </button>
                  </section>

                  <section className="overview-grid">
                    <div className="overview-card">
                      <h2>Overview</h2>
                      <p>
                        {condition.description ||
                          "Condition overview will appear here once loaded from the database."}
                      </p>
                      {condition.disclaimer ? (
                        <p className="condition-disclaimer">{condition.disclaimer}</p>
                      ) : null}
                      <button
                        type="button"
                        className="diagram-link"
                        onClick={() =>
                          condition.body_system_slug &&
                          navigate(`/health/body-system/${condition.body_system_slug}`)
                        }
                      >
                        View related body system ›
                      </button>
                    </div>

                    <div className="condition-guide-card">
                      <h3>At a glance</h3>
                      <div className="condition-guide-list">
                        <div>
                          <span>Body system</span>
                          <strong>{bodySystemName}</strong>
                        </div>
                        <div>
                          <span>Guidance</span>
                          <strong>{adviceLabel}</strong>
                        </div>
                        <div>
                          <span>Symptoms mapped</span>
                          <strong>{symptoms.length}</strong>
                        </div>
                      </div>
                      <div className="heart-visual">{condition.body_system_icon || "🫀"}</div>
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
                              onClick={() => handleArticleClick(item.title)}
                            >
                              <span>{item.title}</span>
                              <span>›</span>
                            </button>
                          ))
                        ) : (
                          <div className="empty-state compact">
                            Related reading will appear here when articles are connected to this
                            body system.
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="bottom-grid">
                    <div className="diseases-card">
                      <h2>Symptoms of {condition.condition_name}</h2>

                      <div className="disease-list">
                        {symptomsToShow.length > 0 ? (
                          symptomsToShow.map((item) => (
                            <div
                              key={item.symptom_id}
                              className={`disease-item ${
                                Number(item.is_red_flag) === 1 ? "red-flag" : ""
                              }`}
                              style={{ cursor: "default" }}
                            >
                              <div className="disease-left">
                                <div className="disease-icon">🩺</div>
                                <div className="disease-content">
                                  <h4>{item.symptom_name}</h4>
                                  <p>
                                    {Number(item.is_red_flag) === 1
                                      ? "Red flag symptom. Consider prompt medical attention."
                                      : item.category
                                        ? `${toTitle(item.category)} symptom associated with this condition.`
                                        : "Common symptom associated with this condition."}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state">
                            {hasSymptomSearch
                              ? "No mapped symptoms match your search."
                              : "No symptoms are mapped to this condition yet."}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="condition-support-grid">
                      {supportCards.map((card) => (
                        <div className="condition-support-card" key={card.title}>
                          <span>{card.title}</span>
                          <p>{card.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="symptoms-card">
                      <h3>Quick Symptoms List</h3>
                      <ul>
                        {symptomsToShow.length > 0 ? (
                          symptomsToShow.map((item) => (
                            <li key={item.symptom_id}>{item.symptom_name}</li>
                          ))
                        ) : (
                          <li>{hasSymptomSearch ? "No matching symptoms." : "No symptoms mapped yet."}</li>
                        )}
                      </ul>

                      <button
                        type="button"
                        className="tips-btn"
                        onClick={() => navigate("/symptom-checker")}
                      >
                        Check symptoms ›
                      </button>
                    </div>

                    <div className="prevention-card">
                      <h3>Prevention Tips</h3>
                      <ul>
                        {preventionTips.length > 0 ? (
                          preventionTips.map((item) => <li key={item.id}>{item.tip_text}</li>)
                        ) : (
                          <li>Prevention tips will appear here when they are added for this body system.</li>
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

                      <button
                        type="button"
                        className="voice-fab"
                        aria-label="Voice Search"
                        onClick={() => navigate("/symptom-checker")}
                      >
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
                      </button>
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
