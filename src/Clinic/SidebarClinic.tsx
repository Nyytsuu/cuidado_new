import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import "./SidebarClinic.css";
import { Link } from "react-router-dom";
import dashboardIcon from "../img/dashboard.png";
import userIcon from "../img/friends.png";
import serviceIcon from "../img/doctor-bag.png";
import settingIcon from "../img/setting.png";
import logoutIcon from "../img/logout.png";
import searchIcon from "../img/search.png";
import appointmentIcon from "../img/appointment.png";
import logo from "../img/logo.png";



interface SidebarProps {
  sidebarExpanded: boolean;
  setSidebarExpanded: Dispatch<SetStateAction<boolean>>;
  profileOpen: boolean;
  setProfileOpen: Dispatch<SetStateAction<boolean>>;
  headerProfileOpen?: boolean;
  setHeaderProfileOpen?: Dispatch<SetStateAction<boolean>>;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onSearchSubmit?: (value: string) => void;
}

export default function SidebarClinic({
  sidebarExpanded,
  setSidebarExpanded,
  setProfileOpen,
  headerProfileOpen = false,
  setHeaderProfileOpen = () => {},
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search keywords...",
  onSearchSubmit,
}: SidebarProps) {
  const [internalSearch, setInternalSearch] = useState("");
  const currentSearch = searchValue ?? internalSearch;

  const handleSearchChange = (value: string) => {
    if (searchValue === undefined) {
      setInternalSearch(value);
    }

    onSearchChange?.(value);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchSubmit?.(currentSearch.trim());
  };

  return (
    <div className="SidebarClinic">
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
          <div className="sidebar-item">
            <Link to="/clinic/dashboard">
              <img src={dashboardIcon} alt="Dashboard icon" />
              <span>Dashboard</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/clinic/patients">
              <img src={userIcon} alt="User icon" />
              <span>Patient</span>
            </Link>
          </div>
          
          <div className="sidebar-item">
            <Link to="/clinic/schedule">
              <img src={appointmentIcon} alt="Schedule" />
              <span>Schedule</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/clinic/appointments">
              <img src={appointmentIcon} alt="Appointments" />
              <span>Appointments</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/clinic/appointments">
              <img src={appointmentIcon} alt="Appointments" />
              <span>Appointments</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/clinic/services">
              <img src={serviceIcon} alt="Services icon" />
              <span>Services</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/clinic/settings">
              <img src={settingIcon} alt="Settings icon" />
              <span>Settings</span>
            </Link>
          </div>

          <div className="sidebar-item logout">
            <Link to="/signin">
              <img src={logoutIcon} alt="Logout icon" />
              <span>LOGOUT</span>
            </Link>
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
