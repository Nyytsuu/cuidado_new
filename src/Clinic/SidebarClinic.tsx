import type { Dispatch, SetStateAction } from "react";
import "./SidebarClinic.css";
import {Link} from "react-router-dom";
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

export default function SidebarClinic({
  sidebarExpanded,
  setSidebarExpanded,
  profileOpen,
  setProfileOpen,
  headerProfileOpen,
  setHeaderProfileOpen,
}: SidebarProps) {
  return (
    <div className="SidebarClinic">
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
              <img src={reportIcon} alt="Report icon" />
              <span>Reports</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/admin/settings">
              <img src={settingIcon} alt="Settings icon" />
              <span>Settings</span>
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
          <a className="nav-link" href="#">
            Home
          </a>
          <a className="nav-link" href="#">
            Appointments
          </a>

          <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
            <button
              type="button"
              className="nav-link profile-btn"
              onClick={() => setHeaderProfileOpen((v) => !v)}
            >
              Profile <span className="caret">▾</span>
            </button>

            <div className="profile-dropdown">
              <a href="#">My Profile</a>
              <a href="#">Settings</a>
              <a href="#">Logout</a>
            </div>
          </div>
        </nav>
      </header>
    </div>
  );
}