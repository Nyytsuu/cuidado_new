import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  Megaphone,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import UserSidebar from "../Categories/UserSidebar";
import "./Notification.css";
import { notifyNotificationsChanged } from "../useUnreadNotifications";
import { showUnreadPhoneNotifications } from "./phoneNotifications";

type FilterName = "All" | "Unread" | "Appointments" | "System" | "Promotions";

type NotificationItem = {
  id: number;
  icon: string;
  title: string;
  message: string;
  category: string;
  unread: boolean;
  created_at: string;
  appointment_id?: number | null;
};

type RawNotification = {
  id: number;
  icon?: string;
  title: string;
  message: string;
  category: string;
  is_read?: number;
  unread?: boolean;
  created_at?: string;
  appointment_id?: number | null;
};

type NotificationPreferenceKey = "appointments" | "system" | "promotions" | "push";
type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

const API_BASE = "http://localhost:5000";
const FILTERS: FilterName[] = ["All", "Unread", "Appointments", "System", "Promotions"];
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  appointments: true,
  system: true,
  promotions: true,
  push: true,
};
const PREFERENCE_OPTIONS: Array<{
  key: NotificationPreferenceKey;
  label: string;
  description: string;
}> = [
  {
    key: "appointments",
    label: "Appointment updates",
    description: "Booking requests, confirmations, reschedules, cancellations, and reminders.",
  },
  {
    key: "system",
    label: "System and support replies",
    description: "Account notices, support ticket replies, and important platform messages.",
  },
  {
    key: "promotions",
    label: "Health tips and announcements",
    description: "General health articles, care tips, and optional Cuidado announcements.",
  },
  {
    key: "push",
    label: "Phone notifications",
    description: "Allow enabled notifications to appear in the phone notification shade.",
  },
];
const ICONS: Record<string, LucideIcon> = {
  bell: Bell,
  calendar: CalendarDays,
  check: CheckCircle2,
  clock: Clock3,
  info: Info,
  megaphone: Megaphone,
  "x-circle": XCircle,
};

const getStoredUserId = () => {
  const directId = localStorage.getItem("userId");
  if (directId) return directId;

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}") as { id?: number | string };
    return user.id ? String(user.id) : "";
  } catch {
    return "";
  }
};

const getPreferenceStorageKey = (userId: string) =>
  `cuidado-notification-preferences-${userId || "guest"}`;

const readNotificationPreferences = (userId: string): NotificationPreferences => {
  try {
    const stored = localStorage.getItem(getPreferenceStorageKey(userId));
    if (!stored) return DEFAULT_NOTIFICATION_PREFERENCES;
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(JSON.parse(stored) as Partial<NotificationPreferences>),
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
};

const writeNotificationPreferences = (
  userId: string,
  preferences: NotificationPreferences
) => {
  localStorage.setItem(
    getPreferenceStorageKey(userId),
    JSON.stringify(preferences)
  );
};

const toNotification = (item: RawNotification): NotificationItem => ({
  id: item.id,
  icon: item.icon || "bell",
  title: item.title,
  message: item.message,
  category: item.category,
  unread: item.unread ?? Number(item.is_read) === 0,
  created_at: item.created_at || new Date().toISOString(),
  appointment_id: item.appointment_id || null,
});

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hr ago`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} day ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const renderIcon = (icon: string) => {
  const Icon = ICONS[icon] || Bell;
  return <Icon size={24} strokeWidth={2.2} />;
};

const matchesFilter = (item: NotificationItem, name: FilterName) => {
  if (name === "All") return true;
  if (name === "Unread") return item.unread;
  return item.category.toLowerCase() === name.toLowerCase();
};

const isNotificationAllowed = (
  item: NotificationItem,
  preferences: NotificationPreferences
) => {
  const category = item.category.toLowerCase();

  if (category === "appointments") return preferences.appointments;
  if (category === "promotions") return preferences.promotions;
  if (category === "system") return preferences.system;

  return true;
};

export default function Notifications() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<FilterName>("All");
  const [filter, setFilter] = useState<FilterName>("All");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userId = useMemo(() => getStoredUserId(), []);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    readNotificationPreferences(userId)
  );
  const [preferenceStatus, setPreferenceStatus] = useState("");
  const [highlightPreferences, setHighlightPreferences] = useState(false);

  useEffect(() => {
    setPreferences(readNotificationPreferences(userId));
  }, [userId]);

  useEffect(() => {
    const state = location.state as { focusPreferences?: boolean } | null;
    if (!state?.focusPreferences) return;

    setHighlightPreferences(true);
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById("notification-preferences")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const timer = window.setTimeout(() => setHighlightPreferences(false), 1800);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [location.state]);

  useEffect(() => {
    window.history.scrollRestoration = "manual";

    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.querySelector(".notification-page .browse-health-main")?.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
      document.querySelector(".notification-page .notification-list-box")?.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    };

    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    const timer = window.setTimeout(resetScroll, 80);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [location.key, location.pathname]);

  useEffect(() => {
    if (!userId) {
      setError("Please sign in to view notifications.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadNotifications = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${API_BASE}/api/users/${userId}/notifications`, {
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => [])) as RawNotification[] | { message?: string };

        if (!res.ok) {
          throw new Error(!Array.isArray(data) ? data.message : "Failed to load notifications.");
        }

        const parsedNotifications = Array.isArray(data) ? data.map(toNotification) : [];
        setNotifications(parsedNotifications);
        if (preferences.push) {
          void showUnreadPhoneNotifications(
            userId,
            parsedNotifications.filter((item) =>
              isNotificationAllowed(item, preferences)
            )
          );
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load notifications.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadNotifications();

    return () => controller.abort();
  }, [userId, preferences]);

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((item) =>
        isNotificationAllowed(item, preferences)
      ),
    [notifications, preferences]
  );

  const filteredNotifications = useMemo(() => {
    let data = visibleNotifications;

    data = data.filter((item) => matchesFilter(item, activeTab));
    data = data.filter((item) => matchesFilter(item, filter));

    return data;
  }, [activeTab, filter, visibleNotifications]);

  useEffect(() => {
    const resetFeedScroll = () => {
      document.querySelector(".notification-page .notification-list-box")?.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    };

    resetFeedScroll();
    const frame = window.requestAnimationFrame(resetFeedScroll);

    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, filter, filteredNotifications.length]);

  const getCount = (name: FilterName) => {
    return visibleNotifications.filter((item) => matchesFilter(item, name)).length;
  };

  const updateNotificationPreference = (key: NotificationPreferenceKey) => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    writeNotificationPreferences(userId, next);
    setPreferenceStatus("Preferences saved.");
  };

  const resetNotificationPreferences = () => {
    setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
    writeNotificationPreferences(userId, DEFAULT_NOTIFICATION_PREFERENCES);
    setPreferenceStatus("Preferences reset to default.");
  };

  const markNotificationRead = async (notification: NotificationItem) => {
    if (!userId || !notification.unread) return;

    setNotifications((items) =>
      items.map((item) => (item.id === notification.id ? { ...item, unread: false } : item))
    );

    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/notifications/${notification.id}/read`, {
        method: "PATCH",
      });

      if (!res.ok) throw new Error("Failed to mark notification as read.");
      notifyNotificationsChanged();
    } catch {
      setNotifications((items) =>
        items.map((item) => (item.id === notification.id ? { ...item, unread: true } : item))
      );
    }
  };

  const markAllAsRead = async () => {
    if (!userId || getCount("Unread") === 0) return;

    const previous = notifications;
    setNotifications((items) => items.map((item) => ({ ...item, unread: false })));

    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/notifications/mark-all-read`, {
        method: "PATCH",
      });

      if (!res.ok) throw new Error("Failed to mark notifications as read.");
      notifyNotificationsChanged();
    } catch {
      setNotifications(previous);
      setError("Failed to mark notifications as read.");
    }
  };

  return (
    <div className={`notification-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
        searchPlaceholder="Search..."
      />

      <div className="browse-page-content">
        <main className="browse-health-main">
          <section className="notifications-layout">
              <div className="content-box notification-header-box">
                <h1 className="content-title">Notifications</h1>
                <p className="content-subtitle">
                  Stay updated with your latest alerts and important updates.
                </p>

                <div className="tabs-header">
                  <div className="category-tabs">
                    {FILTERS.map((tab) => (
                      <button
                        key={tab}
                        className={`category-tab ${activeTab === tab ? "active" : ""}`}
                        onClick={() => setActiveTab(tab)}
                        type="button"
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <button
                    className="mark-read"
                    type="button"
                    onClick={markAllAsRead}
                    disabled={getCount("Unread") === 0}
                  >
                    Mark all as read
                  </button>
                </div>
              </div>

              <div className="content-box category-section-box notification-list-box">
                {loading && <div className="notification-status">Loading notifications...</div>}

                {!loading && error && <div className="notification-status error">{error}</div>}

                {!loading && !error && filteredNotifications.length === 0 && (
                  <div className="notification-empty">No notifications found.</div>
                )}

                {!loading && !error && filteredNotifications.length > 0 && (
                  <div className="notification-list">
                    {filteredNotifications.map((item) => (
                      <button
                        className={`notification-card ${item.unread ? "unread" : ""}`}
                        key={item.id}
                        onClick={() => markNotificationRead(item)}
                        type="button"
                      >
                        <div className="notification-left">
                          <div className="notification-icon">{renderIcon(item.icon)}</div>

                          <div>
                            <div className="notification-title">{item.title}</div>
                            <div className="notification-message">{item.message}</div>
                          </div>
                        </div>

                        <div className="notification-right">
                          <span>{formatRelativeTime(item.created_at)}</span>
                          {item.unread && <span className="green-dot"></span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            <aside className="health-sidebar-card notification-side-panel">
              <div className="sidebar-box">
                <h3 className="group-title">Notification Filter</h3>

                {FILTERS.map((item) => (
                  <button
                    key={item}
                    className={`notification-filter-item ${filter === item ? "active-filter" : ""}`}
                    onClick={() => setFilter(item)}
                    type="button"
                  >
                    <span className="notification-filter-name">{item}</span>
                    <span className="badge">{getCount(item)}</span>
                  </button>
                ))}
              </div>

              <div
                className={`sidebar-box notification-preferences-box ${
                  highlightPreferences ? "is-highlighted" : ""
                }`}
                id="notification-preferences"
              >
                <h3 className="group-title">Notification Preferences</h3>
                <p className="notification-side-copy">
                  Choose which updates are shown in your notification feed.
                </p>
                <div className="notification-preference-list">
                  {PREFERENCE_OPTIONS.map((item) => (
                    <label className="notification-preference-row" key={item.key}>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={preferences[item.key]}
                        onChange={() => updateNotificationPreference(item.key)}
                      />
                    </label>
                  ))}
                </div>
                <button
                  className="notification-action-btn notification-secondary-btn"
                  type="button"
                  onClick={resetNotificationPreferences}
                >
                  Reset Preferences
                </button>
                {preferenceStatus && (
                  <p className="notification-action-status success" aria-live="polite">
                    {preferenceStatus}
                  </p>
                )}
              </div>

              <div className="sidebar-box">
                <h3 className="group-title">Need Help?</h3>
                <p className="notification-side-copy">
                  If you have any questions about notifications, we're here to help.
                </p>
                <button
                  className="notification-action-btn"
                  type="button"
                  onClick={() => navigate("/help")}
                >
                  Contact Support
                </button>
              </div>

              <div className="sidebar-box promo-box">
                <h3 className="group-title">Never miss an update!</h3>
                <p className="notification-side-copy">
                  Enable push notifications to stay informed in real-time.
                </p>
                <button className="notification-action-btn" type="button">
                  Enable Notifications
                </button>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
