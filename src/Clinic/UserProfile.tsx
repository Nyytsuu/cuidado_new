import React, { useState } from "react";
import "./UserProfile.css";
import micIcon from "../img/mic.png";
import profileImg from "../img/profile1.jpg";
import logo from "../img/logo.png";
import searchIcon from "../img/search.png";

const menuItems = [
  { label: "Home", icon: "⌂" },
  { label: "Health Topics", icon: "♡" },
  { label: "My Profile", icon: "👨‍⚕️", active: true },
  { label: "Settings", icon: "⚙" },
  { label: "Saved Articles", icon: "🔖" },
  { label: "Find Clinics", icon: "📍" },
];

const generalItems = [
  { label: "Emergency Guide", icon: "🚑" },
  { label: "Log Out", icon: "⏻" },
];

const articles = [
  "Managing High Blood Pressure",
  "Healthy Eating for the Heart",
  "Stress Management Tips",
];

const activityLog = [
  {
    status: "done",
    text: "Updated account information",
    time: "10:21 AM",
  },
  {
    status: "saved",
    text: "Saved article: Heart Attack",
    time: "Yesterday, 6:45 PM",
  },
  {
    status: "done",
    text: "Logged into account",
    time: "Yesterday, 9:07 AM",
  },
];

export default function UserProfile() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  return (
    <div className="profile-page">
      <div className="health-app">
        <header className="app-header">
          <div className="header-left">
            <img src={logo} alt="CUIDADO logo" className="brand-logo" />
          </div>

          <div className="header-center">
            <div className="header-search">
              <input type="text" placeholder="Search..." />
              <button aria-label="Search" type="button" className="search-btn">
                <img src={searchIcon} alt="Search" />
              </button>
            </div>
          </div>

          <div className="header-right">
            <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
              <button
                type="button"
                className="profile-avatar-btn"
                onClick={() => setHeaderProfileOpen((v) => !v)}
              >
                <img
                  src={profileImg}
                  alt="Profile"
                  className="header-avatar-img"
                />
                <span className="caret">⌄</span>
              </button>

              <div className="profile-dropdown">
                <a href="#">My Profile</a>
                <a href="#">Settings</a>
                <a href="#">Logout</a>
              </div>
            </div>
          </div>
        </header>

        <main className="main-content">
          <aside className="icon-rail">
            <div className="icon-rail-top">
              <button
                className="rail-icon rail-avatar"
                aria-label="Profile"
                type="button"
              >
                <img
                  src={profileImg}
                  alt="Profile"
                  className="rail-avatar-img"
                />
              </button>
            </div>

            <div className="icon-rail-menu">
              <button className="rail-icon" aria-label="Home" type="button">
                ⌂
              </button>
              <button
                className="rail-icon"
                aria-label="Favorites"
                type="button"
              >
                💗
              </button>
              <button className="rail-icon" aria-label="Health" type="button">
                🫁
              </button>
              <button className="rail-icon" aria-label="Brain" type="button">
                🧠
              </button>
            </div>
          </aside>

          <aside className="sidebar">
            <div className="profile-mini">
              <div className="avatar">👨‍⚕️</div>
              <div>
                <h3>Dr. John Smith</h3>
                <p>john.smith@gmail.com</p>
              </div>
            </div>

            <div className="notification-pill">
              <span>🔔 New Notifications</span>
              <strong>3</strong>
            </div>

            <nav className="nav-section">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  className={`nav-item ${item.active ? "active" : ""}`}
                  type="button"
                >
                  <span className="nav-left">
                    <span className="icon">{item.icon}</span>
                    {item.label}
                  </span>
                  {(item.label === "Health Topics" ||
                    item.label === "My Profile" ||
                    item.label === "Saved Articles" ||
                    item.label === "Find Clinics") && <span>›</span>}
                </button>
              ))}
            </nav>

            <div className="section-label">General</div>

            <nav className="nav-section">
              {generalItems.map((item) => (
                <button key={item.label} className="nav-item" type="button">
                  <span className="nav-left">
                    <span className="icon">{item.icon}</span>
                    {item.label}
                  </span>
                  {item.label === "Emergency Guide" && <span>›</span>}
                </button>
              ))}
            </nav>

            <div className="sidebar-card">
              <div className="sidebar-card-title">💡 Did You Know?</div>
              <p>
                A healthy lifestyle, including a balanced diet and regular
                exercise, can reduce the risk of heart disease by up to 80%.
              </p>
            </div>
          </aside>

          <header className="topbar">
            <div className="topbar-left">
              <div className="page-path">
                <span className="path-active">My Profile</span>
                <span className="path-separator"> / </span>
                <span className="path-current">Settings</span>
              </div>

              <div className="profile-settings-tabs">
                <button className="profile-settings-tab" type="button">
                  My Profile
                </button>
                <button className="profile-settings-tab-active" type="button">
                  Settings
                </button>
              </div>
            </div>

            <button className="edit-button" type="button">
              Edit Profile
            </button>
          </header>

          <div className="content-grid">
            <section className="main-panel">
              <h2>Account</h2>

              <div className="account-card">
                <div className="account-top">
                  <div className="account-user">
                    <div className="avatar large">👨‍⚕️</div>
                    <div>
                      <h3>Dr. John Smith</h3>
                      <p>john.smith@gmail.com</p>
                    </div>
                  </div>
                </div>

                <div className="account-divider" />

                <div className="account-details">
                  <div>
                    <label>Date of Birth:</label>
                    <p>March 21, 1980</p>
                  </div>
                  <div>
                    <label>&nbsp;</label>
                    <p>Male</p>
                  </div>
                  <div className="account-action">
                    <button className="primary-btn" type="button">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>

              <h2>Notifications</h2>

              <div className="notifications-grid">
                <div className="setting-box">
                  <div className="setting-row">
                    <span>Email Notifications</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={() =>
                          setEmailNotifications((prev) => !prev)
                        }
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  <div className="setting-row">
                    <span>Push Notifications</span>
                    <select
                      defaultValue="Weekly"
                      disabled={!emailNotifications}
                    >
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </select>
                  </div>
                </div>

                <div className="setting-box">
                  <div className="setting-row">
                    <span>Health Reminders</span>
                    <select defaultValue="Weekly">
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </select>
                  </div>
                  <div className="setting-row">
                    <span>Health Tips</span>
                    <select defaultValue="Weekly">
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </select>
                  </div>
                </div>
              </div>

              <h2>Security</h2>

              <div className="security-card">
                <div className="security-row">
                  <span>Current Password</span>
                  <div className="password-box">
                    <input type="password" value="password" readOnly />
                    <span className="eye">◉</span>
                  </div>
                </div>

                <div className="security-row">
                  <span>New Password</span>
                  <div className="password-box">
                    <input type="password" value="password" readOnly />
                    <span className="eye">◉</span>
                  </div>
                </div>

                <div className="security-row">
                  <span>Confirm New Password</span>
                  <div className="password-box">
                    <input type="password" value="password" readOnly />
                    <span className="eye">◉</span>
                  </div>
                </div>

                <div className="security-actions">
                  <button className="update-btn" type="button">
                    Update Password
                  </button>
                </div>
              </div>

              <footer className="footer-links">
                <a href="/">About Us</a>
                <a href="/">Contact</a>
                <a href="/">Privacy Policy</a>
                <a href="/">Terms of Service</a>
              </footer>
            </section>

            <aside className="right-panel">
              <div className="side-widget">
                <h3>Personalized Articles</h3>
                <div className="widget-list">
                  {articles.map((article) => (
                    <div key={article} className="widget-item">
                      <span className="heart-icon">♡</span>
                      <span>{article}</span>
                    </div>
                  ))}
                </div>
                <a href="/">View all</a>
              </div>

              <div className="side-widget">
                <h3>Activity Log</h3>
                <div className="activity-list">
                  {activityLog.map((item, index) => (
                    <div key={index} className="activity-item">
                      <span
                        className={`status-dot ${
                          item.status === "done" ? "done" : "saved"
                        }`}
                      >
                        {item.status === "done" ? "✓" : "🔖"}
                      </span>
                      <div>
                        <p>{item.text}</p>
                        <small>{item.time}</small>
                      </div>
                    </div>
                  ))}
                </div>
                <a href="/">View all</a>
              </div>

              <div className="side-widget info-widget">
                <h3>💡 Did You Know?</h3>
                <p>
                  A healthy lifestyle, including a balanced diet and regular
                  exercise, can reduce the risk of heart disease by up to 80%.
                </p>
              </div>
            </aside>
          </div>

          <button className="floating-mic" type="button">
            <img src={micIcon} alt="Microphone" className="floating-mic-icon" />
          </button>
        </main>
      </div>
    </div>
  );
}