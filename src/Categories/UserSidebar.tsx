import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
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
  Bell,
  Menu,
  TriangleAlert,
  CircleHelp,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import searchIcon from "../img/search.png";
import logo from "../img/logo.png";
import userIcon from "../img/friends.png";
import { clearStoredAuth } from "../authSession";
import { getConfiguredBackendUrl } from "../sharedBackendFetch";

type HeaderUser = {
  id?: number;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  profile_picture?: string | null;
};

type HeaderNotification = {
  is_read?: number | boolean | null;
  unread?: boolean | null;
};

const fixImageUrl = (url?: string | null) => {
  const path = String(url || "").trim();
  if (!path) return "";

  const backendUrl = getConfiguredBackendUrl();

  if (path.startsWith("http://localhost:5000")) {
    return path.replace("http://localhost:5000", backendUrl);
  }

  if (path.startsWith("/uploads")) {
    return `${backendUrl}${path}`;
  }

  if (path.startsWith("uploads")) {
    return `${backendUrl}/${path}`;
  }

  return path;
};

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

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
  const [headerUser, setHeaderUser] = useState<HeaderUser | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const apiBase = getConfiguredBackendUrl();

  const isPathActive = (path: string) => location.pathname === path;

  const headerDisplayName =
    headerUser?.full_name || headerUser?.name || "My Profile";

  const headerDisplayEmail = headerUser?.email || "View account";

  const headerProfileImage =
    fixImageUrl(headerUser?.profile_picture) || userIcon;

  const storedHeaderUser = useMemo(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? (JSON.parse(storedUser) as HeaderUser) : null;
    } catch (err) {
      console.error("Header user parse error:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const readStoredHeaderUser = () => {
      try {
        const storedUser = localStorage.getItem("user");
        return storedUser ? (JSON.parse(storedUser) as HeaderUser) : null;
      } catch (err) {
        console.error("Header user parse error:", err);
        return storedHeaderUser;
      }
    };

    const loadHeaderUser = async () => {
      const latestStoredHeaderUser = readStoredHeaderUser();

      setHeaderUser(latestStoredHeaderUser);

      if (!latestStoredHeaderUser?.id) return;

      try {
        const res = await fetch(
          `${apiBase}/api/users/${latestStoredHeaderUser.id}/profile`,
          {
            cache: "no-store",
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!cancelled && res.ok) {
          const updatedUser = {
            ...latestStoredHeaderUser,
            ...data,
          };

          setHeaderUser(updatedUser);

          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } catch (err) {
        console.error("Header profile load error:", err);
      }
    };

    void loadHeaderUser();

    const handleProfileUpdated = () => {
      void loadHeaderUser();
    };

    window.addEventListener("user-profile-updated", handleProfileUpdated);
    window.addEventListener("storage", handleProfileUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("user-profile-updated", handleProfileUpdated);
      window.removeEventListener("storage", handleProfileUpdated);
    };
  }, [apiBase, storedHeaderUser]);

  useEffect(() => {
    let cancelled = false;

    const userId =
      headerUser?.id ||
      storedHeaderUser?.id ||
      (() => {
        try {
          const storedUser = localStorage.getItem("user");
          const user = storedUser ? (JSON.parse(storedUser) as HeaderUser) : null;
          return user?.id;
        } catch {
          return undefined;
        }
      })();

    const loadUnreadNotifications = async () => {
      if (!userId) {
        setUnreadNotifications(0);
        return;
      }

      try {
        const res = await fetch(`${apiBase}/api/users/${userId}/notifications`, {
          cache: "no-store",
        });

        const data = (await res.json().catch(() => [])) as HeaderNotification[];

        if (!res.ok || !Array.isArray(data)) {
          if (!cancelled) setUnreadNotifications(0);
          return;
        }

        const unreadCount = data.filter((item) => {
          if (typeof item.unread === "boolean") return item.unread;
          return Number(item.is_read) === 0;
        }).length;

        if (!cancelled) setUnreadNotifications(unreadCount);
      } catch (err) {
        console.error("Header notifications load error:", err);
        if (!cancelled) setUnreadNotifications(0);
      }
    };

    void loadUnreadNotifications();

    const handleNotificationUpdated = () => {
      void loadUnreadNotifications();
    };

    window.addEventListener("focus", handleNotificationUpdated);
    window.addEventListener("user-notifications-updated", handleNotificationUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleNotificationUpdated);
      window.removeEventListener("user-notifications-updated", handleNotificationUpdated);
    };
  }, [apiBase, headerUser?.id, storedHeaderUser?.id, location.pathname]);

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

  const hasUnreadNotifications = unreadNotifications > 0;
  const notificationBadge =
    unreadNotifications > 9 ? "9+" : String(unreadNotifications);

  const notificationAriaLabel = hasUnreadNotifications
    ? `Open notifications, ${unreadNotifications} unread`
    : "Open notifications";

  return (
    <div className={`user-layout ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      {sidebarExpanded && (
        <button
          type="button"
          className="sidebar-mobile-backdrop"
          aria-label="Close sidebar"
          onClick={() => {
            setSidebarExpanded(false);
            setProfileOpen(false);
            setHeaderProfileOpen(false);
          }}
        />
      )}

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

            <div className={`sidebar-item ${isPathActive("/stress-index") ? "active" : ""}`}>
              <Link to="/stress-index" className="sidebar-btn">
                <Smile size={24} />
                <span>Stress Index</span>
              </Link>
            </div>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title">SMART</p>

            <div className={`sidebar-item ${isPathActive("/voice-assistant") ? "active" : ""}`}>
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

            <div className={`sidebar-item ${isPathActive("/notifications") ? "active" : ""}`}>
              <Link to="/notifications" className="sidebar-btn">
                <Bell size={24} />
                <span>Notifications</span>
              </Link>
            </div>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title">SUPPORT</p>

            <div
              className={`sidebar-item ${
                isPathActive("/emergency") || isPathActive("/emergency-guide")
                  ? "active"
                  : ""
              }`}
            >
              <Link to="/emergency" className="sidebar-btn">
                <TriangleAlert size={24} />
                <span>Emergency</span>
              </Link>
            </div>

            <div className={`sidebar-item ${isPathActive("/help") ? "active" : ""}`}>
              <Link to="/help" className="sidebar-btn">
                <CircleHelp size={24} />
                <span>Help</span>
              </Link>
            </div>
          </div>

          <div className="sidebar-item logout">
            <button
              type="button"
              className="sidebar-btn"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut size={24} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <header className="user-mobile-header">
        <div className="user-mobile-header-bar">
          <button
            type="button"
            className="user-mobile-header-button"
            aria-label="Open sidebar"
            onClick={() => setSidebarExpanded(true)}
          >
            <Menu size={20} />
          </button>

          <img src={logo} alt="CUIDADO logo" className="user-mobile-header-logo" />

          <Link
            to="/notifications"
            className={`user-mobile-header-button user-mobile-header-alert ${
              location.pathname === "/notifications" ? "active" : ""
            } ${hasUnreadNotifications ? "has-unread" : ""}`}
            aria-label={notificationAriaLabel}
            onClick={() => setHeaderProfileOpen(false)}
          >
            <Bell size={19} />
            {hasUnreadNotifications && (
              <span className="notification-badge">{notificationBadge}</span>
            )}
          </Link>
        </div>

        <form className="user-mobile-header-search" onSubmit={handleSearchSubmit}>
          <button aria-label="Search" type="submit" className="user-mobile-search-icon">
            <img src={searchIcon} alt="Search" />
          </button>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={currentSearch}
            onChange={(event) => handleSearchChange(event.target.value)}
          />
        </form>
      </header>

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
            to="/notifications"
            className={`header-notification-button ${
              location.pathname === "/notifications" ? "active" : ""
            } ${hasUnreadNotifications ? "has-unread" : ""}`}
            aria-label={notificationAriaLabel}
            title={
              hasUnreadNotifications
                ? `${unreadNotifications} unread notifications`
                : "Notifications"
            }
            onClick={() => setHeaderProfileOpen(false)}
          >
            <Bell size={18} />
            {hasUnreadNotifications && (
              <span className="notification-badge">{notificationBadge}</span>
            )}
          </Link>

          <Link
            to="/homepage"
            className={`nav-link ${location.pathname === "/homepage" ? "active" : ""}`}
          >
            Home
          </Link>

          <Link
            to="/appointments"
            className={`nav-link ${
              location.pathname === "/appointments" ? "active" : ""
            }`}
          >
            Appointments
          </Link>

          <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
            <button
              type="button"
              className={`nav-link profile-btn ${
                location.pathname === "/profile" ||
                location.pathname === "/notifications"
                  ? "active"
                  : ""
              }`}
              onClick={() => setHeaderProfileOpen((v) => !v)}
            >
              Profile <ChevronDown size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>

            <div className="profile-dropdown">
              <Link
                className="profile-dropdown-summary"
                to="/profile"
                onClick={() => setHeaderProfileOpen(false)}
              >
                <img src={headerProfileImage} alt="Profile" />
                <span>
                  <strong>{headerDisplayName}</strong>
                  <small>{headerDisplayEmail}</small>
                </span>
              </Link>

              <Link to="/profile" onClick={() => setHeaderProfileOpen(false)}>
                My Profile
              </Link>

              <Link to="/notifications" onClick={() => setHeaderProfileOpen(false)}>
                Notifications
              </Link>

              <button
                type="button"
                className="dropdown-logout"
                onClick={() => {
                  setHeaderProfileOpen(false);
                  setShowLogoutConfirm(true);
                }}
              >
                Logout
              </button>
            </div>
          </div>

          <Link
            to="/profile"
            className={`header-avatar ${
              location.pathname === "/profile" ? "active" : ""
            }`}
            aria-label="Open profile"
            onClick={() => setHeaderProfileOpen(false)}
          >
            <img src={headerProfileImage} alt="Profile" />
          </Link>
        </nav>
      </header>

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
                  clearStoredAuth();
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

      {showLogoutSuccess && (
        <div className="logout-popup-overlay">
          <div className="logout-popup">
            <div className="logout-icon">✓</div>
            <p>Logged out successfully</p>
          </div>
        </div>
      )}
    </div>
  );
}