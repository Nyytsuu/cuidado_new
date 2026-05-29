import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import UserSidebar from "../Categories/UserSidebar";
import VoiceAssistantPopup from "./VoiceAssistantPopup";
import { apiUrl, getConfiguredBackendUrl } from "../sharedBackendFetch";
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
  id: number | string;
  title: string;
  slug?: string | null;
  searchQuery?: string | null;
  subtitle?: string | null;
  content?: string | null;
  image?: string | null;
  url?: string | null;
  source?: string | null;
  publishedAt?: string | null;
};

type HealthFact = {
  id: number;
  title: string | null;
  fact_text: string;
};

type SymptomItem = {
  symptom_id: number;
  symptom_name: string;
  description?: string | null;
  category?: string | null;
  is_red_flag?: number | boolean | null;
};

const quickActions = [
  { id: "symptoms", icon: "🩺", label: "Check Symptoms", active: true },
  { id: "clinics", icon: "📍", label: "Find Clinics" },
  { id: "emergency", icon: "🧰", label: "Emergency Guide" },
];

const toRelatedArticleSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const createConditionArticleFallbacks = (topic?: string | null): ArticleItem[] => {
  const cleanTopic = String(topic || "health").trim() || "health";
  const titles = [
    `${cleanTopic} overview and care`,
    `Common ${cleanTopic} symptoms`,
    `${cleanTopic} treatment options`,
    `${cleanTopic} care facts`,
    `When to seek care for ${cleanTopic}`,
  ];

  return titles.map((title, index) => ({
    id: `fallback-condition-article-${toRelatedArticleSlug(title)}-${index + 1}`,
    title,
    slug: toRelatedArticleSlug(title),
    searchQuery: cleanTopic,
    subtitle: `A quick guide for ${cleanTopic.toLowerCase()} care and awareness.`,
    content:
      `This related guide helps patients review ${cleanTopic.toLowerCase()} basics, possible symptoms, care options, and when to ask a healthcare professional for help.`,
    source: "Cuidado MediHelp",
  }));
};

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
  return `${getConfiguredBackendUrl()}/${path.replace(/^\/+/, "")}`;
};

export default function ConditionDetails() {
  const navigate = useNavigate();
  const { slug } = useParams();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [supportPopup, setSupportPopup] = useState<"care" | "help" | "body" | null>(null);

  const [bodySystems, setBodySystems] = useState<BodySystemMenuItem[]>([]);
  const [condition, setCondition] = useState<ConditionDetailsType | null>(null);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomItem[]>([]);
  const [healthFacts, setHealthFacts] = useState<HealthFact[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomItem | null>(null);
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

  useLayoutEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document
        .querySelectorAll<HTMLElement>(
          ".condition-details-page, .condition-details-page .browse-page-content, .condition-details-page .browse-health-main, .condition-details-page .main-panel"
        )
        .forEach((element) => {
          element.scrollTop = 0;
        });
    };

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    resetScroll();

    const frame = window.requestAnimationFrame(resetScroll);
    const timer = window.setTimeout(resetScroll, 150);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [selectedSlug, condition?.condition_id, loading]);

  useEffect(() => {
    const loadBodySystems = async () => {
      try {
        const res = await fetch(apiUrl("/api/health/body-systems"));
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
          details: apiUrl(`/api/health/condition/${selectedSlug}?user_id=${userId}`),
          symptoms: apiUrl(`/api/health/condition/${selectedSlug}/symptoms`),
          articles: apiUrl(`/api/health/condition/${selectedSlug}/articles`),
          facts: apiUrl(`/api/health/condition/${selectedSlug}/facts`),
        };

        const [detailsRes, symptomsRes, articlesRes, factsRes] =
          await Promise.all([
            fetch(urls.details),
            fetch(urls.symptoms),
            fetch(urls.articles),
            fetch(urls.facts),
          ]);

        if (!detailsRes.ok) throw new Error(`Condition failed: ${detailsRes.status}`);

        const detailsData = await detailsRes.json();
        const symptomsData = symptomsRes.ok ? await symptomsRes.json() : null;
        const articlesData = articlesRes.ok ? await articlesRes.json() : [];
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

  const handleArticleClick = (article: ArticleItem) => {
    setSelectedArticle(article);
  };

  const conditionImageUrl = toAssetUrl(condition?.hero_image || condition?.thumbnail_image);
  const bodySystemName = condition?.body_system_name || "General Health";
  const adviceLabel = toTitle(condition?.advice_level) || "General Guidance";
  const redFlagSymptoms = symptoms.filter((item) => Number(item.is_red_flag) === 1);
  const hasSymptomSearch = search.trim().length > 0;
  const symptomsToShow = hasSymptomSearch ? filteredSymptoms : symptoms;
  const relatedArticles = useMemo(
    () =>
      articles.length > 0
        ? articles
        : createConditionArticleFallbacks(condition?.condition_name || bodySystemName),
    [articles, condition?.condition_name, bodySystemName]
  );

  return (
    <div
      className={`browse-health-page condition-details-page ${
        sidebarExpanded ? "sidebar-expanded" : ""
      }`}
    >
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
                      <div className="related-card-header">
                        <h3>Related Articles</h3>
                        {relatedArticles.length > 0 && (
                          <span className="related-count-pill">
                            {relatedArticles.length}
                          </span>
                        )}
                      </div>
                      <div className="related-list">
                        {relatedArticles.length > 0 ? (
                          relatedArticles.map((item, idx) => {
                            const icons = ["\uD83D\uDCCB", "\uD83D\uDD2C", "\u2764\uFE0F", "\uD83D\uDC8A", "\uD83D\uDCA1", "\uD83C\uDFE5"];
                            return (
                            <button
                              key={item.id}
                              type="button"
                              className="related-item"
                              onClick={() => handleArticleClick(item)}
                            >
                              <span className="related-item-icon">
                                {icons[idx % icons.length]}
                              </span>
                              <span className="related-item-body">
                                <span className="related-item-title">
                                  {item.title}
                                </span>
                                {item.source && (
                                  <span className="related-item-source">
                                    {item.source}
                                  </span>
                                )}
                              </span>
                              <span>›</span>
                            </button>
                            );
                          })
                        ) : (
                          <div className="empty-state compact">
                            Related reading will appear here when articles are connected.
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
                            <button
                              key={item.symptom_id}
                              type="button"
                              className={`disease-item ${
                                Number(item.is_red_flag) === 1 ? "red-flag" : ""
                              }`}
                              onClick={() => setSelectedSymptom(item)}
                            >
                              <div className="disease-left">
                                <div className="disease-icon">🩺</div>
                                <div className="disease-content">
                                  <h4>{item.symptom_name}</h4>
                                  <p>
                                    {(() => {
                                      const text = item.description
                                        ? item.description
                                        : Number(item.is_red_flag) === 1
                                        ? "Red flag symptom. Consider prompt medical attention."
                                        : item.category
                                          ? `${toTitle(item.category)} symptom associated with this condition.`
                                          : "Common symptom associated with this condition.";
                                      return text.length > 50 ? text.slice(0, 50).trimEnd() + "…" : text;
                                    })()}
                                  </p>
                                </div>
                              </div>
                              <span className="menu-arrow disease-arrow">Open</span>
                            </button>
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
                      {/* ── Care Guidance ── */}
                      <div className="condition-support-card">
                        <div className="support-card-icon support-card-icon--care">
                          <span>CARE</span>
                        </div>
                        <div className="support-card-body">
                          <span className="support-card-label">Care Guidance</span>
                          <p className="support-card-value">
                            {condition?.advice_level
                              ? `Advice level: ${adviceLabel}`
                              : "Monitor symptoms and use the symptom checker."}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="support-card-open"
                          onClick={() => setSupportPopup("care")}
                        >
                          Open
                        </button>
                      </div>

                      {/* ── When to Seek Help ── */}
                      <div className="condition-support-card">
                        <div className="support-card-icon support-card-icon--help">
                          <span>HELP</span>
                        </div>
                        <div className="support-card-body">
                          <span className="support-card-label">When to Seek Help</span>
                          <p className="support-card-value">
                            {condition?.when_to_seek_help ||
                              "Contact a clinic if symptoms worsen or last longer than expected."}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="support-card-open"
                          onClick={() => setSupportPopup("help")}
                        >
                          Open
                        </button>
                      </div>

                      {/* ── Related Body System ── */}
                      <div className="condition-support-card">
                        <div className="support-card-icon support-card-icon--body">
                          <span>BODY</span>
                        </div>
                        <div className="support-card-body">
                          <span className="support-card-label">Related Body System</span>
                          <p className="support-card-value support-card-value--system">
                            {bodySystemName}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="support-card-open"
                          onClick={() => setSupportPopup("body")}
                        >
                          Open
                        </button>
                      </div>
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
                      <h3>Did You Know?</h3>
                      <ul>
                        {healthFacts.length > 0 ? (
                          healthFacts.map((item) => (
                            <li key={item.id}>
                              {item.title ? <strong>{item.title}: </strong> : null}
                              {item.fact_text}
                            </li>
                          ))
                        ) : (
                          <li>Helpful health facts will appear here when they are added.</li>
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

      {/* ── Support-card popup overlay ── */}
      {selectedSymptom && (
        <div
          className="related-article-modal-overlay"
          onClick={() => setSelectedSymptom(null)}
        >
          <article
            className="symptom-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="symptom-modal-title"
          >
            <button
              type="button"
              className="related-article-modal-close"
              onClick={() => setSelectedSymptom(null)}
              aria-label="Close symptom details"
            >
              x
            </button>

            <div className="symptom-modal-head">
              <div className="symptom-modal-icon">
                {Number(selectedSymptom.is_red_flag) === 1 ? "!" : "+"}
              </div>
              <div className="symptom-modal-meta">
                {selectedSymptom.category && (
                  <span className="symptom-modal-category">
                    {toTitle(selectedSymptom.category)}
                  </span>
                )}
                {Number(selectedSymptom.is_red_flag) === 1 && (
                  <span className="symptom-modal-redflag">Red Flag</span>
                )}
              </div>
              <h2 id="symptom-modal-title">{selectedSymptom.symptom_name}</h2>
            </div>

            <div className="symptom-modal-body">
              {Number(selectedSymptom.is_red_flag) === 1 && (
                <div className="symptom-modal-warning">
                  <span>!</span>
                  <p>
                    This is a red flag symptom. If you or someone you know is
                    experiencing this, seek prompt medical attention.
                  </p>
                </div>
              )}

              <h3>About this symptom</h3>
              <p>
                {selectedSymptom.description ||
                  (Number(selectedSymptom.is_red_flag) === 1
                    ? "This symptom may indicate a serious underlying condition. Prompt medical evaluation is recommended."
                    : selectedSymptom.category
                      ? `This is a ${toTitle(selectedSymptom.category).toLowerCase()} symptom commonly associated with ${condition?.condition_name || "this condition"}.`
                      : `This symptom is associated with ${condition?.condition_name || "this condition"}. Monitor its progression and consult a healthcare professional if it worsens.`)}
              </p>

              <div className="symptom-modal-condition-tag">
                <span>Linked condition</span>
                <strong>{condition?.condition_name || "This condition"}</strong>
              </div>
            </div>
          </article>
        </div>
      )}

      {selectedArticle && (
        <div
          className="related-article-modal-overlay"
          onClick={() => setSelectedArticle(null)}
        >
          <article
            className="related-article-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="related-article-modal-close"
              onClick={() => setSelectedArticle(null)}
              aria-label="Close related article"
            >
              x
            </button>

            <div className="related-article-modal-head">
              <span>{selectedArticle.source || "Cuidado MediHelp"}</span>
              <h2>{selectedArticle.title}</h2>
              {selectedArticle.subtitle && <p>{selectedArticle.subtitle}</p>}
            </div>

            <div className="related-article-modal-body">
              <h3>Summary</h3>
              <p>
                {selectedArticle.content ||
                  `Review ${selectedArticle.title.toLowerCase()} and use it as a starting point for discussing symptoms, care options, or next steps with a healthcare professional.`}
              </p>

              {selectedArticle.url ? (
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="related-article-link"
                >
                  Read full article
                </a>
              ) : (
                <button
                  type="button"
                  className="related-article-link"
                  onClick={() => {
                    const query =
                      selectedArticle.source === "Cuidado MediHelp"
                        ? condition?.condition_name || bodySystemName
                        : selectedArticle.searchQuery ||
                          selectedArticle.title ||
                          selectedArticle.slug ||
                          "health";
                    navigate(`/browse-health?search=${encodeURIComponent(query)}`);
                  }}
                >
                  Search related topics
                </button>
              )}
            </div>
          </article>
        </div>
      )}

      {supportPopup !== null && condition && (
        <div
          className="support-popup-backdrop"
          onClick={() => setSupportPopup(null)}
        >
          <div
            className="support-popup"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              className="support-popup-close"
              onClick={() => setSupportPopup(null)}
              aria-label="Close"
            >
              ✕
            </button>

            {/* ── Care Guidance popup ── */}
            {supportPopup === "care" && (
              <>
                <div className="support-popup-icon support-card-icon--care">
                  <span>CARE</span>
                </div>
                <h2 className="support-popup-title">Care Guidance</h2>
                <p className="support-popup-subtitle">
                  {condition.condition_name}
                </p>
                <div className="support-popup-body">
                  <div className="support-popup-row">
                    <span>Advice level</span>
                    <strong>{adviceLabel}</strong>
                  </div>
                  <p className="support-popup-text">
                    {condition.advice_level === "self_care" || condition.advice_level === "self care"
                      ? "This condition can generally be managed at home with rest, hydration, and over-the-counter remedies. Monitor your symptoms and seek help if they worsen or do not improve within a few days."
                      : condition.advice_level === "see_doctor" || condition.advice_level === "see doctor"
                      ? "It is recommended to consult a healthcare professional for this condition. A doctor can provide a proper diagnosis and treatment plan tailored to your needs."
                      : condition.advice_level === "emergency"
                      ? "This condition may require immediate medical attention. Go to the nearest emergency room or call emergency services if you or someone else is experiencing severe symptoms."
                      : "Follow general health guidance and use the symptom checker for a more personalised assessment. Contact a clinic if you are unsure about your symptoms."}
                  </p>
                </div>
                <button
                  type="button"
                  className="support-popup-action"
                  onClick={() => { setSupportPopup(null); navigate("/symptom-checker"); }}
                >
                  Check Symptoms
                </button>
              </>
            )}

            {/* ── When to Seek Help popup ── */}
            {supportPopup === "help" && (
              <>
                <div className="support-popup-icon support-card-icon--help">
                  <span>HELP</span>
                </div>
                <h2 className="support-popup-title">When to Seek Help</h2>
                <p className="support-popup-subtitle">
                  {condition.condition_name}
                </p>
                <div className="support-popup-body">
                  <p className="support-popup-text">
                    {condition.when_to_seek_help ||
                      "Contact a clinic if symptoms worsen, last longer than expected, or begin to affect your breathing, hydration, or daily activities. Red flag symptoms such as chest pain, difficulty breathing, or sudden changes in consciousness require immediate emergency care."}
                  </p>
                  {redFlagSymptoms.length > 0 && (
                    <div className="support-popup-flags">
                      <span className="support-popup-flags-label">Red flag symptoms</span>
                      <ul>
                        {redFlagSymptoms.map((s) => (
                          <li key={s.symptom_id}>{s.symptom_name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="support-popup-action"
                  onClick={() => { setSupportPopup(null); navigate("/find-clinic"); }}
                >
                  Find a Clinic
                </button>
              </>
            )}

            {/* ── Related Body System popup ── */}
            {supportPopup === "body" && (
              <>
                <div className="support-popup-icon support-card-icon--body">
                  <span>BODY</span>
                </div>
                <h2 className="support-popup-title">Related Body System</h2>
                <p className="support-popup-subtitle">
                  {condition.condition_name}
                </p>
                <div className="support-popup-body">
                  <div className="support-popup-system-hero">
                    <span className="support-popup-system-icon">
                      {condition.body_system_icon || "🫀"}
                    </span>
                    <strong>{bodySystemName}</strong>
                  </div>
                  <p className="support-popup-text">
                    {condition.body_system_description ||
                      `${condition.condition_name} is grouped under the ${bodySystemName} body system. Explore related conditions and learn more about how this system affects your overall health.`}
                  </p>
                </div>
                <button
                  type="button"
                  className="support-popup-action"
                  onClick={() => {
                    setSupportPopup(null);
                    condition.body_system_slug &&
                      navigate(`/health/body-system/${condition.body_system_slug}`);
                  }}
                >
                  View Body System
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
