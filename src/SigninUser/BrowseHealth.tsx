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
  body_system_name?: string | null;
  is_common?: boolean;
  sort_order?: number;
  recently_viewed_at?: string | null;
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
  is_common?: number | boolean | null;
  sort_order?: number | null;
  recently_viewed_at?: string | null;
};

type QuickAction = {
  id: string;
  icon: string;
  label: string;
  tone: string;
};

const normalizeTag = (tag?: string | null) =>
  (tag || "").toLowerCase().replace(/[_-]+/g, " ").trim();

const SEARCH_STOP_WORDS = new Set([
  "a",
  "about",
  "and",
  "article",
  "articles",
  "care",
  "common",
  "doctor",
  "facts",
  "for",
  "guide",
  "health",
  "options",
  "overview",
  "prevention",
  "see",
  "symptom",
  "symptoms",
  "the",
  "tips",
  "to",
  "treatment",
  "watch",
  "wellness",
  "when",
]);

const normalizeSearchText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

const getSearchTokens = (query: string) => {
  const words = normalizeSearchText(query)
    .split(" ")
    .filter(Boolean);
  const usefulWords = words.filter(
    (word) => word.length > 2 && !SEARCH_STOP_WORDS.has(word)
  );

  return usefulWords.length > 0 ? usefulWords : words;
};

const matchesSearchQuery = (
  query: string,
  ...values: Array<string | null | undefined>
) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const haystack = normalizeSearchText(values.filter(Boolean).join(" "));
  if (haystack.includes(normalizedQuery)) return true;

  const tokens = getSearchTokens(query);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
};

const quickActions: QuickAction[] = [
  { id: "symptoms", icon: "🧾", label: "Check Symptoms", tone: "mint" },
  { id: "clinics", icon: "📍", label: "Find Clinics", tone: "blue" },
  { id: "appointments", icon: "📅", label: "Appointments", tone: "mint" },
  { id: "emergency", icon: "🚨", label: "Emergency Guide", tone: "rose" },
  { id: "bmi", icon: "⚖", label: "BMI Calculator", tone: "mint" },
  { id: "stress", icon: "🧠", label: "Stress Index", tone: "blue" },
  { id: "voice", icon: "🎙", label: "Voice Assistant", tone: "mint" },
];

const categoryTabs = ["Most common", "Recently viewed", "All"] as const;
type CategoryTab = (typeof categoryTabs)[number];

const hasUsableIcon = (icon?: string | null) => Boolean(icon && icon.trim());

const getBodySystemIcon = (item: BodySystemApiItem) => {
  if (hasUsableIcon(item.icon)) return item.icon as string;

  const key = `${item.title || ""} ${item.name || ""} ${item.slug || ""}`.toLowerCase();

  if (key.includes("cardio")) return "💓";
  if (key.includes("resp")) return "🫁";
  if (key.includes("digest")) return "🍽️";
  if (key.includes("derma") || key.includes("skin")) return "🧴";
  if (key.includes("mental")) return "🧠";

  return "🩺";
};

const isRecentlyViewedTopic = (card: TopicCard) =>
  Boolean(card.recently_viewed_at) || normalizeTag(card.tag).includes("recent");

const isCommonTopic = (card: TopicCard) => {
  const tag = normalizeTag(card.tag);
  return Boolean(card.is_common) || tag.includes("popular") || tag.includes("common");
};

const sortByTitle = (a: TopicCard, b: TopicCard) => a.title.localeCompare(b.title);

const sortByRecent = (a: TopicCard, b: TopicCard) => {
  const dateA = a.recently_viewed_at ? new Date(a.recently_viewed_at).getTime() : 0;
  const dateB = b.recently_viewed_at ? new Date(b.recently_viewed_at).getTime() : 0;
  return dateB - dateA || sortByTitle(a, b);
};

const sortByCommon = (a: TopicCard, b: TopicCard) => {
  const orderA = a.sort_order ?? 9999;
  const orderB = b.sort_order ?? 9999;

  if (orderA !== orderB) return orderA - orderB;

  return sortByTitle(a, b);
};

export default function BrowseHealth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState<CategoryTab>("All");

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

        if (!systemsRes.ok) throw new Error("Failed to load body systems");
        if (!topicsRes.ok) throw new Error("Failed to load health topics");

        const systemsData: unknown = await systemsRes.json();
        const topicsData: unknown = await topicsRes.json();

        const normalizedSystems: BodySystem[] = Array.isArray(systemsData)
          ? (systemsData as BodySystemApiItem[]).map((item) => ({
              id: String(item.id),
              slug: item.slug ?? null,
              icon: getBodySystemIcon(item),
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
              body_system_name: item.body_system_name ?? null,
              icon: item.icon && item.icon.trim() ? item.icon : "🩺",
              title: item.title ?? item.condition_name ?? "Condition",
              subtitle:
                (item.subtitle || item.body_system_name || "Health Topic").slice(0, 120) +
                "...",
              tag: item.tag ?? null,
              is_common: Boolean(item.is_common),
              sort_order: item.sort_order ?? 9999,
              recently_viewed_at: item.recently_viewed_at ?? null,
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
    const query = search.trim();

    const filtered = query
      ? bodySystems.filter(
          (item) =>
            matchesSearchQuery(query, item.title, item.subtitle, item.slug, item.name)
        )
      : bodySystems;

    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [bodySystems, search]);

  const filteredTopicCards = useMemo(() => {
    const query = search.trim();

    const searchedCards = query
      ? topicCards.filter(
          (card) =>
            matchesSearchQuery(
              query,
              card.title,
              card.subtitle,
              card.tag,
              card.slug,
              card.body_system_name,
              card.body_system_slug
            )
        )
      : topicCards;

    if (selectedTab === "Recently viewed") {
      return [...searchedCards].filter(isRecentlyViewedTopic).sort(sortByRecent);
    }

    if (selectedTab === "Most common") {
      const commonCards = [...searchedCards].filter(isCommonTopic).sort(sortByCommon);
      return commonCards.length > 0 ? commonCards : [...searchedCards].sort(sortByCommon);
    }

    return [...searchedCards].sort(sortByTitle);
  }, [topicCards, search, selectedTab]);

  const mobileFeaturedTopicCards = filteredTopicCards;
  const sidebarBodySystems = filteredBodySystems.length > 0 ? filteredBodySystems : bodySystems;
  const showBodySystemMatches =
    search.trim().length > 0 &&
    filteredTopicCards.length === 0 &&
    filteredBodySystems.length > 0;

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
    const conditionTarget = card.slug && card.slug !== card.body_system_slug ? card.slug : card.id;
    navigate(`/health/condition/${conditionTarget}`);
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

    if (actionId === "appointments") {
      navigate("/appointments");
      return;
    }

    if (actionId === "emergency") {
      navigate("/emergency-guide");
      return;
    }

    if (actionId === "bmi") {
      navigate("/bmi-calculator");
      return;
    }

    if (actionId === "stress") {
      navigate("/stress-index");
      return;
    }

    if (actionId === "voice") {
      navigate("/voice-assistant");
    }
  };

  return (
    <div className={`browse-health-page browse-health-index-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
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
                {categoryTabs.map((tab) => (
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
              </div>

              {loading ? (
                <p className="mobile-health-state">Loading health categories...</p>
              ) : error ? (
                <p className="mobile-health-state">{error}</p>
              ) : showBodySystemMatches ? (
                <div className="mobile-topic-strip">
                  {filteredBodySystems.map((system) => (
                    <button
                      key={`mobile-system-${system.id}`}
                      className="mobile-topic-card"
                      type="button"
                      onClick={() => handleBodySystemClick(system)}
                    >
                      <span className="mobile-topic-icon">{system.icon}</span>
                      <strong>{system.title}</strong>
                      <span>{system.subtitle || "Open the body system overview."}</span>
                      <b>{"\u203A"}</b>
                    </button>
                  ))}
                </div>
              ) : mobileFeaturedTopicCards.length === 0 ? (
                <p className="mobile-health-state">No topics found.</p>
              ) : (
                <div className="mobile-topic-strip">
                  {mobileFeaturedTopicCards.map((card) => (
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

              <div className="sidebar-box body-system-box">
                <h3 className="group-title">Body System</h3>

                {loading ? (
                  <p>Loading body systems...</p>
                ) : error ? (
                  <p>{error}</p>
                ) : sidebarBodySystems.length === 0 ? (
                  <p className="health-topic-state sidebar-empty-state">No body systems found.</p>
                ) : (
                  <div className="system-list">
                    {sidebarBodySystems.map((item) => (
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

              <div className="sidebar-box quick-actions-box">
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
                  {categoryTabs.map((tab) => (
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
                </div>

                <div className="topic-list-bound">
                  {loading ? (
                    <p className="health-topic-state">Loading health categories...</p>
                  ) : error ? (
                    <p className="health-topic-state">{error}</p>
                  ) : showBodySystemMatches ? (
                    <div className="topic-grid">
                      {filteredBodySystems.map((system) => (
                        <button
                          key={`system-${system.id}`}
                          className="topic-card"
                          type="button"
                          onClick={() => handleBodySystemClick(system)}
                        >
                          <div className="topic-left">
                            <div className="topic-icon-wrap">{system.icon}</div>
                            <div>
                              <div className="topic-title-row">
                                <span className="topic-title">{system.title}</span>
                                <span className="topic-tag">Body System</span>
                              </div>
                              <div className="topic-subtitle">
                                {system.subtitle || "Open the body system overview."}
                              </div>
                            </div>
                          </div>
                          <span className="system-arrow">›</span>
                        </button>
                      ))}
                    </div>
                  ) : filteredTopicCards.length === 0 ? (
                    <p className="health-topic-state">No topics found.</p>
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
                                {card.tag ? (
                                  <span className="topic-tag">{card.tag}</span>
                                ) : null}
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
