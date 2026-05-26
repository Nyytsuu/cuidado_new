import { useEffect, useMemo, useState } from "react";
import "./ClinicScheduleAside.css";

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

type Props = {
  apiBase: string;
  clinicId: number;
};

const defaultSchedule: DaySchedule[] = [
  { day: "Monday",    working: true,  open: "08:00", close: "17:00" },
  { day: "Tuesday",   working: true,  open: "08:00", close: "17:00" },
  { day: "Wednesday", working: true,  open: "08:00", close: "17:00" },
  { day: "Thursday",  working: true,  open: "08:00", close: "17:00" },
  { day: "Friday",    working: true,  open: "08:00", close: "17:00" },
  { day: "Saturday",  working: false, open: "08:00", close: "12:00" },
  { day: "Sunday",    working: false, open: "08:00", close: "12:00" },
];

const formatScheduleTime = (value: string) => {
  const [hoursRaw, minutes = "00"] = value.split(":");
  const hours = Number(hoursRaw);
  if (Number.isNaN(hours)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${suffix}`;
};

const getCurrentDay = (date: Date = new Date()) =>
  date.toLocaleDateString("en-US", { weekday: "long" }) as DayKey;

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const toDateInputValue = (date: Date = new Date()) => {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day   = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isBlockedDate = (items: BlockedDate[], date: Date) =>
  items.some((item) => item.date === toDateInputValue(date));

const isScheduleOpenNow = (
  item: DaySchedule,
  now: Date,
  blockedDates: BlockedDate[] = []
) => {
  if (isBlockedDate(blockedDates, now)) return false;
  if (!item.working || item.day !== getCurrentDay(now)) return false;
  const openMinutes  = timeToMinutes(item.open);
  const closeMinutes = timeToMinutes(item.close);
  if (openMinutes === null || closeMinutes === null) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
};

export default function ClinicScheduleAside({ apiBase, clinicId }: Props) {
  const [schedule,       setSchedule]       = useState<DaySchedule[]>(defaultSchedule);
  const [blockedDates,   setBlockedDates]   = useState<BlockedDate[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [savingSchedule,  setSavingSchedule]  = useState(false);
  const [,               setScheduleMessage] = useState("");
  const [scheduleError,  setScheduleError]  = useState("");
  const [statusNow,      setStatusNow]      = useState(() => new Date());
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  /* live clock tick */
  useEffect(() => {
    const timer = window.setInterval(() => setStatusNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  /* ── derived state ── */
  const scheduleSummary = useMemo(() => {
    const openDays = schedule.filter((d) => d.working);
    if (openDays.length === 0) return "Clinic is currently closed for all days.";
    const first = openDays[0];
    const sameHours = openDays.every((d) => d.open === first.open && d.close === first.close);
    const dayLabel =
      openDays.length === 7
        ? "Daily"
        : openDays.map((d) => d.day.slice(0, 3)).join(", ");
    if (!sameHours) return `${dayLabel}. Hours vary by day.`;
    return `${dayLabel}, ${formatScheduleTime(first.open)} – ${formatScheduleTime(first.close)}`;
  }, [schedule]);

  const openNow = useMemo(
    () =>
      !isBlockedDate(blockedDates, statusNow) &&
      schedule.some((item) => isScheduleOpenNow(item, statusNow, blockedDates)),
    [blockedDates, schedule, statusNow]
  );

  const blockedToday = useMemo(
    () => isBlockedDate(blockedDates, statusNow),
    [blockedDates, statusNow]
  );

  /* working-day stats */
  const workingCount = useMemo(() => schedule.filter((d) => d.working).length, [schedule]);
  const offCount     = useMemo(() => schedule.filter((d) => !d.working).length, [schedule]);

  /* ── fetch ── */
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoadingSchedule(true);
        setScheduleError("");
        const res  = await fetch(`${apiBase}/clinic/schedule?clinic_id=${clinicId}`);
        const data: ScheduleResponse = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load clinic schedule.");
        setSchedule(Array.isArray(data.schedule) ? data.schedule : defaultSchedule);
        setBlockedDates(Array.isArray(data.blockedDates) ? data.blockedDates : []);
      } catch (error) {
        setScheduleError(error instanceof Error ? error.message : "Failed to load clinic schedule.");
      } finally {
        setLoadingSchedule(false);
      }
    };
    fetchSchedule();
  }, [apiBase, clinicId]);

  /* ── handlers ── */
  const changeScheduleTime = (day: DayKey, field: "open" | "close", value: string) => {
    setScheduleMessage("");
    setScheduleError("");
    setSchedule((prev) => prev.map((item) => (item.day === day ? { ...item, [field]: value } : item)));
  };

  const saveSchedule = async (nextSchedule: DaySchedule[] = schedule) => {
    try {
      setSavingSchedule(true);
      setScheduleMessage("");
      setScheduleError("");
      const res  = await fetch(`${apiBase}/clinic/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: clinicId, schedule: nextSchedule }),
      });
      const data: ScheduleResponse = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save clinic schedule.");
      if (Array.isArray(data.schedule)) setSchedule(data.schedule);
      setScheduleMessage(data.message || "Clinic schedule updated.");
      return true;
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : "Failed to save clinic schedule.");
      return false;
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleWorkingDay = (day: DayKey) => {
    setScheduleMessage("");
    setScheduleError("");
    const nextSchedule = schedule.map((item) =>
      item.day === day ? { ...item, working: !item.working } : item
    );
    setSchedule(nextSchedule);
    void saveSchedule(nextSchedule);
  };

  const handleSaveClick = async () => {
    const saved = await saveSchedule();
    if (!saved) return;
    setShowSuccessModal(true);
    setTimeout(() => setShowSuccessModal(false), 2000);
  };

  /* ── render ── */
  return (
    <aside className="admin-right clinic-schedule-aside">

      {/* ── Schedule Summary Card ── */}
      <div className="admin-card admin-right-card small-card">
        <div className="sch-card-header">
          <h3>Schedule</h3>
          {!loadingSchedule && (
            <span className={`clinic-current-status ${openNow ? "open" : "closed"}`}>
              {blockedToday ? "Blocked Today" : openNow ? "Open Now" : "Closed"}
            </span>
          )}
        </div>

        {loadingSchedule ? (
          <p className="sch-loading">Loading schedule…</p>
        ) : (
          <>
            {/* Today row */}
            <div className="sch-today-row">
              <div className="sch-today-label">
                <span className={`sch-today-dot ${openNow ? "open" : "closed"}`} />
                Today · {getCurrentDay(statusNow)}
              </div>
              {(() => {
                const todayRow = schedule.find((d) => d.day === getCurrentDay(statusNow));
                if (blockedToday)       return <span className="sch-today-hours sch-hours-blocked">Blocked</span>;
                if (!todayRow?.working) return <span className="sch-today-hours sch-hours-off">Day Off</span>;
                return (
                  <span className="sch-today-hours">
                    {formatScheduleTime(todayRow.open)} – {formatScheduleTime(todayRow.close)}
                  </span>
                );
              })()}
            </div>

            {/* Week overview dots */}
            <div className="sch-week-grid">
              {schedule.map((day) => {
                const isToday = day.day === getCurrentDay(statusNow);
                return (
                  <div
                    key={day.day}
                    className={["sch-week-dot", day.working ? "active" : "off", isToday ? "today" : ""].filter(Boolean).join(" ")}
                    title={`${day.day}: ${day.working ? `${formatScheduleTime(day.open)} – ${formatScheduleTime(day.close)}` : "Day Off"}`}
                  >
                    {day.day.slice(0, 1)}
                  </div>
                );
              })}
            </div>

            {/* Stats row */}
            <div className="sch-stats-row">
              <div className="sch-stat-pill working">
                <span>{workingCount}</span> Working
              </div>
              <div className="sch-stat-pill off">
                <span>{offCount}</span> Day Off
              </div>
            </div>

            {/* Summary text */}
            <p className="sch-summary-line">{scheduleSummary}</p>
          </>
        )}

        {scheduleError && (
          <div className="clinic-schedule-message schedule-error">{scheduleError}</div>
        )}
      </div>

      {/* ── Schedule Options Card ── */}
      <div className="admin-card admin-right-card big-card">
        <h3>Schedule Options</h3>

        <div className="clinic-schedule-editor">
          {schedule.map((row) => (
            <div
              key={row.day}
              className={`clinic-schedule-row${!row.working ? " sch-row-off" : ""}`}
            >
              {/* Toggle switch */}
              <label
                className="sch-toggle-switch"
                title={row.working ? "Mark as day off" : "Mark as working day"}
              >
                <input
                  type="checkbox"
                  checked={row.working}
                  disabled={loadingSchedule || savingSchedule}
                  onChange={() => toggleWorkingDay(row.day)}
                />
                <span className="sch-toggle-track">
                  <span className="sch-toggle-thumb" />
                </span>
              </label>

              {/* Day name */}
              <span className={`sch-day-name${row.working ? " active" : " dimmed"}`}>
                {row.day.slice(0, 3)}
              </span>

              {/* Time inputs or day-off tag */}
              {row.working ? (
                <div className="sch-times">
                  <input
                    type="time"
                    value={row.open}
                    disabled={loadingSchedule || savingSchedule}
                    onChange={(e) => changeScheduleTime(row.day, "open", e.target.value)}
                  />
                  <span className="sch-time-sep">–</span>
                  <input
                    type="time"
                    value={row.close}
                    disabled={loadingSchedule || savingSchedule}
                    onChange={(e) => changeScheduleTime(row.day, "close", e.target.value)}
                  />
                </div>
              ) : (
                <span className="sch-day-off-tag">Day Off</span>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="pill pill-save-schedule"
          onClick={handleSaveClick}
          disabled={loadingSchedule || savingSchedule}
        >
          {savingSchedule ? "Saving…" : "Save Schedule"}
        </button>
      </div>

      {showSuccessModal && (
        <div className="service-modal-overlay">
          <div className="schedule-success-card">
            <div className="schedule-check">✓</div>
            <h3>Saved Successfully</h3>
            <p>Your clinic schedule has been updated.</p>
          </div>
        </div>
      )}
    </aside>
  );
}
