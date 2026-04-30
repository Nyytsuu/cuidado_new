import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import "./UserSidebar.css";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  House,
  CalendarDays,
  Stethoscope,
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
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onSearchSubmit?: (value: string) => void;
}

export default function UserSidebar({
  sidebarExpanded,
  setSidebarExpanded,
  setProfileOpen,
  headerProfileOpen,
  setHeaderProfileOpen,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  onSearchSubmit,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [internalSearch, setInternalSearch] = useState("");
  const currentSearch = searchValue ?? internalSearch;

  const handleLogout = () => {
  setShowConfirmLogout(true);
};
const confirmLogout = () => {
  setShowConfirmLogout(false);
  setShowLogoutSuccess(true);

  setTimeout(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/Signin");
  };

  const isPathActive = (path: string) => location.pathname === path;

  const handleSearchChange = (value: string) => {
    if (searchValue === undefined) {
      setInternalSearch(value);
    }

    onSearchChange?.(value);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const keyword = currentSearch.trim();

    if (onSearchSubmit) {
      onSearchSubmit(keyword);
      return;
    }

    if (keyword) {
      navigate(`/browse-health?search=${encodeURIComponent(keyword)}`);
    }
  };

  return (
    <div className={`user-layout ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <aside
        className={`sidebar ${sidebarExpanded ? "expanded" : "collapsed"}`}
        onClick={() => {
          if (!sidebarExpanded) setSidebarExpanded(true);
        }}
      >
        <div className="sidebar-top">
          <button
            className="sidebar-toggle"
            aria-label="Toggle sidebar"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
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

            <div className={`sidebar-item ${isPathActive("/homepage") ? "active" : ""}`}>
              <Link to="/homepage" className="sidebar-btn">
                <House size={24} />
                <span>Dashboard</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/appointments") ? "active" : ""}`}>
              <Link to="/appointments" className="sidebar-btn">
                <CalendarDays size={24} />
                <span>Appointments</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/browse-health") ? "active" : ""}`}>
              <Link to="/browse-health" className="sidebar-btn">
                <Stethoscope size={24} />
                <span>Health Topics</span>
              </Link>
            </div>

          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title">TOOLS</p>

            <div className={`sidebar-item ${isPathActive("/symptom-checker") ? "active" : ""}`}>
              <Link to="/symptom-checker" className="sidebar-btn">
                <Brain size={24} />
                <span>Symptom Checker</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/find-clinic") ? "active" : ""}`}>
              <Link to="/find-clinic" className="sidebar-btn">
                <MapPin size={24} />
                <span>Find Clinics</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/bmi-calculator") ? "active" : ""}`}>
              <Link to="/bmi-calculator" className="sidebar-btn">
                <Scale size={24} />
                <span>BMI</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/admin/stress-index") ? "active" : ""}`}>
              <Link to="/stress-index" className="sidebar-btn">
                <Smile size={24} />
                <span>Stress Index</span>
              </Link>
            </div>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title">SMART</p>

            <div className={`sidebar-item ${isPathActive("/admin/voice-assistant") ? "active" : ""}`}>
              <Link to="/voice-assistant" className="sidebar-btn">
                <Mic size={24} />
                <span>Voice Assistant</span>
              </Link>
            </div>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title">PERSONAL</p>

            <div className={`sidebar-item ${isPathActive("/profile") ? "active" : ""}`}>
              <Link to="/profile" className="sidebar-btn">
                <User size={24} />
                <span>Profile</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/admin/settings") ? "active" : ""}`}>
              <Link to="/admin/settings" className="sidebar-btn">
                <Settings size={24} />
                <span>Settings</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/admin/notifications") ? "active" : ""}`}>
              <Link to="/admin/notifications" className="sidebar-btn">
                <Bell size={24} />
                <span>Notifications</span>
              </Link>
            </div>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title">SUPPORT</p>

            <div className={`sidebar-item ${isPathActive("/admin/emergency") ? "active" : ""}`}>
              <Link to="/admin/emergency" className="sidebar-btn">
                <TriangleAlert size={24} />
                <span>Emergency</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/admin/help") ? "active" : ""}`}>
              <Link to="/admin/help" className="sidebar-btn">
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

      <header className="app-header">
        <div className="header-left">
          <img src={logo} alt="CUIDADO logo" className="brand-logo" />

          <form className="header-search" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={currentSearch}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
            <button aria-label="Search" type="submit" className="search-btn">
              <img src={searchIcon} alt="Search" />
            </button>
          </form>
        </div>

        <nav className="header-nav">
          <Link
            to="/homepage"
            className={`nav-link ${location.pathname === "/homepage" ? "active" : ""}`}
          >
            Home
          </Link>

          <Link
            to="/appointments"
            className={`nav-link ${location.pathname === "/appointments" ? "active" : ""}`}
          >
            Appointments
          </Link>

          <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
            <button
              type="button"
              className={`nav-link profile-btn ${
                location.pathname === "/profile" ||
                location.pathname === "/admin/settings"
                  ? "active"
                  : ""
              }`}
              onClick={() => setHeaderProfileOpen((v) => !v)}
            >
              Profile <span className="caret">▼</span>
            </button>

            <div className="profile-dropdown">
              <Link to="/profile">My Profile</Link>
              <Link to="/admin/settings">Settings</Link>
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



      {/* LOGOUT CONFIRM MODAL */}
{showConfirmLogout && (
  <div className="logout-confirm-overlay">
    <div className="logout-confirm-modal">
      <h3>Confirm Logout</h3>
      <p>Are you sure you want to logout?</p>

      <div className="logout-actions">
        <button className="btn-cancel" onClick={cancelLogout}>
          No
        </button>
        <button className="btn-confirm" onClick={confirmLogout}>
          Yes
        </button>
      </div>
    </div>
  </div>
)}

{/* LOGOUT SUCCESS POPUP */}
{showLogoutSuccess && (
  <div className="logout-popup-overlay">
    <div className="logout-popup">
      <div className="logout-icon">✓</div>
      <p>Logout successful!</p>
    </div>
  </div>
)}
    </div>



  );
}
