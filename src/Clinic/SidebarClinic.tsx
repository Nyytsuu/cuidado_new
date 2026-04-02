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
import calendar1 from "../img/calendar1.png";



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

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSearchChange = (value: string) => {
    if (searchValue === undefined) setInternalSearch(value);
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
            </button>
          </div>
        </div>
      </aside>

      <header className="app-header">
        <div className="header-left">
          <img src={logo} className="brand-logo" />

          <form className="header-search" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={currentSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <button className="search-btn">
              <img src={searchIcon} />
            </button>
          </form>
        </div>

        <nav className="header-nav">
          <Link className="nav-link" to="/clinic/dashboard">Home</Link>
          <Link className="nav-link" to="/clinic/appointments">Appointments</Link>

          <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
            <button
              className="nav-link profile-btn"
              onClick={() => setHeaderProfileOpen((v) => !v)}
            >
              Profile ▾
            </button>

            <div className="profile-dropdown">
              <Link to="/clinic/profile">My Profile</Link>

              {/* HEADER LOGOUT */}
              <button
                className="logout-btn"
                onClick={() => {
                  setHeaderProfileOpen(false);
                  setShowLogoutConfirm(true);
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* CONFIRM MODAL */}
      {showLogoutConfirm && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm-modal">
            <h3>Log out?</h3>
            <p>Are you sure you want to log out of your account?</p>

            <div className="logout-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowLogoutConfirm(false)}
              >
                No
              </button>

              <button
                className="btn-confirm"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  setShowLogoutSuccess(true);

                  setTimeout(() => {
                    navigate("/signin");
                  }, 1500);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS POPUP */}
      {showLogoutSuccess && (
        <div className="logout-popup-overlay">
          <div className="logout-popup">
            <div className="logout-icon">✓</div>
            <h3>Logged out successfully</h3>
          </div>
        </div>
      )}
    </div>
  );
}
