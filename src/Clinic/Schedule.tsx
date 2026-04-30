import { useCallback, useEffect, useMemo, useState } from "react";
import "./Schedule.css";
import SidebarClinic from "./SidebarClinic";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

type DayKey =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

type DaySchedule = {
  day: DayKey;
  working: boolean;
  open: string;
  close: string;
};

type BlockedDate = {
  id: number;
  date: string;
  reason: string;
};

type ScheduleResponse = {
  schedule?: DaySchedule[];
  blockedDates?: BlockedDate[];
  message?: string;
};

const API = "http://localhost:5000/api";

const defaultSchedule: DaySchedule[] = [
  { day: "Monday", working: true, open: "08:00", close: "17:00" },
  { day: "Tuesday", working: true, open: "08:00", close: "17:00" },
  { day: "Wednesday", working: true, open: "08:00", close: "17:00" },
  { day: "Thursday", working: true, open: "08:00", close: "17:00" },
  { day: "Friday", working: true, open: "08:00", close: "17:00" },
  { day: "Saturday", working: false, open: "08:00", close: "12:00" },
  { day: "Sunday", working: false, open: "08:00", close: "12:00" },
];

const getStoredClinicId = () => {
  try {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    if (user?.role === "clinic" && user?.id) {
      return Number(user.id);
    }

    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("userId");

    if (role === "clinic" && userId) {
      return Number(userId);
    }
  } catch {
    return 1;
  }

  return 1;
};

export default function Schedule() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const clinicId = useMemo(() => getStoredClinicId(), []);

  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultSchedule);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [blockedDate, setBlockedDate] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const rows = useMemo(() => schedule, [schedule]);

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API}/clinic/schedule?clinic_id=${clinicId}`);
      const data: ScheduleResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load clinic schedule.");
      }

      setSchedule(Array.isArray(data.schedule) ? data.schedule : defaultSchedule);
      setBlockedDates(Array.isArray(data.blockedDates) ? data.blockedDates : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clinic schedule.");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const toggleWorkingDay = (day: DayKey) => {
    setMessage("");
    setSchedule((prev) =>
      prev.map((item) =>
        item.day === day ? { ...item, working: !item.working } : item
      )
    );
  };

  const changeHours = (day: DayKey, field: "open" | "close", value: string) => {
    setMessage("");
    setSchedule((prev) =>
      prev.map((item) => (item.day === day ? { ...item, [field]: value } : item))
    );
  };

  const saveSchedule = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch(`${API}/clinic/schedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinic_id: clinicId,
          schedule,
        }),
      });

      const data: ScheduleResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save clinic schedule.");
      }

      if (Array.isArray(data.schedule)) {
        setSchedule(data.schedule);
      }

      setMessage(data.message || "Clinic schedule updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save clinic schedule.");
    } finally {
      setSaving(false);
    }
  };

  const addBlockedDate = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!blockedDate) {
        throw new Error("Please choose a date to block.");
      }

      const res = await fetch(`${API}/clinic/schedule/blocked-dates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinic_id: clinicId,
          date: blockedDate,
          reason: blockedReason || "Blocked",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save blocked date.");
      }

      setBlockedDate("");
      setBlockedReason("");
      setMessage(data.message || "Blocked date saved.");
      await loadSchedule();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save blocked date.");
    } finally {
      setSaving(false);
    }
  };

  const removeBlockedDate = async (id: number) => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch(
        `${API}/clinic/schedule/blocked-dates/${id}?clinic_id=${clinicId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to remove blocked date.");
      }

      setBlockedDates((prev) => prev.filter((item) => item.id !== id));
      setMessage(data.message || "Blocked date removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove blocked date.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="Schedule with-sidebar">
      <SidebarClinic
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <main className="preview-canvas">
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
              Schedule
            </a>

            <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
              <button
                type="button"
                className="nav-link profile-btn"
                onClick={() => setHeaderProfileOpen((value) => !value)}
              >
                Profile <span className="caret">v</span>
              </button>

              <div className="profile-dropdown">
                <a href="/clinic/profile">My Profile</a>
                <a href="/clinic/schedule">Schedule</a>
                <a href="/signin">Logout</a>
              </div>
            </div>
          </nav>
        </header>

        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="admin-title">
              <h2>Schedule</h2>
              <p>Clinic #{clinicId}</p>
            </div>

            {loading && <div className="schedule-message">Loading schedule...</div>}
            {error && <div className="schedule-message schedule-error">{error}</div>}
            {message && <div className="schedule-message schedule-success">{message}</div>}

            <div className="admin-grid">
              <section className="admin-card admin-table-card">
                <div className="users-table">
                  <div className="users-row users-header schedule-header">
                    <div className="users-cell">Day</div>
                    <div className="users-cell">Working</div>
                    <div className="users-cell">Opening Time</div>
                    <div className="users-cell">Closing Time</div>
                    <div className="users-cell">Actions</div>
                  </div>

                  {rows.map((row) => (
                    <div className="users-row schedule-row" key={row.day}>
                      <div className="users-cell users-name">{row.day}</div>

                      <div className="users-cell">
                        <span className={`pill ${row.working ? "pill-success" : "pill-gray"}`}>
                          {row.working ? "Open" : "Closed"}
                        </span>
                      </div>

                      <div className="users-cell">
                        <input
                          className="time-input"
                          type="time"
                          value={row.open}
                          disabled={!row.working || loading || saving}
                          onChange={(event) =>
                            changeHours(row.day, "open", event.target.value)
                          }
                        />
                      </div>

                      <div className="users-cell">
                        <input
                          className="time-input"
                          type="time"
                          value={row.close}
                          disabled={!row.working || loading || saving}
                          onChange={(event) =>
                            changeHours(row.day, "close", event.target.value)
                          }
                        />
                      </div>

                      <div className="users-cell">
                        <div className="users-actions">
                          <button
                            type="button"
                            className="pill pill-view"
                            disabled={loading || saving}
                            onClick={() => toggleWorkingDay(row.day)}
                          >
                            {row.working ? "Set Closed" : "Set Open"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="admin-right">
                <div className="admin-card admin-right-card small-card">
                  <h3>Schedule Options</h3>
                  <p>Edit working days and clinic hours.</p>
                  <button
                    type="button"
                    className="pill pill-success block-btn"
                    onClick={saveSchedule}
                    disabled={loading || saving}
                  >
                    {saving ? "Saving..." : "Save Schedule"}
                  </button>
                </div>

                <div className="admin-card admin-right-card big-card">
                  <h3>Blocked Dates</h3>

                  <div className="blocked-form">
                    <input
                      type="date"
                      value={blockedDate}
                      onChange={(event) => setBlockedDate(event.target.value)}
                      disabled={saving}
                    />
                    <input
                      type="text"
                      value={blockedReason}
                      placeholder="Reason"
                      onChange={(event) => setBlockedReason(event.target.value)}
                      disabled={saving}
                    />
                    <button
                      type="button"
                      className="pill pill-danger block-btn"
                      onClick={addBlockedDate}
                      disabled={saving}
                    >
                      Block Date
                    </button>
                  </div>

                  <div className="blocked-list">
                    {blockedDates.length === 0 && (
                      <div className="blocked-empty">No blocked dates.</div>
                    )}

                    {blockedDates.map((item) => (
                      <div className="blocked-item" key={item.id}>
                        <div className="blocked-left">
                          <div className="blocked-date">{item.date}</div>
                          <div className="blocked-reason">{item.reason}</div>
                        </div>

                        <button
                          type="button"
                          className="pill pill-view blocked-remove"
                          disabled={saving}
                          onClick={() => removeBlockedDate(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
