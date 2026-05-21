import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import UserSidebar from "../Categories/UserSidebar";
import VoiceAssistantPopup from "./VoiceAssistantPopup";
import "./BrowseHealth.css";
import searchIcon from "../img/search.png";
import { apiUrl } from "../sharedBackendFetch";

type TopicCard = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  tag?: string | null;
  slug?: string | null;
  body_system_slug?: string | null;
};

type BodySystem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  slug?: string | null;
  name?: string;
};

type BodySystemApiItem = {
  id: number | string;
  slug?: string | null;
  icon?: string | null;
  title?: string | null;
  subtitle?: string | null;
  short_description?: string | null;
  name?: string | null;
};

type TopicApiItem = {
  id: number | string;
  slug?: string | null;
  body_system_slug?: string | null;
  icon?: string | null;
  title?: string | null;
  condition_name?: string | null;
  subtitle?: string | null;
  body_system_name?: string | null;
  tag?: string | null;
};

type QuickAction = {
  id: string;
  icon: string;
  label: string;
  tone: string;
};

const quickActions: QuickAction[] = [
  { id: "symptoms", icon: "🧾", label: "Check Symptoms", tone: "mint" },
  { id: "clinics", icon: "📍", label: "Find Clinics", tone: "blue" },
  { id: "emergency", icon: "🚨", label: "Emergency Guide", tone: "rose" },
];

export default function BrowseHealth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("Most common");

  const [bodySystems, setBodySystems] = useState<BodySystem[]>([]);
  const [topicCards, setTopicCards] = useState<TopicCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userId = useMemo(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      return user?.id ? Number(user.id) : 0;
    } catch (err) {
      console.error("User parse error:", err);
      return 0;
    }
  }, []);
  const querySearch = searchParams.get("search") || "";

  useEffect(() => {
    if (querySearch) {
      setSearch(querySearch);
    }
  }, [querySearch]);

  useEffect(() => {
    const loadHealthData = async () => {
      try {
        setLoading(true);
        setError("");

        const [systemsRes, topicsRes] = await Promise.all([
          fetch(apiUrl("/api/health/body-systems"), { cache: "no-store" }),
          fetch(apiUrl(`/api/health/topics?user_id=${userId}`), { cache: "no-store" }),
        ]);

        if (!systemsRes.ok) {
          throw new Error("Failed to load body systems");
        }

        if (!topicsRes.ok) {
          throw new Error("Failed to load health topics");
        }

        const systemsData: unknown = await systemsRes.json();
        const topicsData: unknown = await topicsRes.json();

        const normalizedSystems: BodySystem[] = Array.isArray(systemsData)
          ? (systemsData as BodySystemApiItem[]).map((item) => ({
              id: String(item.id),
              slug: item.slug ?? null,
              icon: item.icon ?? "🩺",
              title: item.title ?? item.name ?? "Health Topic",
              subtitle: item.subtitle ?? item.short_description ?? "",
              name: item.name ?? item.title ?? "Health Topic",
            }))
          : [];

        const normalizedTopics: TopicCard[] = Array.isArray(topicsData)
          ? (topicsData as TopicApiItem[]).map((item) => ({
              id: String(item.id),
              slug: item.slug ?? null,
              body_system_slug: item.body_system_slug ?? null,
              icon: item.icon ?? "🩺",
              title: item.title ?? item.condition_name ?? "Condition",
              subtitle: item.subtitle ?? item.body_system_name ?? "Health Topic",
              tag: item.tag ?? null,
            }))
          : [];

        setBodySystems(normalizedSystems);
        setTopicCards(normalizedTopics);
      } catch (err) {
        console.error("Failed to load health data:", err);
        setError("Failed to load health topics.");
        setBodySystems([]);
        setTopicCards([]);
      } finally {
        setLoading(false);
      }
    };

    loadHealthData();
  }, [userId]);

  const filteredBodySystems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return bodySystems;

    return bodySystems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.subtitle.toLowerCase().includes(query) ||
        (item.slug || "").toLowerCase().includes(query)
    );
  }, [bodySystems, search]);

  const filteredTopicCards = useMemo(() => {
    const query = search.trim().toLowerCase();

    let base = topicCards;

    if (selectedTab === "Recently viewed") {
      base = topicCards.filter((card) => card.tag === "Recently viewed");
    } else if (selectedTab === "Most common") {
      base = topicCards.filter(
        (card) => card.tag === "Popular" || !card.tag || card.tag === "Most common"
      );
    }

    if (!query) return base;

    return base.filter(
      (card) =>
        card.title.toLowerCase().includes(query) ||
        card.subtitle.toLowerCase().includes(query) ||
        (card.tag || "").toLowerCase().includes(query) ||
        (card.slug || "").toLowerCase().includes(query)
    );
  }, [topicCards, search, selectedTab]);

  const mobileFeaturedTopicCards = useMemo(() => {
    if (filteredTopicCards.length > 0) {
      return filteredTopicCards;
    }

    if (search.trim()) {
      return [];
    }

    return topicCards;
  }, [filteredTopicCards, search, selectedTab, topicCards]);

  const handleBodySystemClick = (item: BodySystem) => {
    if (item.slug) {
      navigate(`/health/body-system/${item.slug}`);
      return;
    }

    const fallbackSlug = (item.title || item.name || "health-topic")
      .toLowerCase()
      .replace(/\s+/g, "-");

    navigate(`/health/body-system/${fallbackSlug}`);
  };

  const handleTopicClick = (card: TopicCard) => {
    if (card.slug) {
      navigate(`/health/condition/${card.slug}`);
      return;
    }

    if (card.body_system_slug) {
      navigate(`/health/body-system/${card.body_system_slug}`);
      return;
    }

    navigate(`/health/condition/${card.id}`);
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
          <section className="health-mobile-layout">
            <div className="mobile-health-head">
              <h1>Health Categories</h1>
              <p>Browse common health concerns</p>

              <div className="mobile-category-tabs">
                {["Most common", "Recently viewed", "All"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={selectedTab === tab ? "active" : ""}
                    onClick={() => setSelectedTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <section className="mobile-common-section">
              <div className="mobile-section-heading">
                <h2>{selectedTab}</h2>
                <button type="button" onClick={() => setSelectedTab("All")}>
                  View all <span>{"\u203A"}</span>
                </button>
              </div>

              {loading ? (
                <p className="mobile-health-state">Loading health categories...</p>
              ) : error ? (
                <p className="mobile-health-state">{error}</p>
              ) : mobileFeaturedTopicCards.length === 0 ? (
                <p className="mobile-health-state">No topics found.</p>
              ) : (
                <div className="mobile-topic-strip">
                  {mobileFeaturedTopicCards
                    .slice(0, selectedTab === "All" ? mobileFeaturedTopicCards.length : 8)
                    .map((card) => (
                      <button
                        key={card.id}
                        className="mobile-topic-card"
                        type="button"
                        onClick={() => handleTopicClick(card)}
                      >
                        <span className="mobile-topic-icon">{card.icon}</span>
                        <strong>{card.title}</strong>
                        <span>{card.subtitle}</span>
                        <b>{"\u203A"}</b>
                      </button>
                    ))}
                </div>
              )}
            </section>

            <section className="mobile-voice-card">
              <div>
                <h2>Describe your symptoms</h2>
                <p>
                  Use voice search to quickly find possible conditions and relevant information.
                </p>
              </div>
              <VoiceAssistantPopup userId={userId || null} className="mobile-voice-button">
                Start Voice Search
              </VoiceAssistantPopup>
            </section>

            <section className="mobile-browse-topics">
              <h2>Browse Health Topics</h2>

              <div className="mobile-topic-search">
                <img src={searchIcon} alt="Search" />
                <input
                  type="text"
                  placeholder="Search for health topics..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <p className="mobile-health-state">Loading body systems...</p>
              ) : error ? (
                <p className="mobile-health-state">{error}</p>
              ) : (
                <div className="mobile-system-list">
                  {filteredBodySystems.map((item) => (
                    <button
                      key={item.id}
                      className="mobile-system-item"
                      type="button"
                      onClick={() => handleBodySystemClick(item)}
                    >
                      <span>{item.icon}</span>
                      <strong>{item.title}</strong>
                      <b>{"\u203A"}</b>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <p className="mobile-health-note">
              This tool provides general health information.
              <br />
              For serious symptoms, consult a doctor.
            </p>
          </section>

          <section className="health-browser-layout">
            <aside className="health-sidebar-card">
              <div className="sidebar-box sidebar-header-box">
                <h2 className="section-title">Browse Health Topics</h2>

                <div className="inner-search-box">
                  <span className="inner-search-icon">
                    <img src={searchIcon} alt="Search" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search for health topics..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="sidebar-box">
                <h3 className="group-title">Body System</h3>

                {loading ? (
                  <p>Loading body systems...</p>
                ) : error ? (
                  <p>{error}</p>
                ) : (
                  <div className="system-list">
                    {filteredBodySystems.map((item) => (
                      <button
                        key={item.id}
                        className="system-item"
                        type="button"
                        onClick={() => handleBodySystemClick(item)}
                      >
                        <div className="system-item-left">
                          <span className="system-icon">{item.icon}</span>
                          <span className="system-name">{item.title}</span>
                        </div>
                        <span className="system-arrow">›</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="sidebar-box">
                <h3 className="group-title">What are you looking for?</h3>
                <div className="quick-action-list">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      className={`quick-action-btn ${action.tone}`}
                      type="button"
                      onClick={() => handleQuickActionClick(action.id)}
                    >
                      <div className="quick-action-left">
                        <span className="quick-action-icon">{action.icon}</span>
                        <span>{action.label}</span>
                      </div>
                      <span className="system-arrow">›</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section className="health-content-card">
              <div className="content-box content-header-box">
                <div className="content-top">
                  <h1 className="content-title">Health Categories</h1>
                  <p className="content-subtitle">Browse common health concerns</p>
                </div>

                <div className="category-tabs">
                  {["Most common", "Recently viewed", "All"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`category-tab ${selectedTab === tab ? "active" : ""}`}
                      onClick={() => setSelectedTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="content-box category-section-box">
                <div className="health-section-heading">
                  <h3 className="recent-title">{selectedTab}</h3>
                  <button
                    className="view-all-btn"
                    type="button"
                    onClick={() => setSelectedTab("All")}
                  >
                    View all <span>{"\u203A"}</span>
                  </button>
                </div>

                {loading ? (
                  <p>Loading health categories...</p>
                ) : error ? (
                  <p>{error}</p>
                ) : filteredTopicCards.length === 0 ? (
                  <p>No topics found.</p>
                ) : (
                  <div className="topic-grid">
                    {filteredTopicCards.map((card) => (
                      <button
                        key={card.id}
                        className="topic-card"
                        type="button"
                        onClick={() => handleTopicClick(card)}
                      >
                        <div className="topic-left">
                          <div className="topic-icon-wrap">{card.icon}</div>
                          <div>
                            <div className="topic-title-row">
                              <span className="topic-title">{card.title}</span>
                              {card.tag ? <span className="topic-tag">{card.tag}</span> : null}
                            </div>
                            <div className="topic-subtitle">{card.subtitle}</div>
                          </div>
                        </div>
                        <span className="system-arrow">›</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="voice-search-card">
                <button
                  type="button"
                  className="voice-info-btn"
                  onClick={() => navigate("/symptom-checker")}
                >
                  Describe your symptoms <span className="system-arrow">›</span>
                </button>
                <VoiceAssistantPopup userId={userId || null} className="voice-start-btn">
                  Start Voice Search
                </VoiceAssistantPopup>
              </div>

              <p className="health-note">
                This tool provides general health information. For serious symptoms, consult a
                doctor.
              </p>
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}
