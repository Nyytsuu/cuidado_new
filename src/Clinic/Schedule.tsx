import { useMemo, useState } from "react";
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
  id: string;
  date: string; // YYYY-MM-DD
  reason: string;
};

export default function Schedule() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  // ✅ weekly schedule sample
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { day: "Monday", working: true, open: "08:00", close: "17:00" },
    { day: "Tuesday", working: true, open: "08:00", close: "17:00" },
    { day: "Wednesday", working: true, open: "08:00", close: "17:00" },
    { day: "Thursday", working: true, open: "08:00", close: "17:00" },
    { day: "Friday", working: true, open: "08:00", close: "17:00" },
    { day: "Saturday", working: false, open: "08:00", close: "12:00" },
    { day: "Sunday", working: false, open: "08:00", close: "12:00" },
  ]);

  // ✅ blocked dates sample
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([
    { id: "b1", date: "2026-03-05", reason: "Holiday" },
    { id: "b2", date: "2026-03-12", reason: "Clinic Leave" },
  ]);

  const rows = useMemo(() => schedule, [schedule]);

  const toggleWorkingDay = (day: DayKey) => {
    setSchedule((prev) =>
      prev.map((d) => (d.day === day ? { ...d, working: !d.working } : d))
    );
  };

  const changeHours = (day: DayKey, field: "open" | "close", value: string) => {
    setSchedule((prev) =>
      prev.map((d) => (d.day === day ? { ...d, [field]: value } : d))
    );
  };

  const addBlockedDate = () => {
    const date = prompt("Enter date (YYYY-MM-DD):");
    if (!date) return;
    const reason = prompt("Reason (holiday/leave):") || "Blocked";
    setBlockedDates((prev) => [
      ...prev,
      { id: crypto.randomUUID(), date, reason },
    ]);
  };

  const removeBlockedDate = (id: string) => {
    setBlockedDates((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className={`Patient with-sidebar ${isPopupOpen ? "modal-open" : ""}`}>
      <SidebarClinic
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
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

        {/* ✅ SCHEDULE ADMIN CONTENT */}
        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="admin-title">
              <h2>Schedule</h2>
            </div>

            <div className="admin-grid">
              {/* Weekly Schedule Table */}
              <section className="admin-card admin-table-card">
                <div className="users-table">
                  {/* header row */}
                  <div className="users-row users-header schedule-header">
                    <div className="users-cell">Day</div>
                    <div className="users-cell">Working</div>
                    <div className="users-cell">Opening Time</div>
                    <div className="users-cell">Closing Time</div>
                    <div className="users-cell">Actions</div>
                  </div>

                  {/* rows */}
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
                          disabled={!row.working}
                          onChange={(e) => changeHours(row.day, "open", e.target.value)}
                        />
                      </div>

                      <div className="users-cell">
                        <input
                          className="time-input"
                          type="time"
                          value={row.close}
                          disabled={!row.working}
                          onChange={(e) => changeHours(row.day, "close", e.target.value)}
                        />
                      </div>

                      <div className="users-cell">
                        <div className="users-actions">
                          <button
                            type="button"
                            className="pill pill-view"
                            onClick={() => toggleWorkingDay(row.day)}
                          >
                            {row.working ? "Set Closed" : "Set Open"}
                          </button>

                          <button
                            type="button"
                            className="pill pill-resched"
                            onClick={() => alert(`Edit working day: ${row.day}`)}
                          >
                            Edit Day
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Right side options */}
              <aside className="admin-right">
                <div className="admin-card admin-right-card small-card">
                  <h3>Schedule Options</h3>
                  <p>Edit working days and clinic hours.</p>
                </div>

                <div className="admin-card admin-right-card big-card">
                  <h3>Blocked Dates</h3>

                  <button type="button" className="pill pill-danger block-btn" onClick={addBlockedDate}>
                    Block Date (Holiday/Leave)
                  </button>

                  <div className="blocked-list">
                    {blockedDates.map((b) => (
                      <div className="blocked-item" key={b.id}>
                        <div className="blocked-left">
                          <div className="blocked-date">{b.date}</div>
                          <div className="blocked-reason">{b.reason}</div>
                        </div>

                        <button
                          type="button"
                          className="pill pill-view blocked-remove"
                          onClick={() => removeBlockedDate(b.id)}
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