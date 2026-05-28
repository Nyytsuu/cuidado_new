import { useEffect, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import {
  Activity,
  Ambulance,
  Bell,
  Calculator,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  Hospital,
  Lightbulb,
  MapPin,
  Mic,
  Search,
  Stethoscope,
  User,
  type LucideIcon,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import UserSidebar from "../Categories/UserSidebar";
import { apiUrl } from "../sharedBackendFetch";
import VoiceAssistantPopup from "./VoiceAssistantPopup";
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

type HomepageItem = {
  title: string;
  subtitle: string;
  path: string;
  icon: LucideIcon;
  tone: string;
};

const primaryServices: HomepageItem[] = [
  {
    title: "Clinics",
    subtitle: "Find health-care centers near you",
    icon: Hospital,
    path: "/find-clinic",
    tone: "clinic",
  },
  {
    title: "Appointments",
    subtitle: "Book visits and manage requests",
    icon: CalendarDays,
    path: "/appointments",
    tone: "appointment",
  },
];

const quickActions: HomepageItem[] = [
  {
    title: "Book Appointment",
    subtitle: "Schedule a visit with a doctor",
    icon: CalendarDays,
    path: "/appointments",
    tone: "calendar",
  },
  {
    title: "Symptom Checker",
    subtitle: "Assess symptoms online",
    icon: ClipboardCheck,
    path: "/symptom-checker",
    tone: "symptom",
  },
  {
    title: "Health Topics",
    subtitle: "Browse common conditions",
    icon: Stethoscope,
    path: "/browse-health",
    tone: "health",
  },
];

const careTools: HomepageItem[] = [
  {
    title: "BMI Calculator",
    subtitle: "Check your body mass index",
    icon: Calculator,
    path: "/bmi-calculator",
    tone: "bmi",
  },
  {
    title: "Stress Index",
    subtitle: "Review your current stress level",
    icon: Activity,
    path: "/stress-index",
    tone: "stress",
  },
  {
    title: "Emergency Guide",
    subtitle: "Hotlines, nearby help, and safety steps",
    icon: Ambulance,
    path: "/emergency",
    tone: "emergency",
  },
];

const supportLinks: HomepageItem[] = [
  {
    title: "Notifications",
    subtitle: "Latest appointment updates",
    icon: Bell,
    path: "/notifications",
    tone: "notification",
  },
  {
    title: "My Profile",
    subtitle: "Personal details and account",
    icon: User,
    path: "/profile",
    tone: "profile",
  },
  {
    title: "Help Center",
    subtitle: "FAQs and support options",
    icon: CircleHelp,
    path: "/help",
    tone: "help",
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

const siteSearchTargets = [
  {
    path: "/appointments",
    keywords: ["appointment", "appointments", "booking", "book", "schedule"],
  },
  {
    path: "/find-clinic",
    keywords: ["clinic", "clinics", "doctor", "hospital", "locator", "nearby"],
  },
  {
    path: "/browse-health",
    keywords: ["health", "topics", "tips", "condition", "articles"],
  },
  {
    path: "/symptom-checker",
    keywords: ["symptom", "symptoms", "checker"],
  },
  {
    path: "/bmi-calculator",
    keywords: ["bmi", "weight", "height"],
  },
  {
    path: "/stress-index",
    keywords: ["stress", "burnout", "mental"],
  },
  {
    path: "/voice-assistant",
    keywords: ["voice", "assistant", "mic", "microphone"],
  },
  {
    path: "/profile",
    keywords: ["profile", "account", "settings"],
  },
  {
    path: "/notifications",
    keywords: ["notification", "notifications", "alerts"],
  },
  {
    path: "/emergency",
    keywords: ["emergency", "hotline", "urgent", "911", "red cross"],
  },
  {
    path: "/help",
    keywords: ["help", "support", "faq", "contact support", "issue"],
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
  const [siteSearchQuery, setSiteSearchQuery] = useState("");
  const [healthTopicSearchQuery, setHealthTopicSearchQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesError, setArticlesError] = useState("");
  const [userName, setUserName] = useState("");

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleSiteSearch = (value: string) => {
    const keyword = value.trim().toLowerCase();

    if (!keyword) return;

    const target = siteSearchTargets.find((item) =>
      item.keywords.some(
        (targetKeyword) =>
          targetKeyword.includes(keyword) || keyword.includes(targetKeyword)
      )
    );

    navigate(
      target
        ? target.path
        : `/browse-health?search=${encodeURIComponent(value.trim())}`
    );
  };

  const handleHealthTopicSearch = () => {
    const keyword = healthTopicSearchQuery.trim();
    void loadArticles(keyword || "health");
  };

  const handleArticleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    article: Article
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedArticle(article);
    }
  };

  const loadArticles = async (query?: string) => {
    try {
      setArticlesLoading(true);
      setArticlesError("");

      const finalQuery = (query || "health").trim();
      const res = await fetch(
        apiUrl(`/api/articles?q=${encodeURIComponent(finalQuery)}`)
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
    void loadArticles("health");
  }, []);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      setUserName(user?.full_name || user?.name || "");
    } catch {
      setUserName("");
    }
  }, []);

  return (
    <div
      className={`homepage user-layout ${sidebarExpanded ? "sidebar-expanded" : ""}`}
    >
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
        searchValue={siteSearchQuery}
        onSearchChange={setSiteSearchQuery}
        searchPlaceholder="Search site..."
        onSearchSubmit={handleSiteSearch}
      />

      <div className="homepage-content">
        <main className="homepage-main">
          <div className="homepage-layout">
            <section className="homepage-primary">
              <div className="homepage-welcome">
                <div>
                  <p className="homepage-eyebrow">Home</p>
                  <h1>
                    {userName ? `Hi ${userName.split(" ")[0]}` : "Welcome back"}
                  </h1>
                  <p>Find care, check symptoms, and manage your health tools.</p>
                </div>
              </div>

              <form
                className="homepage-health-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleHealthTopicSearch();
                }}
              >
                <Search size={17} />
                <input
                  type="search"
                  placeholder="Search health topics..."
                  value={healthTopicSearchQuery}
                  onChange={(event) => setHealthTopicSearchQuery(event.target.value)}
                />
                <button type="submit">Search</button>
              </form>

              <div className="homepage-services-grid">
                {primaryServices.map(({ icon: Icon, ...item }) => (
                  <button
                    key={item.title}
                    type="button"
                    className={`homepage-service-card ${item.tone}`}
                    onClick={() => handleNavigate(item.path)}
                  >
                    <span className="homepage-service-icon">
                      <Icon size={25} />
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </span>
                  </button>
                ))}
              </div>

              <section className="homepage-panel">
                <div className="homepage-section-header">
                  <div>
                    <h2>Quick Actions</h2>
                    <p>Fast paths for common tasks</p>
                  </div>
                  <button type="button" onClick={() => handleNavigate("/appointments")}>
                    See All
                  </button>
                </div>

                <div className="homepage-action-list">
                  {quickActions.map(({ icon: Icon, ...item }) => (
                    <button
                      key={item.title}
                      type="button"
                      className={`homepage-action-card ${item.tone}`}
                      onClick={() => handleNavigate(item.path)}
                    >
                      <span className="homepage-action-icon">
                        <Icon size={21} />
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.subtitle}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="homepage-voice-card">
                <div className="homepage-voice-copy">
                  <span className="homepage-voice-icon">
                    <Mic size={22} />
                  </span>
                  <div>
                    <h2>Your health, just a voice away</h2>
                    <p>Describe symptoms or ask for care guidance.</p>
                  </div>
                </div>

                <VoiceAssistantPopup className="homepage-voice-button">
                  <Mic size={26} />
                </VoiceAssistantPopup>
              </section>

              <section className="homepage-panel">
                <div className="homepage-section-header">
                  <div>
                    <h2>Care Tools</h2>
                    <p>Self-checks and urgent support</p>
                  </div>
                </div>

                <div className="homepage-tool-grid">
                  {careTools.map(({ icon: Icon, ...item }) => (
                    <button
                      key={item.title}
                      type="button"
                      className={`homepage-tool-card ${item.tone}`}
                      onClick={() => handleNavigate(item.path)}
                    >
                      <span className="homepage-tool-icon">
                        <Icon size={21} />
                      </span>
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </button>
                  ))}
                </div>
              </section>

              <section className="homepage-map-panel">
                <div className="homepage-section-header">
                  <div>
                    <h2>Near You</h2>
                    <p>Clinics around Bacoor, Cavite</p>
                  </div>
                  <button type="button" onClick={() => handleNavigate("/find-clinic")}>
                    View Clinics
                  </button>
                </div>

                <div className="homepage-map-wrap">
                  <MapContainer
                    center={[14.4591, 120.9398]}
                    zoom={13}
                    scrollWheelZoom={false}
                    className="homepage-map"
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
              </section>
            </section>

            <aside className="homepage-secondary">
              <section className="homepage-panel homepage-support-panel">
                <div className="homepage-section-header">
                  <div>
                    <h2>Account & Support</h2>
                    <p>Useful shortcuts</p>
                  </div>
                </div>

                <div className="homepage-support-list">
                  {supportLinks.map(({ icon: Icon, ...item }) => (
                    <button
                      key={item.title}
                      type="button"
                      className={`homepage-support-card ${item.tone}`}
                      onClick={() => handleNavigate(item.path)}
                    >
                      <span>
                        <Icon size={19} />
                      </span>
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </button>
                  ))}
                </div>
              </section>

              <section className="homepage-panel homepage-tip-panel">
                <div className="homepage-tip-icon">
                  <Lightbulb size={21} />
                </div>
                <h2>Did you know?</h2>
                <p>
                  Tracking appointments and symptoms regularly can help your clinic
                  give more accurate care recommendations.
                </p>
              </section>

              <section className="homepage-panel homepage-articles-panel">
                <div className="homepage-section-header">
                  <div>
                    <h2>Health Articles</h2>
                    <p>Fresh reads from your database</p>
                  </div>
                  <button type="button" onClick={() => handleNavigate("/browse-health")}>
                    Browse
                  </button>
                </div>

                <div className="homepage-articles-list">
                  {articlesLoading ? (
                    <p className="homepage-empty-state">Loading articles...</p>
                  ) : articlesError ? (
                    <p className="homepage-empty-state">{articlesError}</p>
                  ) : articles.length === 0 ? (
                    <p className="homepage-empty-state">No articles found.</p>
                  ) : (
                    articles.slice(0, 5).map((article) => (
                      <button
                        key={article.id}
                        type="button"
                        className="homepage-article-card"
                        onClick={() => setSelectedArticle(article)}
                        onKeyDown={(event) => handleArticleKeyDown(event, article)}
                      >
                        <span
                          className="homepage-article-image"
                          style={
                            article.image
                              ? {
                                  backgroundImage: `url(${article.image})`,
                                }
                              : undefined
                          }
                        />

                        <span className="homepage-article-copy">
                          <strong>{article.title}</strong>
                          <small>{article.subtitle}</small>
                          <em>{article.source || "Unknown source"}</em>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <div className="homepage-footer-links">
                <button type="button" onClick={() => handleNavigate("/about")}>
                  About Us
                </button>
                <button type="button" onClick={() => handleNavigate("/contact")}>
                  Contact
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate("/privacy-policy")}
                >
                  Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate("/terms-of-service")}
                >
                  Terms of Service
                </button>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {selectedArticle && (
        <div
          className="homepage-article-modal-overlay"
          onClick={() => setSelectedArticle(null)}
        >
          <article
            className="homepage-article-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="homepage-article-modal-hero"
              style={
                selectedArticle.image
                  ? {
                      backgroundImage: `linear-gradient(rgba(6, 65, 62, 0.6), rgba(6, 65, 62, 0.6)), url(${selectedArticle.image})`,
                    }
                  : undefined
              }
            >
              <button
                type="button"
                className="homepage-article-close"
                onClick={() => setSelectedArticle(null)}
              >
                x
              </button>
              <h2>{selectedArticle.title}</h2>
              <p>{selectedArticle.subtitle}</p>
              <small>
                {selectedArticle.source || "Unknown source"}
                {selectedArticle.publishedAt
                  ? ` - ${new Date(selectedArticle.publishedAt).toLocaleDateString()}`
                  : ""}
              </small>
            </div>

            <div className="homepage-article-modal-body">
              <h3>Article Summary</h3>
              <p>{selectedArticle.content}</p>

              {selectedArticle.url && (
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read full article from {selectedArticle.source || "source"}
                </a>
              )}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
