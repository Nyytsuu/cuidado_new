import { useState } from "react";
import UserSidebar from "../Categories/UserSidebar";
import "./BrowseHealth.css";
import searchIcon from "../img/search.png";

type TopicCard = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  tag?: string;
};

const bodySystems: TopicCard[] = [
  { id: "cardio", icon: "❤️", title: "Cardiovascular", subtitle: "Heart & blood vessels" },
  { id: "resp", icon: "🫁", title: "Respiratory", subtitle: "Lungs & breathing" },
  { id: "digest", icon: "🫀", title: "Digestive", subtitle: "Stomach & intestines" },
  { id: "derma", icon: "🧴", title: "Dermatology", subtitle: "Skin health" },
  { id: "mental", icon: "🧠", title: "Mental Health", subtitle: "Brain & mood" },
];

const topicCards: TopicCard[] = [
  { id: "heart", icon: "❤️", title: "Heart", subtitle: "Cardiovascular health", tag: "Popular" },
  { id: "skin", icon: "🧴", title: "Skin", subtitle: "Dermatology" },
  { id: "resp2", icon: "🫁", title: "Respiratory", subtitle: "Lungs & breathing" },
  { id: "mental2", icon: "🧠", title: "Mental Health", subtitle: "Brain & mood" },
  { id: "digest2", icon: "🫀", title: "Digestive", subtitle: "Stomach & intestines" },
  { id: "general", icon: "🩺", title: "General", subtitle: "Common symptoms" },
];

const quickActions = [
  { id: "symptoms", icon: "🧾", label: "Check Symptoms", tone: "mint" },
  { id: "clinics", icon: "📍", label: "Find Clinics", tone: "blue" },
  { id: "emergency", icon: "🚨", label: "Emergency Guide", tone: "rose" },
];

export default function BrowseHealth() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("Most common");

  return (
    <div className={`browse-health-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <div className="browse-page-content">
        <main className="browse-health-main">
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
                <div className="system-list">
                  {bodySystems.map((item) => (
                    <button key={item.id} className="system-item" type="button">
                      <div className="system-item-left">
                        <span className="system-icon">{item.icon}</span>
                        <span className="system-name">{item.title}</span>
                      </div>
                      <span className="system-arrow">›</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sidebar-box">
                <h3 className="group-title">What are you looking for?</h3>
                <div className="quick-action-list">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      className={`quick-action-btn ${action.tone}`}
                      type="button"
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

                <div className="category-toolbar">
                  <button type="button" className="toolbar-chip dropdown-chip toolbar-box">
                    🕘 Recently viewed <span>▾</span>
                  </button>

                  <div className="toolbar-chip-list toolbar-box">
                    <button type="button" className="toolbar-chip active">
                      ❤️ Heart
                    </button>
                    <button type="button" className="toolbar-chip">
                      🧴 Skin
                    </button>
                  </div>
                </div>
              </div>

              <div className="content-box category-section-box">
                <h3 className="recent-title">Recently viewed</h3>

                <div className="topic-grid">
                  {topicCards.map((card) => (
                    <button key={card.id} className="topic-card" type="button">
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
              </div>

              <div className="voice-search-card">
                <button type="button" className="voice-info-btn">
                  Describe your symptoms <span className="system-arrow">›</span>
                </button>
                <button type="button" className="voice-start-btn">
                  Start Voice Search
                </button>
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