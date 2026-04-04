import { useState } from "react";
import UserSidebar from "../Categories/UserSidebar";
import "./Homepage.css";

const topServices = [
  { title: "Doctors", subtitle: "Search physicians", iconType: "doctors" },
  { title: "Clinics", subtitle: "Find health-care centers", iconType: "clinics" },
  { title: "Diagnostics", subtitle: "Book visits & screenings", iconType: "diagnostics" },
  { title: "Pharmacy", subtitle: "Order prescriptions", iconType: "pharmacy" },
  { title: "Therapy", subtitle: "Care and support services", iconType: "therapy" },
];

const quickActions = [
  {
    title: "Book Appointment",
    subtitle: "Schedule a visit with a doctor",
    iconType: "calendar",
  },
  {
    title: "Order Medicine",
    subtitle: "Get your prescriptions delivered",
    iconType: "medicine",
  },
  {
    title: "Symptom Checker",
    subtitle: "Assess your symptoms online",
    iconType: "symptom",
  },
  {
    title: "Health Tips",
    subtitle: "Read health & wellness advice",
    iconType: "healthtips",
  },
  {
    title: "Insurance Services",
    subtitle: "Manage your health insurance",
    iconType: "insurance",
  },
  {
    title: "Medical Records",
    subtitle: "Access your medical history",
    iconType: "records",
  },
];

const otherServices = [
  {
    title: "Hospital Locator",
    subtitle: "Find a nearby health center",
    iconType: "hospital",
  },
  {
    title: "BMI Calculator",
    subtitle: "Check your body mass index",
    iconType: "bmi",
  },
  {
    title: "Stress Index",
    subtitle: "Check your stress and burnout",
    iconType: "stress",
  },
];

const articles = [
  {
    title: "Simple tips to maintain a healthy heart",
    subtitle: "Read tips to keep your heart strong",
  },
  {
    title: "Stretches to reduce stress at home",
    subtitle: "Simple ways to help your body relax",
  },
  {
    title: "Superfoods you must know about",
    subtitle: "Easy food choices for better health",
  },
  {
    title: "Exercises to boost your health",
    subtitle: "Daily movement for a stronger body",
  },
  {
    title: "Healthy habits for everyday living",
    subtitle: "Small changes that make a big difference",
  },
];

export default function Homepage() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

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

              <div className="services-grid">
                {topServices.map((item) => (
                  <div key={item.title} className="service-card">
                    <div className={`service-icon-circle ${item.iconType}-service-icon`}>
                      {item.iconType === "doctors" && (
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" />
                        </svg>
                      )}

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

                      {item.iconType === "pharmacy" && (
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M18 6h-1V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2M9 4h6v2H9zm4 14h-2v-3H8v-2h3v-3h2v3h3v2h-3z" />
                        </svg>
                      )}

                      {item.iconType === "therapy" && (
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M19 8h-1V6c0-1.1-.9-2-2-2H8C6.9 4 6 4.9 6 6v2H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h1v2c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-2h1c1.1 0 2-.9 2-2v-6c0-1.1-.9-2-2-2zm-3 12H8V6h8zm3-4h-3v-2h-2v2h-4v-2H8v2H5v-6h14z" />
                        </svg>
                      )}
                    </div>

                    <div className="service-text">
                      <h3>{item.title}</h3>
                      <p>{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="section quick-other-section">
                <div className="section-header">
                  <h2>Quick Actions</h2>
                  <button type="button" className="see-all-btn">
                    See All
                  </button>
                </div>

                <div className="quick-map-other-layout">
                  <div className="quick-other-left">
                    <div className="quick-grid">
                      {quickActions.map((item) => (
                        <div key={item.title} className="quick-card">
                          <div className={`quick-icon ${item.iconType}-icon`}>
                            {item.iconType === "calendar" && (
                              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M19 4h-2V2h-2v2H9V2H7v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2M5 20V8h14V6v14z"></path>
                                <path d="M7 11h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zm-8 4h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"></path>
                              </svg>
                            )}

                            {item.iconType === "medicine" && (
                              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M18 6h-1V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2M9 4h6v2H9zM6 20V8h12v12z"></path>
                                <path d="M13 10h-2v3H8v2h3v3h2v-3h3v-2h-3z"></path>
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

                            {item.iconType === "insurance" && (
                              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M12 2 4 5v6c0 5.25 3.4 10.17 8 11 4.6-.83 8-5.75 8-11V5l-8-3zm-1 13-3-3 1.41-1.41L11 12.17l3.59-3.58L16 10l-5 5z"></path>
                              </svg>
                            )}

                            {item.iconType === "records" && (
                              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8zm0 2.5L18.5 9H14zM8 13h8v2H8zm0 4h5v2H8zm0-8h3v2H8z"></path>
                              </svg>
                            )}
                          </div>

                          <div className="quick-text">
                            <h3>{item.title}</h3>
                            <p>{item.subtitle}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="other-services-wrap">
                      <h2>Other Services</h2>

                      <div className="other-grid">
                        {otherServices.map((item) => (
                          <div key={item.title} className="other-card">
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
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="map-card">
                    <div className="map-surface">
                      <div className="map-label">Bacoor</div>
                      <div className="map-pin pin-1"></div>
                      <div className="map-pin pin-2"></div>
                      <div className="map-pin pin-3"></div>
                      <div className="map-pin pin-4"></div>
                    </div>
                    <button type="button" className="find-clinic-btn">
                      Find Clinics Nearby
                    </button>
                  </div>
                </div>
              </div>

              <div className="bottom-tools-layout">
                <div className="mini-services-panel">
                  <div className="mini-services-title-row">
                    <div className="mini-services-title-icon"></div>
                    <h3>Other Services</h3>
                  </div>

                  <div className="mini-services-grid">
                    <div className="mini-service-item">
                      <div className="mini-service-icon emergency-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 2 1 21h22L12 2zm1 14h-2v2h2zm0-6h-2v5h2z"></path>
                        </svg>
                      </div>
                      <span>Emergency</span>
                    </div>

                    <div className="mini-service-item">
                      <div className="mini-service-icon help-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 17h-2v-2h2zm1.07-7.75-.9.92c-.72.73-1.17 1.33-1.17 2.83h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26a2 2 0 1 0-3.41-1.41H6a4 4 0 1 1 8 0c0 .88-.36 1.68-.93 2.25z"></path>
                        </svg>
                      </div>
                      <span>Help</span>
                    </div>

                    <div className="mini-service-item">
                      <div className="mini-service-icon logout-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M13 3h-2v10h2zm-1 19C6.48 22 2 17.52 2 12c0-3.53 1.84-6.63 4.61-8.4l1.01 1.73A7.96 7.96 0 0 0 4 12c0 4.41 3.59 8 8 8s8-3.59 8-8c0-2.8-1.45-5.27-3.64-6.69l1.01-1.73A9.96 9.96 0 0 1 22 12c0 5.52-4.48 10-10 10z"></path>
                        </svg>
                      </div>
                      <span>Logout</span>
                    </div>

                    <div className="mini-service-item">
                      <div className="mini-service-icon logout-lock-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7c-1.1 0-2 .9-2 2v10h14V10c0-1.1-.9-2-2-2zm-7-2a2 2 0 1 1 4 0v2h-4z"></path>
                        </svg>
                      </div>
                      <span>Logout</span>
                    </div>
                  </div>
                </div>

                <div className="voice-box">
                  <div className="voice-left">
                    <div className="voice-search-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M10 2a8 8 0 1 0 4.9 14.32l4.39 4.39 1.41-1.41-4.39-4.39A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm-.5 3h2v3.59l2.7 2.7-1.4 1.41L9.5 11.4z"></path>
                      </svg>
                    </div>
                    <span>Your health, just a voice away</span>
                  </div>

                  <button type="button" className="voice-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="footer-links">
                <span>About Us</span>
                <span>|</span>
                <span>Contact</span>
                <span>|</span>
                <span>Privacy Policy</span>
                <span>|</span>
                <span>Terms of Service</span>
              </div>
            </section>

            <aside className="health-articles-aside">
              <h3>Health Articles</h3>

              <div className="articles-list">
                {articles.map((article, index) => (
                  <div key={`${article.title}-${index}`} className="article-item">
                    <div className="article-img"></div>
                    <div className="article-text">
                      <h4>{article.title}</h4>
                      <p>{article.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}