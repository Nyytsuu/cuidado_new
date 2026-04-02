import type { Dispatch, SetStateAction } from "react";
import "./UserSidebar.css";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  House,
  CalendarDays,
  Stethoscope,
  ChartColumn,
  Brain,
  MapPin,
  Scale,
  Smile,
  Mic,
  User,
  Settings,
  Bell,
  TriangleAlert,
  CircleHelp,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import searchIcon from "../img/search.png";
import logo from "../img/logo.png";
import userIcon from "../img/friends.png";

interface SidebarProps {
  sidebarExpanded: boolean;
  setSidebarExpanded: Dispatch<SetStateAction<boolean>>;
  profileOpen: boolean;
  setProfileOpen: Dispatch<SetStateAction<boolean>>;
  headerProfileOpen: boolean;
  setHeaderProfileOpen: Dispatch<SetStateAction<boolean>>;
}

export default function UserSidebar({
  sidebarExpanded,
  setSidebarExpanded,
  profileOpen,
  setProfileOpen,
  headerProfileOpen,
  setHeaderProfileOpen,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isPathActive = (path: string) => location.pathname === path;

  return (
    <div className={`user-layout ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar ${sidebarExpanded ? "expanded" : "collapsed"}`}
  onClick={() => {
    if (!sidebarExpanded) setSidebarExpanded(true);
  }}>
        <div className="sidebar-top">
          <button
            className="sidebar-toggle"
            aria-label="Toggle sidebar"
            type="button"
            onClick={() => {
              setSidebarExpanded((prev) => {
                const next = !prev;
                if (!next) setProfileOpen(false);
                return next;
              });
            }}
          >
            {sidebarExpanded ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
          </button>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-section">
            <p className="sidebar-section-title">MAIN</p>

            <div className={`sidebar-item ${isPathActive("/admin/dashboard") ? "active" : ""}`}>
  <Link to="#" className="sidebar-btn">
    <House size={24} />
    <span>Dashboard</span>
  </Link>
</div>

           <div className="sidebar-item active">
  <Link to="#" className="sidebar-btn">
    <CalendarDays size={24} />
    <span>Appointments</span>
  </Link>
</div>

            <div className={`sidebar-item ${isPathActive("/admin/health-topics") ? "active" : ""}`}>
              <Link to="#" className="sidebar-btn">
                <Stethoscope size={24} />
                <span>Health Topics</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/admin/records") ? "active" : ""}`}>
              <Link to="#" className="sidebar-btn">
                <ChartColumn size={24} />
                <span>Records</span>
              </Link>
            </div>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title">TOOLS</p>

            <div className={`sidebar-item ${isPathActive("/admin/symptom-checker") ? "active" : ""}`}>
              <Link to="#" className="sidebar-btn">
                <Brain size={24} />
                <span>Symptom Checker</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/admin/find-clinics") ? "active" : ""}`}>
              <Link to="/admin/find-clinics" className="sidebar-btn">
                <MapPin size={24} />
                <span>Find Clinics</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/admin/bmi") ? "active" : ""}`}>
              <Link to="#" className="sidebar-btn">
                <Scale size={24} />
                <span>BMI</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/admin/stress-index") ? "active" : ""}`}>
              <Link to="#" className="sidebar-btn">
                <Smile size={24} />
                <span>Stress Index</span>
              </Link>
            </div>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title">SMART</p>

            <div className={`sidebar-item ${isPathActive("/admin/voice-assistant") ? "active" : ""}`}>
              <Link to="#" className="sidebar-btn">
                <Mic size={24} />
                <span>Voice Assistant</span>
              </Link>
            </div>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title">PERSONAL</p>

            <div className={`sidebar-item ${isPathActive("/admin/profile") ? "active" : ""}`}>
              <Link to="#" className="sidebar-btn">
                <User size={24} />
                <span>Profile</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/admin/settings") ? "active" : ""}`}>
              <Link to="#" className="sidebar-btn">
                <Settings size={24} />
                <span>Settings</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/admin/notifications") ? "active" : ""}`}>
              <Link to="#" className="sidebar-btn">
                <Bell size={24} />
                <span>Notifications</span>
              </Link>
            </div>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title">SUPPORT</p>

            <div className={`sidebar-item ${isPathActive("/admin/emergency") ? "active" : ""}`}>
              <Link to="#" className="sidebar-btn">
                <TriangleAlert size={24} />
                <span>Emergency</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/admin/help") ? "active" : ""}`}>
              <Link to="#" className="sidebar-btn">
                <CircleHelp size={24} />
                <span>Help</span>
              </Link>
            </div>
          </div>

          <div className="sidebar-item logout">
            <button type="button" className="sidebar-btn" onClick={handleLogout}>
              <LogOut size={24} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ===== HEADER ===== */}
      <header className="app-header">
        <div className="header-left">
          <img src={logo} alt="CUIDADO logo" className="brand-logo" />

          <div className="header-search">
            <input type="text" placeholder="Search..." />
            <button aria-label="Search" type="button" className="search-btn">
              <img src={searchIcon} alt="Search" />
            </button>
          </div>
        </div>

        <nav className="header-nav">
          <Link
            to="#"
            className={`nav-link ${
              location.pathname === "/admin/dashboard" ? "active" : ""
            }`}
          >
            Home
          </Link>

          <Link to="#" className="nav-link active">
            Appointments
          </Link>

          <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
            <button
              type="button"
              className={`nav-link profile-btn ${
                location.pathname === "/admin/profile" ||
                location.pathname === "/admin/settings"
                  ? "active"
                  : ""
              }`}
              onClick={() => setHeaderProfileOpen((v) => !v)}
            >
              Profile <span className="caret">▼</span>
            </button>

            <div className="profile-dropdown">
              <Link to="#" >My Profile</Link>
              <Link to="#" >Settings</Link>
              <button
                type="button"
                className="dropdown-logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>

          <div className="header-avatar">
            <img src={userIcon} alt="Profile" />
          </div>
        </nav>
      </header>
    </div>
  );
}