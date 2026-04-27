import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import UserSidebar from "../Categories/UserSidebar";
import "./Homepage.css";

type Article = {
  id: number;
  title: string;
  subtitle: string;
  content: string;
  image?: string;
  url?: string;
  source?: string;
  publishedAt?: string | null;
};

const topServices = [
  {
    title: "Clinics",
    subtitle: "Find health-care centers",
    iconType: "clinics",
    path: "/clinics",
  },
  {
    title: "Diagnostics",
    subtitle: "Book visits & screenings",
    iconType: "diagnostics",
    path: "/appointments",
  },
];

const quickActions = [
  {
    title: "Book Appointment",
    subtitle: "Schedule a visit with a doctor",
    iconType: "calendar",
    path: "/appointments",
  },
  {
    title: "Symptom Checker",
    subtitle: "Assess your symptoms online",
    iconType: "symptom",
    path: "/symptom-checker",
  },
  {
    title: "Health Tips",
    subtitle: "Read health & wellness advice",
    iconType: "healthtips",
    path: "/health-tips",
  },
];

const otherServices = [
  {
    title: "Hospital Locator",
    subtitle: "Find a nearby health center",
    iconType: "hospital",
    path: "/clinics",
  },
  {
    title: "BMI Calculator",
    subtitle: "Check your body mass index",
    iconType: "bmi",
    path: "/bmi-calculator",
  },
  {
    title: "Stress Index",
    subtitle: "Check your stress and burnout",
    iconType: "stress",
    path: "/stress-index",
  },
];

const clinicMarkers = [
  {
    id: 1,
    name: "Bacoor Health Center",
    position: [14.4591, 120.9398] as [number, number],
    address: "Bacoor, Cavite",
  },
  {
    id: 2,
    name: "City Clinic",
    position: [14.4625, 120.9475] as [number, number],
    address: "Bacoor Blvd, Cavite",
  },
  {
    id: 3,
    name: "Family Care Clinic",
    position: [14.4548, 120.9342] as [number, number],
    address: "Molino, Bacoor",
  },
];

const DefaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function Homepage() {
  const navigate = useNavigate();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesError, setArticlesError] = useState("");

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const loadArticles = async (query?: string) => {
    try {
      setArticlesLoading(true);
      setArticlesError("");

      const finalQuery = (query || "health").trim();

      const res = await fetch(
        `http://localhost:5000/api/articles?q=${encodeURIComponent(finalQuery)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load articles.");
      }

      setArticles(Array.isArray(data) ? data : []);
    } catch (err) {
      setArticlesError(
        err instanceof Error ? err.message : "Failed to load articles."
      );
      setArticles([]);
    } finally {
      setArticlesLoading(false);
    }
  };

  useEffect(() => {
    loadArticles("health");
  }, []);

  return (
    <div className={`homepage ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <div className="homepage-content">
        <main className="homepage-main">
          <div className="homepage-layout">
            <section className="homepage-left">
              <div className="welcome-box">
                <h1>Welcome back, Dr. John Smith!</h1>
                <p>What are you looking for?</p>
              </div>

            <div className="main-search">
  <input
    type="text"
    placeholder="Search health topics..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        loadArticles(searchQuery || "health");
      }
    }}
  />
  <button
    aria-label="Search"
    type="button"
    className="main-search-btn"
    onClick={() => loadArticles(searchQuery || "health")}
  >
    Search
  </button>
</div>

              <div className="services-grid">
                {topServices.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className="service-card clickable-card"
                    onClick={() => handleNavigate(item.path)}
                  >
                    <div className={`service-icon-circle ${item.iconType}-service-icon`}>
                      {item.iconType === "clinics" && (
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v16h18V5c0-1.1-.9-2-2-2zM13 19h-2v-4H7v-2h4V9h2v4h4v2h-4v4z" />
                        </svg>
                      )}

                      {item.iconType === "diagnostics" && (
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M9 2v2H5v16h14V4h-4V2h6v20H3V2zm2 7h2v6h-2zm-4 2h2v4H7zm8-3h2v7h-2z" />
                        </svg>
                      )}
                    </div>

                    <div className="service-text">
                      <h3>{item.title}</h3>
                      <p>{item.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="section quick-other-section">
                <div className="section-header">
                  <h2>Quick Actions</h2>
                  <button
                    type="button"
                    className="see-all-btn"
                    onClick={() => handleNavigate("/appointments")}
                  >
                    See All
                  </button>
                </div>

                <div className="quick-map-other-layout">
                  <div className="quick-other-left">
                    <div className="quick-grid">
                      {quickActions.map((item) => (
                        <button
                          key={item.title}
                          type="button"
                          className="quick-card clickable-card"
                          onClick={() => handleNavigate(item.path)}
                        >
                          <div className={`quick-icon ${item.iconType}-icon`}>
                            {item.iconType === "calendar" && (
                              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M19 4h-2V2h-2v2H9V2H7v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2M5 20V8h14V6v14z"></path>
                                <path d="M7 11h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zm-8 4h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"></path>
                              </svg>
                            )}

                            {item.iconType === "symptom" && (
                              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2M4 19V5h16v14z"></path>
                                <path d="M13 8h5v2h-5zm-5 .59L6.96 7.54 5.54 8.96 8 11.41l3.46-3.45-1.42-1.42zM13 14h5v2h-5zm-5 .59-1.04-1.05-1.42 1.42L8 17.41l3.46-3.45-1.42-1.42z"></path>
                              </svg>
                            )}

                            {item.iconType === "healthtips" && (
                              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M9 21h6v-1H9zM12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.89 11.32-.89.63V16h-4v-2.05l-.89-.63A4.98 4.98 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.17-2.11 4.32z"></path>
                              </svg>
                            )}
                          </div>

                          <div className="quick-text">
                            <h3>{item.title}</h3>
                            <p>{item.subtitle}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="other-services-wrap">
                      <h2>Other Services</h2>

                      <div className="other-grid">
                        {otherServices.map((item) => (
                          <button
                            key={item.title}
                            type="button"
                            className="other-card clickable-card"
                            onClick={() => handleNavigate(item.path)}
                          >
                            <div className={`other-icon ${item.iconType}-other-icon`}>
                              {item.iconType === "hospital" && (
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M19 3H5c-1.1 0-2 .9-2 2v16h18V5c0-1.1-.9-2-2-2zM13 19h-2v-4H7v-2h4V9h2v4h4v2h-4v4z"></path>
                                </svg>
                              )}

                              {item.iconType === "bmi" && (
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M19 3H5c-1.1 0-2 .9-2 2v16h18V5c0-1.1-.9-2-2-2zm-7 14c-2.76 0-5-2.24-5-5 0-.7.15-1.36.41-1.95L12 12l4.59-1.95c.26.59.41 1.25.41 1.95 0 2.76-2.24 5-5 5zm0-7L8.5 8.5 12 6l3.5 2.5L12 10z"></path>
                                </svg>
                              )}

                              {item.iconType === "stress" && (
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M9 21h6v-1H9zM12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.89 11.32-.89.63V16h-4v-2.05l-.89-.63A4.98 4.98 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.17-2.11 4.32z"></path>
                                </svg>
                              )}
                            </div>

                            <div className="other-text">
                              <h3>{item.title}</h3>
                              <p>{item.subtitle}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mini-services-panel">
                      <div className="mini-services-title-row">
                        <div className="mini-services-title-icon"></div>
                        <h3>Mini Services</h3>
                      </div>

                      <div className="mini-services-grid">
                        <button
                          type="button"
                          className="mini-service-item"
                          onClick={() => handleNavigate("/emergency")}
                        >
                          <div className="mini-service-icon emergency-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M12 2 1 21h22L12 2zm1 14h-2v2h2zm0-6h-2v5h2z"></path>
                            </svg>
                          </div>
                          <span>Emergency</span>
                        </button>

                        <button
                          type="button"
                          className="mini-service-item"
                          onClick={() => handleNavigate("/help")}
                        >
                          <div className="mini-service-icon help-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 17h-2v-2h2zm1.07-7.75-.9.92c-.72.73-1.17 1.33-1.17 2.83h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26a2 2 0 1 0-3.41-1.41H6a4 4 0 1 1 8 0c0 .88-.36 1.68-.93 2.25z"></path>
                            </svg>
                          </div>
                          <span>Help</span>
                        </button>

                        <button
                          type="button"
                          className="mini-service-item"
                          onClick={() => handleNavigate("/logout")}
                        >
                          <div className="mini-service-icon logout-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M13 3h-2v10h2zm-1 19C6.48 22 2 17.52 2 12c0-3.53 1.84-6.63 4.61-8.4l1.01 1.73A7.96 7.96 0 0 0 4 12c0 4.41 3.59 8 8 8s8-3.59 8-8c0-2.8-1.45-5.27-3.64-6.69l1.01-1.73A9.96 9.96 0 0 1 22 12c0 5.52-4.48 10-10 10z"></path>
                            </svg>
                          </div>
                          <span>Logout</span>
                        </button>

                        <button
                          type="button"
                          className="mini-service-item"
                          onClick={() => handleNavigate("/logout")}
                        >
                          <div className="mini-service-icon logout-lock-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7c-1.1 0-2 .9-2 2v10h14V10c0-1.1-.9-2-2-2zm-7-2a2 2 0 1 1 4 0v2h-4z"></path>
                            </svg>
                          </div>
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="map-card">
                    <div className="leaflet-map-wrap">
                      <MapContainer
                        center={[14.4591, 120.9398]}
                        zoom={13}
                        scrollWheelZoom={false}
                        className="leaflet-map"
                      >
                        <TileLayer
                          attribution="&copy; OpenStreetMap contributors"
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {clinicMarkers.map((clinic) => (
                          <Marker key={clinic.id} position={clinic.position}>
                            <Popup>
                              <strong>{clinic.name}</strong>
                              <br />
                              {clinic.address}
                              <br />
                              <button
                                type="button"
                                className="popup-route-btn"
                                onClick={() => handleNavigate("/find-clinic")}
                              >
                                View clinics
                              </button>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>

                    <button
                      type="button"
                      className="find-clinic-btn"
                      onClick={() => handleNavigate("/find-clinic")}
                    >
                      Find Clinics Nearby
                    </button>
                  </div>
                </div>
              </div>

              <div className="homepage-voice-box">
                <div className="voice-left">
                  <div className="voice-search-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M10 2a8 8 0 1 0 4.9 14.32l4.39 4.39 1.41-1.41-4.39-4.39A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm-.5 3h2v3.59l2.7 2.7-1.4 1.41L9.5 11.4z"></path>
                    </svg>
                  </div>
                  <span>Your health, just a voice away</span>
                </div>

                <button
                  type="button"
                  className="voice-btn"
                  onClick={() => handleNavigate("/voice-assistant")}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z"></path>
                  </svg>
                </button>
              </div>

              <div className="footer-links">
                <span onClick={() => handleNavigate("/about")}>About Us</span>
                <span>|</span>
                <span onClick={() => handleNavigate("/contact")}>Contact</span>
                <span>|</span>
                <span onClick={() => handleNavigate("/privacy-policy")}>Privacy Policy</span>
                <span>|</span>
                <span onClick={() => handleNavigate("/terms-of-service")}>
                  Terms of Service
                </span>
              </div>
            </section>

            <aside className="health-articles-aside">
              <h3>Health Articles</h3>

              <div className="articles-list">
                {articlesLoading ? (
                  <p>Loading articles...</p>
                ) : articlesError ? (
                  <p>{articlesError}</p>
                ) : articles.length === 0 ? (
                  <p>No articles found.</p>
                ) : (
                  articles.slice(0, 5).map((article) => (
                    <div
                      key={article.id}
                      className="article-item"
                      onClick={() => setSelectedArticle(article)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setSelectedArticle(article);
                        }
                      }}
                    >
                      <div
                        className="article-img"
                        style={
                          article.image
                            ? {
                                backgroundImage: `url(${article.image})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
                      ></div>

                      <div className="article-text">
                        <h4>{article.title}</h4>
                        <p>{article.subtitle}</p>
                        <small>{article.source || "Unknown source"}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>

      {selectedArticle && (
        <div
          className="article-modal-overlay"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="article-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="article-modal-hero"
              style={
                selectedArticle.image
                  ? {
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${selectedArticle.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              <div className="article-hero-content">
                <h2>{selectedArticle.title}</h2>
                <p>{selectedArticle.subtitle}</p>
                <small>
                  {selectedArticle.source || "Unknown source"}
                  {selectedArticle.publishedAt
                    ? ` • ${new Date(selectedArticle.publishedAt).toLocaleDateString()}`
                    : ""}
                </small>
              </div>

              <button
                className="article-close-btn"
                onClick={() => setSelectedArticle(null)}
              >
                ✕
              </button>
            </div>

            <div className="article-modal-body">
              <div className="article-section">
                <h4>Article Summary</h4>
                <p>{selectedArticle.content}</p>
              </div>

              {selectedArticle.url && (
                <div className="article-tip-box">
                  <a
                    href={selectedArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read full article from {selectedArticle.source || "source"} →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}