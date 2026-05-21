import {
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import "./SidebarClinic.css";
import { Link, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { clearStoredAuth } from "../authSession";
import { apiUrl } from "../sharedBackendFetch";

import dashboardIcon from "../img/dashboard.png";
import userIcon from "../img/friends.png";
import serviceIcon from "../img/doctor-bag.png";
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
  headerProfileOpen?: boolean;
  setHeaderProfileOpen?: Dispatch<SetStateAction<boolean>>;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onSearchSubmit?: (value: string) => void;
}

type ClinicNotification = {
  id: number;
  title: string;
  message: string;
  category?: string | null;
  icon?: string | null;
  unread?: boolean;
  is_read?: number | boolean;
  appointment_id?: number | null;
  created_at?: string | null;
};

const getStoredClinicId = () => {
  try {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    if (user?.role === "clinic" && user?.clinic_id) {
      return Number(user.clinic_id);
    }

    if (user?.role === "clinic" && user?.id) {
      return Number(user.id);
    }

    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("userId");

    if (role === "clinic" && userId) {
      return Number(userId);
    }
  } catch {
    return null;
  }

  return null;
};

const formatClinicNotificationDate = (value?: string | null) => {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [clinicNotifications, setClinicNotifications] = useState<
    ClinicNotification[]
  >([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const navigate = useNavigate();
  const unreadNotificationCount = clinicNotifications.filter(
    (notification) =>
      notification.unread || Number(notification.is_read) === 0
  ).length;

  useEffect(() => {
    const clinicId = getStoredClinicId();
    if (!clinicId) return;

    let cancelled = false;

    const loadClinicNotifications = async (showLoading = false) => {
      if (showLoading) setNotificationsLoading(true);

      try {
        const res = await fetch(
          apiUrl(`/api/clinic/notifications?clinic_id=${clinicId}`),
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));

        if (!cancelled && res.ok) {
          setClinicNotifications(
            Array.isArray(data.notifications) ? data.notifications : []
          );
        }
      } catch {
        if (!cancelled) setClinicNotifications([]);
      } finally {
        if (!cancelled && showLoading) setNotificationsLoading(false);
      }
    };

    void loadClinicNotifications(true);
    const timer = window.setInterval(
      () => void loadClinicNotifications(false),
      30000
    );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    if (searchValue === undefined) setInternalSearch(value);
    onSearchChange?.(value);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchSubmit?.(currentSearch.trim());
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    clearStoredAuth();
    setShowLogoutSuccess(true);

    window.setTimeout(() => {
      navigate("/signin", { replace: true });
    }, 650);
  };

  const markClinicNotificationRead = async (
    notification: ClinicNotification
  ) => {
    const clinicId = getStoredClinicId();

    setClinicNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, unread: false, is_read: 1 }
          : item
      )
    );

    if (!clinicId) return;

    await fetch(apiUrl(`/api/clinic/notifications/${notification.id}/read`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinic_id: clinicId }),
    }).catch(() => {});
  };

  const markAllClinicNotificationsRead = async () => {
    const clinicId = getStoredClinicId();

    setClinicNotifications((current) =>
      current.map((item) => ({ ...item, unread: false, is_read: 1 }))
    );

    if (!clinicId) return;

    await fetch(apiUrl("/api/clinic/notifications/mark-all-read"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinic_id: clinicId }),
    }).catch(() => {});
  };

  return (
    <div className="SidebarClinic">
      {/* SIDEBAR */}
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
              <img src={dashboardIcon} />
              <span>Dashboard</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/clinic/patients">
              <img src={userIcon} />
              <span>Patient</span>
            </Link>
          </div>
          
          <div className="sidebar-item">
            <Link to="/clinic/schedule">
              <img src={calendar1} alt="Schedule" />
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
            <Link to="/clinic/services">
              <img src={serviceIcon} />
              <span>Services</span>
            </Link>
          </div>

          

          {/* LOGOUT SIDEBAR */}
          <div className="sidebar-item logout">
            <button
              className="logout-btn"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <img src={logoutIcon} />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </aside>

      {/* HEADER */}
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
          
          

          <div
            className={`clinic-notification-menu ${
              notificationsOpen ? "open" : ""
            }`}
          >
            <button
              type="button"
              className={`clinic-notification-btn ${
                unreadNotificationCount > 0 ? "has-unread" : ""
              }`}
              aria-label="Clinic notifications"
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setHeaderProfileOpen(false);
              }}
            >
              <Bell size={20} strokeWidth={2.4} />
              {unreadNotificationCount > 0 && (
                <span className="clinic-notification-dot">
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </span>
              )}
            </button>

            <div className="clinic-notification-dropdown">
              <div className="clinic-notification-head">
                <div>
                  <strong>Notifications</strong>
                  <span>
                    {unreadNotificationCount > 0
                      ? `${unreadNotificationCount} unread`
                      : "All caught up"}
                  </span>
                </div>
                {clinicNotifications.length > 0 && (
                  <button
                    type="button"
                    onClick={markAllClinicNotificationsRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="clinic-notification-list">
                {notificationsLoading && (
                  <p className="clinic-notification-empty">
                    Loading notifications...
                  </p>
                )}

                {!notificationsLoading && clinicNotifications.length === 0 && (
                  <p className="clinic-notification-empty">
                    No appointment notifications yet.
                  </p>
                )}

                {!notificationsLoading &&
                  clinicNotifications.slice(0, 6).map((notification) => (
                    <button
                      type="button"
                      key={notification.id}
                      className={`clinic-notification-item ${
                        notification.unread || Number(notification.is_read) === 0
                          ? "unread"
                          : ""
                      }`}
                      onClick={() => markClinicNotificationRead(notification)}
                    >
                      <span className="clinic-notification-icon">
                        <Bell size={15} strokeWidth={2.3} />
                      </span>
                      <span className="clinic-notification-copy">
                        <strong>{notification.title}</strong>
                        <small>{notification.message}</small>
                        <em>
                          {formatClinicNotificationDate(
                            notification.created_at
                          )}
                        </em>
                      </span>
                    </button>
                  ))}
              </div>

              <Link
                to="/clinic/appointments"
                className="clinic-notification-link"
                onClick={() => setNotificationsOpen(false)}
              >
                Open appointments
              </Link>
            </div>
          </div>
          <Link className="nav-link" to="/clinic/dashboard">Home</Link>
<Link className="nav-link" to="/clinic/appointments">Appointments</Link>
          <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
            <button
              className="nav-link profile-btn"
              onClick={() => {
                setHeaderProfileOpen((v) => !v);
                setNotificationsOpen(false);
              }}
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
                onClick={confirmLogout}
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
