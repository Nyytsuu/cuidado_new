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
  { day: "Monday", working: true, open: "08:00", close: "17:00" },
  { day: "Tuesday", working: true, open: "08:00", close: "17:00" },
  { day: "Wednesday", working: true, open: "08:00", close: "17:00" },
  { day: "Thursday", working: true, open: "08:00", close: "17:00" },
  { day: "Friday", working: true, open: "08:00", close: "17:00" },
  { day: "Saturday", working: false, open: "08:00", close: "12:00" },
  { day: "Sunday", working: false, open: "08:00", close: "12:00" },
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

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const toDateInputValue = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

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

  const openMinutes = timeToMinutes(item.open);
  const closeMinutes = timeToMinutes(item.close);

  if (openMinutes === null || closeMinutes === null) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
};

export default function ClinicScheduleAside({ apiBase, clinicId }: Props) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultSchedule);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [, setScheduleMessage] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [statusNow, setStatusNow] = useState(() => new Date());


const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusNow(new Date());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const scheduleSummary = useMemo(() => {
    const openDays = schedule.filter((day) => day.working);

    if (openDays.length === 0) return "Clinic is currently closed for all days.";

    const first = openDays[0];
    const sameHours = openDays.every(
      (day) => day.open === first.open && day.close === first.close
    );

    const dayLabel =
      openDays.length === 7
        ? "Daily"
        : openDays.map((day) => day.day.slice(0, 3)).join(", ");

    if (!sameHours) return `${dayLabel}. Hours vary by day.`;

    return `${dayLabel}, ${formatScheduleTime(first.open)} - ${formatScheduleTime(
      first.close
    )}`;
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

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoadingSchedule(true);
        setScheduleError("");

        const res = await fetch(`${apiBase}/clinic/schedule?clinic_id=${clinicId}`);
        const data: ScheduleResponse = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load clinic schedule.");
        }

        setSchedule(Array.isArray(data.schedule) ? data.schedule : defaultSchedule);
        setBlockedDates(Array.isArray(data.blockedDates) ? data.blockedDates : []);
      } catch (error) {
        setScheduleError(
          error instanceof Error ? error.message : "Failed to load clinic schedule."
        );
      } finally {
        setLoadingSchedule(false);
      }
    };

    fetchSchedule();
  }, [apiBase, clinicId]);

  const changeScheduleTime = (
    day: DayKey,
    field: "open" | "close",
    value: string
  ) => {
    setScheduleMessage("");
    setScheduleError("");
    setSchedule((prev) =>
      prev.map((item) => (item.day === day ? { ...item, [field]: value } : item))
    );
  };

  const saveSchedule = async (nextSchedule: DaySchedule[] = schedule) => {
    try {
      setSavingSchedule(true);
      setScheduleMessage("");
      setScheduleError("");

      const res = await fetch(`${apiBase}/clinic/schedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinic_id: clinicId,
          schedule: nextSchedule,
        }),
      });

      const data: ScheduleResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save clinic schedule.");
      }

      if (Array.isArray(data.schedule)) {
        setSchedule(data.schedule);
      }

      setScheduleMessage(data.message || "Clinic schedule updated.");
      return true;
    } catch (error) {
      setScheduleError(
        error instanceof Error ? error.message : "Failed to save clinic schedule."
      );
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

  setTimeout(() => {
    setShowSuccessModal(false);
  }, 2000);
};

  return (
    <aside className="admin-right clinic-schedule-aside">
      <div className="admin-card admin-right-card small-card">
        <h3>Schedule</h3>
        {loadingSchedule ? <p>Loading clinic schedule...</p> : <p>{scheduleSummary}</p>}
        {!loadingSchedule && (
          <div className={`clinic-current-status ${openNow ? "open" : "closed"}`}>
            {blockedToday
              ? "Blocked Today"
              : openNow
                ? "Currently Open"
                : "Currently Closed"}
          </div>
        )}
        {scheduleError && (
          <div className="clinic-schedule-message schedule-error">{scheduleError}</div>
        )}
      </div>

      <div className="admin-card admin-right-card big-card">
        <h3>Schedule Option:</h3>

        <div className="clinic-schedule-editor">
          {schedule.map((row) => (
            <div className="clinic-schedule-row" key={row.day}>
              <label className="clinic-schedule-toggle">
                <input
                  type="checkbox"
                  checked={row.working}
                  disabled={loadingSchedule || savingSchedule}
                  onChange={() => toggleWorkingDay(row.day)}
                />
                <span>{row.day.slice(0, 3)}</span>
              </label>

              <input
                type="time"
                value={row.open}
                disabled={!row.working || loadingSchedule || savingSchedule}
                onChange={(event) =>
                  changeScheduleTime(row.day, "open", event.target.value)
                }
              />

              <input
                type="time"
                value={row.close}
                disabled={!row.working || loadingSchedule || savingSchedule}
                onChange={(event) =>
                  changeScheduleTime(row.day, "close", event.target.value)
                }
              />
            </div>
          ))}
        </div>

        

        <button
          type="button"
          className="pill pill-save-schedule"
          onClick={handleSaveClick}
          disabled={loadingSchedule || savingSchedule}
        >
          {savingSchedule ? "Saving..." : "Save Schedule"}
        </button>
      </div>

{showSuccessModal && schedule.length < 0 && (
  <div className="service-modal-overlay">
    <div className="schedule-success-card">
      <div className="schedule-check">✓</div>
      <h3>Saved Successfully</h3>
      <p>Your clinic schedule has been updated.</p>
    </div>
  </div>
)}

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
