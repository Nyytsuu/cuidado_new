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

type ScheduleResponse = {
  schedule?: DaySchedule[];
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

export default function ClinicScheduleAside({ apiBase, clinicId }: Props) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultSchedule);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleError, setScheduleError] = useState("");


const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  const toggleWorkingDay = (day: DayKey) => {
    setScheduleMessage("");
    setScheduleError("");
    setSchedule((prev) =>
      prev.map((item) =>
        item.day === day ? { ...item, working: !item.working } : item
      )
    );
  };

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

  const saveSchedule = async () => {
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

      setScheduleMessage(data.message || "Clinic schedule updated.");
    } catch (error) {
      setScheduleError(
        error instanceof Error ? error.message : "Failed to save clinic schedule."
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSaveClick = async () => {
  await saveSchedule();
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

{showSuccessModal && (
  <div className="service-modal-overlay">
    <div className="schedule-success-card">
      <div className="schedule-check">✓</div>
      <h3>Saved Successfully</h3>
      <p>Your clinic schedule has been updated.</p>
    </div>
  </div>
)}

{/* SUCCESS MODAL */}
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
