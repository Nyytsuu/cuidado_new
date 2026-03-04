import type { Dispatch, SetStateAction } from "react";
import "./SidebarAdmin.css";
import {Link, useNavigate} from "react-router-dom";
import dashboardIcon from "../img/dashboard.png";
import clinicIcon from "../img/calendar.png";
import appointmentIcon from "../img/appointment.png";
import userIcon from "../img/friends.png";
import serviceIcon from "../img/doctor-bag.png";
import reportIcon from "../img/graph-analysis.png";
import settingIcon from "../img/setting.png";
import logoutIcon from "../img/logout.png";

import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

interface SidebarProps {
  sidebarExpanded: boolean;
  setSidebarExpanded: Dispatch<SetStateAction<boolean>>;
  profileOpen: boolean;
  setProfileOpen: Dispatch<SetStateAction<boolean>>;

  headerProfileOpen: boolean;
  setHeaderProfileOpen: Dispatch<SetStateAction<boolean>>;
}

export default function SidebarAdmin({
  sidebarExpanded,
  setSidebarExpanded,
  profileOpen,
  setProfileOpen,
  headerProfileOpen,
  setHeaderProfileOpen,
}: SidebarProps) {
  const navigate = useNavigate();

const handleLogout = () => {
  // remove auth data
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // optional: clear session cookie via API
  // await fetch("/api/logout", { method: "POST", credentials: "include" });

  navigate("/login");
};
  return (
    <div className="SidebarAdmin">
      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar ${sidebarExpanded ? "expanded" : ""}`}>
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
            ☰
          </button>
        </div>

        <div className="sidebar-content">
          <div className={`sidebar-item ${profileOpen ? "open" : ""}`}>
            <button
              type="button"
              className="sidebar-btn"
              onClick={(e) => {
                e.stopPropagation();
                setProfileOpen((v) => !v);
                if (!sidebarExpanded) setSidebarExpanded(true);
              }}
            >
              <Link to="/admin/dashboard">
              <img src={dashboardIcon} alt="Dashboard icon" />
              <span>Dashboard</span>
              </Link>
            </button>
          </div>

          <div className="sidebar-item">
            <Link to="/admin/clinics">
              <img src={clinicIcon} alt="Clinic icon" />
              <span>Clinics</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/admin/appointments">
              <img src={appointmentIcon} alt="Appointment icon" />
              <span>Appointments</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/admin/users">
              <img src={userIcon} alt="User icon" />
              <span>Users</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/admin/services">
              <img src={serviceIcon} alt="Services icon" />
              <span>Services</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/admin/reports">
              <img src={reportIcon} alt="report icon" />
              <span>reports</span>
            </Link>
          </div>


          

              

          <div className="sidebar-item logout">
            <Link to="/login">
              <img src={logoutIcon} alt="Logout icon" />
              <span>LOGOUT</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* ===== HEADER ===== */}
      <header className="app-header">
        <div className="header-left">
          <img src={logo} alt="CUIDADO logo" className="brand-logo" />

          <div className="header-search">
            <input type="text" placeholder="Search keywords..." />
            <button aria-label="Search" type="button" className="search-btn">
              <img src={searchIcon} alt="Search" />
            </button>
          </div>
        </div>

        <nav className="header-nav">
          <a className="nav-link" href="../admin/dashboard">Home</a>
            <a className="nav-link" href="../admin/appointments">Appointments</a>

         <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
              <button
                type="button"
                className="nav-link profile-btn"
                onClick={() => setHeaderProfileOpen((v) => !v)}
              >
                Profile <span className="caret">▾</span>
              </button>

              <div className="profile-dropdown">
  <Link to="/admin/profile">My Profile</Link>

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
        </nav>
      </header>
    </div>
  );
}