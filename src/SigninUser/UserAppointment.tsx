

import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import "./UserAppointment.css";
import UserSidebar from "../Categories/UserSidebar";
import {
  Filter,
  Plus,
  CalendarDays,
  MapPin,
  Video,
  Lightbulb,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Star,
  Stethoscope,
  UserRound,
  AlertTriangle,
} from "lucide-react";
import { apiUrl } from "../sharedBackendFetch";

type AppointmentService = {
  appointment_id?: number;
  service_id: number;
  service_name_snapshot: string;
  price_snapshot: number | string;
  duration_minutes_snapshot: number;
  description?: string;
};

type Appointment = {
  id: number;
  user_id: number;
  clinic_id: number;
  start_at: string;
  end_at: string;
  purpose?: string;
  symptoms?: string;
  patient_note?: string;
  clinic_note?: string;
  status:
    | "pending"
    | "confirmed"
    | "reschedule_requested"
    | "cancelled"
    | "completed"
    | "no_show";
  proposed_start_at?: string | null;
  proposed_end_at?: string | null;
  reschedule_reason?: string | null;
  reschedule_requested_by?: string | null;
  reschedule_requested_at?: string | null;
  proposed_services_json?: string | null;
  proposed_purpose?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: "patient" | "clinic" | "admin" | null;
  cancel_reason?: string | null;
  completed_at?: string | null;
  patient_name_snapshot?: string;
  patient_phone_snapshot?: string;
  clinic_name_snapshot?: string;
  created_at?: string;
  updated_at?: string;
  clinic_name?: string;
  specialization?: string;
  address?: string;
  opening_time?: string;
  closing_time?: string;
  services?: AppointmentService[];
  feedback_id?: number | null;
  clinic_feedback_rating?: number | string | null;
  clinic_feedback_text?: string | null;
  clinic_feedback_updated_at?: string | null;
};

type Clinic = {
  id: number;
  clinic_name: string;
  address?: string;
  specialization?: string;
  status?: string | null;
  account_status?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  operating_days?: string | null;
  is_open_now?: number | boolean | string | null;
  is_blocked_today?: number | boolean | string | null;
  today_opening_time?: string | null;
  today_closing_time?: string | null;
  weekly_schedule?: WeeklyScheduleDay[];
  blocked_dates?: BlockedDate[];
  average_rating?: number | string | null;
  rating?: number | string | null;
  rating_count?: number | string | null;
  review_count?: number | string | null;
};

type WeeklyScheduleDay = {
  clinic_id?: number;
  day_of_week: string;
  is_working: number | boolean | string;
  opening_time: string | null;
  closing_time: string | null;
};

type BlockedDate = {
  id?: number;
  clinic_id?: number;
  date?: string | null;
  blocked_date?: string | null;
  reason?: string | null;
};

type ClinicService = {
  id: number;
  clinic_id: number;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  is_active: number;
};

type BookingModalProps = {
  open: boolean;
  onClose: () => void;
  onBooked: () => void;
  userId: number;
};

type UserAppointmentsContentProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
};

type ApiErrorResponse = {
  message?: string;
  error_detail?: string;
};

function parseDateTime(
  value: string | number | Date | null | undefined
): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const dateTimeMatch = value
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);

    if (dateTimeMatch) {
      const [, year, month, day, hours = "00", minutes = "00", seconds = "00"] =
        dateTimeMatch;
      const parsedLocal = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds)
      );

      return Number.isNaN(parsedLocal.getTime()) ? null : parsedLocal;
    }
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(
  dateString: string | number | Date | null | undefined
): string {
  const date = parseDateTime(dateString);
  if (!date) return "--:--";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(
  dateString: string | number | Date | null | undefined
): string {
  const date = parseDateTime(dateString);
  if (!date) return "No date";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDay(
  dateString: string | number | Date | null | undefined
): string {
  const date = parseDateTime(dateString);
  if (!date) return "";

  return date.toLocaleDateString([], {
    weekday: "long",
  });
}

function formatStatus(status: Appointment["status"] | string | undefined): string {
  if (status === "reschedule_requested") return "Reschedule Requested";
  if (!status) return "Unknown";
  return status.replace(/_/g, " ");
}

function getTimelineStartAt(appointment: Appointment): string {
  return appointment.status === "reschedule_requested" &&
    appointment.proposed_start_at
    ? appointment.proposed_start_at
    : appointment.start_at;
}

function getAppointmentDate(appointment: Appointment): Date | null {
  return parseDateTime(getTimelineStartAt(appointment)) || parseDateTime(appointment.start_at);
}

function isActiveAppointment(appointment: Appointment): boolean {
  return ["pending", "confirmed", "reschedule_requested"].includes(
    appointment.status
  );
}

function isPatientServiceChangeRequest(appointment: Appointment): boolean {
  return (
    appointment.status === "reschedule_requested" &&
    appointment.reschedule_requested_by === "patient"
  );
}

function toMySqlDateTime(date: string, time: string): string {
  return `${date} ${time}:00`;
}

function toDateInputValue(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeInputValue(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isPastAppointmentTime(date: string, time: string): boolean {
  const selected = parseDateTime(`${date} ${time}:00`);
  return !selected || selected.getTime() <= Date.now();
}

function getMinimumTimeForDate(date: string): string | undefined {
  return date === toDateInputValue() ? toTimeInputValue() : undefined;
}

function normalizePhilippineMobileInput(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits === "0" || digits === "6" || digits === "63") {
    return digits;
  }

  if (digits.startsWith("09")) {
    return digits.slice(0, 11);
  }

  if (digits.startsWith("639")) {
    return `0${digits.slice(2, 12)}`;
  }

  if (digits.startsWith("9")) {
    return `09${digits.slice(1, 10)}`;
  }

  if (digits.startsWith("0")) {
    return "0";
  }

  if (digits.startsWith("6")) {
    return "6";
  }

  return "";
}

function toPhilippineLocalMobileNumber(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("639")) {
    return `0${digits.slice(2, 12)}`;
  }

  return digits.slice(0, 11);
}

function isValidPhilippineMobileNumber(value: string): boolean {
  return /^09\d{9}$/.test(toPhilippineLocalMobileNumber(value));
}

function addMinutes(date: string, time: string, minutes: number): string {
  const base = new Date(`${date}T${time}:00`);
  base.setMinutes(base.getMinutes() + minutes);
  const yyyy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  const hh = String(base.getHours()).padStart(2, "0");
  const min = String(base.getMinutes()).padStart(2, "0");
  const ss = String(base.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function formatServicePrice(value: string | number | null | undefined): string {
  const amount = Number(value || 0);
  return amount > 0 ? `PHP ${amount.toFixed(2)}` : "No listed fee";
}

function formatServiceDuration(value: string | number | null | undefined): string {
  const minutes = Number(value || 0);
  return minutes > 0 ? `${minutes} min` : "Duration varies";
}

function getServiceDurationMinutes(
  value: string | number | null | undefined
): number {
  const minutes = Number(value || 0);
  return minutes > 0 ? minutes : 30;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function normalizeClockTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = String(value).match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : null;
}

function normalizeDayToken(value: string): string {
  return value.trim().toLowerCase().replace(/\./g, "");
}

function getDayName(date: Date, format: "long" | "short"): string {
  return date.toLocaleDateString("en-US", { weekday: format }).toLowerCase();
}

function isEnabledFlag(value: number | boolean | string | null | undefined): boolean {
  return value === true || Number(value) === 1 || String(value).toLowerCase() === "true";
}

function findScheduleForDate(
  clinic: Clinic,
  date: Date
): WeeklyScheduleDay | undefined {
  const targetDay = getDayName(date, "long");
  return clinic.weekly_schedule?.find(
    (item) => item.day_of_week.toLowerCase() === targetDay
  );
}

function isOperatingFromSummary(clinic: Clinic, date: Date): boolean {
  const today = getDayName(date, "short");
  const daysRaw = (clinic.operating_days || "").toLowerCase();

  if (!daysRaw) return true;
  if (daysRaw.includes("daily") || daysRaw.includes("everyday")) return true;
  if (daysRaw.includes("mon-fri")) {
    return ["mon", "tue", "wed", "thu", "fri"].includes(today);
  }
  if (daysRaw.includes("mon-sat")) {
    return ["mon", "tue", "wed", "thu", "fri", "sat"].includes(today);
  }

  const parts = daysRaw.split(/[,/|]+/).map(normalizeDayToken).filter(Boolean);
  return parts.some((day) => today.startsWith(day.slice(0, 3)));
}

function getClosureMessageForDate(clinic: Clinic, date: Date): string | null {
  const dateValue = toDateInputValue(date);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

  if (
    (dateValue === toDateInputValue() && isEnabledFlag(clinic.is_blocked_today)) ||
    clinic.blocked_dates?.some(
      (blockedDate) => (blockedDate.date || blockedDate.blocked_date) === dateValue
    )
  ) {
    return "Clinic is unavailable on the selected date.";
  }

  const schedule = findScheduleForDate(clinic, date);
  if (schedule) {
    return isEnabledFlag(schedule.is_working) ? null : `Clinic is closed on ${dayName}.`;
  }

  return isOperatingFromSummary(clinic, date) ? null : `Clinic is closed on ${dayName}.`;
}

function getScheduleHoursForDate(
  clinic: Clinic,
  date: Date
): { openTime: string | null | undefined; closeTime: string | null | undefined } {
  const schedule = findScheduleForDate(clinic, date);
  const isToday = toDateInputValue(date) === toDateInputValue();

  return {
    openTime:
      schedule?.opening_time ||
      (isToday ? clinic.today_opening_time : null) ||
      clinic.opening_time,
    closeTime:
      schedule?.closing_time ||
      (isToday ? clinic.today_closing_time : null) ||
      clinic.closing_time,
  };
}

function getAppointmentScheduleMessage(
  clinic: Clinic,
  dateValue: string,
  timeValue: string,
  durationMinutes = 30
): string | null {
  const date = parseDateTime(`${dateValue} 00:00:00`);
  if (!date) return "Please select a valid appointment date.";

  const closureMessage = getClosureMessageForDate(clinic, date);
  if (closureMessage) return closureMessage;

  const { openTime, closeTime } = getScheduleHoursForDate(clinic, date);
  const open = normalizeClockTime(openTime);
  const close = normalizeClockTime(closeTime);
  const selected = normalizeClockTime(timeValue);

  if (!open || !close || !selected) {
    return "Clinic hours are not available for the selected date.";
  }

  const endAt = addMinutes(dateValue, timeValue, durationMinutes);

  if (!isWithinClinicHours(selected, endAt, open, close)) {
    return `Please choose a time between ${open} and ${close}.`;
  }

  return null;
}

function getClinicBookingDisabledReason(clinic: Clinic | null | undefined): string {
  if (!clinic) return "";

  const status = String(clinic.status || "approved").toLowerCase();
  const accountStatus = String(clinic.account_status || "active").toLowerCase();

  if (status !== "approved" || accountStatus !== "active") {
    return "This clinic is not available for booking.";
  }

  if (
    clinic.is_open_now !== undefined &&
    clinic.is_open_now !== null &&
    !isEnabledFlag(clinic.is_open_now)
  ) {
    return `${clinic.clinic_name} is currently closed. Please choose an open clinic.`;
  }

  if (isEnabledFlag(clinic.is_blocked_today)) {
    return `${clinic.clinic_name} is unavailable today.`;
  }

  return "";
}

function getClinicRatingSummary(clinic: Clinic): {
  score: number | null;
  countLabel: string;
} {
  const score = Number(clinic.average_rating ?? clinic.rating);
  const count = Number(clinic.rating_count ?? clinic.review_count);

  return {
    score: Number.isFinite(score) && score > 0 ? Math.min(5, Math.max(0, score)) : null,
    countLabel:
      Number.isFinite(count) && count > 0
        ? `${count} ${count === 1 ? "rating" : "ratings"}`
        : "No ratings yet",
  };
}

function isWithinClinicHours(
  startTime: string,
  endDateTime: string,
  openingTime?: string,
  closingTime?: string
): boolean {
  const open = normalizeClockTime(openingTime);
  const close = normalizeClockTime(closingTime);

  if (!open || !close) return true;

  const end = parseDateTime(endDateTime);
  if (!end) return false;

  const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(
    end.getMinutes()
  ).padStart(2, "0")}`;

  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  const openMinutes = toMinutes(open);
  const closeMinutes = toMinutes(close);

  return startMinutes >= openMinutes && endMinutes <= closeMinutes;
}

function getMonthMatrix(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { date: Date; currentMonth: boolean }[] = [];

  for (let i = startDay - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      currentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: new Date(year, month, d),
      currentMonth: true,
    });
  }

  while (cells.length < 42) {
    const nextDay = cells.length - (startDay + daysInMonth) + 1;
    cells.push({
      date: new Date(year, month + 1, nextDay),
      currentMonth: false,
    });
  }

  return cells;
}

function sameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function AppointmentViewModal({
  appointment,
  onClose,
  onReschedule,
  onCancel,
  onServiceChange,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onReschedule: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onServiceChange: (appointment: Appointment) => void;
}) {
  if (!appointment) return null;

  const canReschedule =
    appointment.status === "pending" || appointment.status === "confirmed";
  const canChangeServices =
    appointment.status === "pending" || appointment.status === "confirmed";
  const canCancel = ["pending", "confirmed", "reschedule_requested"].includes(
    appointment.status
  );
  const patientServiceChange = isPatientServiceChangeRequest(appointment);
  const displayStart = getTimelineStartAt(appointment);

  return (
    <div
      className="appt-view-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-view-title"
    >
      <div className="appt-view-modal" onClick={(event) => event.stopPropagation()}>
        <div className="appt-view-header">
          <div className="appt-view-header-info">
            <p className="appt-view-eyebrow">Appointment Details</p>
            <h2 id="appointment-view-title">
              {appointment.clinic_name_snapshot || appointment.clinic_name || "Clinic"}
            </h2>
            <span className={`appt-view-status-pill ${appointment.status}`}>
              {formatStatus(appointment.status)}
            </span>
          </div>

          <button
            type="button"
            className="appt-view-close"
            onClick={onClose}
            aria-label="Close appointment details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="appt-view-body">
          <section className="appt-view-section">
            <div className="appt-view-row">
              <CalendarDays size={16} className="appt-view-icon" />
              <span>
                <strong>{formatDate(displayStart)}</strong>
                <span className="appt-view-muted"> • {formatDay(displayStart)}</span>
              </span>
            </div>
            <div className="appt-view-row">
              <Stethoscope size={16} className="appt-view-icon" />
              <span>
                {formatTime(displayStart)}
                {appointment.end_at && (
                  <span className="appt-view-muted">
                    {" "}
                    - {formatTime(appointment.end_at)}
                  </span>
                )}
              </span>
            </div>
          </section>

          {(appointment.patient_name_snapshot || appointment.patient_phone_snapshot) && (
            <>
              <div className="appt-view-divider" />
              <section className="appt-view-section">
                <p className="appt-view-section-label">Patient</p>
                {appointment.patient_name_snapshot && (
                  <div className="appt-view-row">
                    <UserRound size={16} className="appt-view-icon" />
                    <span>{appointment.patient_name_snapshot}</span>
                  </div>
                )}
                {appointment.patient_phone_snapshot && (
                  <div className="appt-view-row">
                    <span className="appt-view-icon-placeholder" />
                    <span className="appt-view-muted">
                      {appointment.patient_phone_snapshot}
                    </span>
                  </div>
                )}
              </section>
            </>
          )}

          {(appointment.specialization ||
            (Array.isArray(appointment.services) && appointment.services.length > 0)) && (
            <>
              <div className="appt-view-divider" />
              <section className="appt-view-section">
                <p className="appt-view-section-label">Service</p>
                {appointment.specialization && (
                  <div className="appt-view-row">
                    <Stethoscope size={16} className="appt-view-icon" />
                    <span>{appointment.specialization}</span>
                  </div>
                )}
                {Array.isArray(appointment.services) &&
                  appointment.services.map((service) => (
                    <div className="appt-view-row" key={service.service_id}>
                      <span className="appt-view-icon-placeholder" />
                      <div className="appt-view-service-row">
                        <span>{service.service_name_snapshot}</span>
                        <span className="appt-view-service-price">
                          PHP {Number(service.price_snapshot).toFixed(2)} •{" "}
                          {service.duration_minutes_snapshot} min
                        </span>
                      </div>
                    </div>
                  ))}
              </section>
            </>
          )}

          {appointment.address && (
            <>
              <div className="appt-view-divider" />
              <section className="appt-view-section">
                <div className="appt-view-row">
                  <MapPin size={16} className="appt-view-icon" />
                  <span>{appointment.address}</span>
                </div>
              </section>
            </>
          )}

          {(appointment.purpose ||
            appointment.symptoms ||
            appointment.patient_note ||
            appointment.clinic_note) && (
            <>
              <div className="appt-view-divider" />
              <section className="appt-view-section">
                {appointment.purpose && (
                  <div className="appt-view-note-row">
                    <p className="appt-view-section-label">Purpose</p>
                    <p>{appointment.purpose}</p>
                  </div>
                )}
                {appointment.symptoms && (
                  <div className="appt-view-note-row">
                    <p className="appt-view-section-label">Symptoms</p>
                    <p>{appointment.symptoms}</p>
                  </div>
                )}
                {appointment.patient_note && (
                  <div className="appt-view-note-row">
                    <p className="appt-view-section-label">Patient Note</p>
                    <p>{appointment.patient_note}</p>
                  </div>
                )}
                {appointment.clinic_note && (
                  <div className="appt-view-note-row">
                    <p className="appt-view-section-label">Clinic Note</p>
                    <p>{appointment.clinic_note}</p>
                  </div>
                )}
              </section>
            </>
          )}

          {appointment.status === "reschedule_requested" &&
            (appointment.proposed_start_at || patientServiceChange) && (
              <>
                <div className="appt-view-divider" />
                <section className="appt-view-section appt-view-section--warning">
                  <p className="appt-view-section-label">
                    {patientServiceChange
                      ? "Service change pending clinic approval"
                      : "Clinic proposed a new schedule"}
                  </p>
                  {patientServiceChange ? (
                    <div className="appt-view-note-row">
                      <p>{appointment.proposed_purpose || appointment.reschedule_reason}</p>
                    </div>
                  ) : (
                    <div className="appt-view-row">
                      <CalendarDays size={16} className="appt-view-icon" />
                      <span>
                        {formatDate(appointment.proposed_start_at)} at{" "}
                        {formatTime(appointment.proposed_start_at)}
                      </span>
                    </div>
                  )}
                  {appointment.reschedule_reason && (
                    <p className="appt-view-muted">{appointment.reschedule_reason}</p>
                  )}
                </section>
              </>
            )}

          {appointment.status === "cancelled" &&
            (appointment.cancel_reason || appointment.cancelled_at) && (
              <>
                <div className="appt-view-divider" />
                <section className="appt-view-section appt-view-section--cancelled">
                  {appointment.cancel_reason && (
                    <div className="appt-view-note-row">
                      <p className="appt-view-section-label">Cancel Reason</p>
                      <p>{appointment.cancel_reason}</p>
                    </div>
                  )}
                  {appointment.cancelled_at && (
                    <p className="appt-view-muted">
                      Cancelled on {formatDate(appointment.cancelled_at)}
                    </p>
                  )}
                </section>
              </>
            )}
        </div>

        {(canReschedule || canChangeServices || canCancel) && (
          <div className="appt-view-actions">
            {canChangeServices && (
              <button
                type="button"
                className="appt-view-action-btn"
                onClick={() => {
                  onClose();
                  onServiceChange(appointment);
                }}
              >
                {appointment.status === "confirmed"
                  ? "Request Service Change"
                  : "Edit Services"}
              </button>
            )}
            {canReschedule && (
              <button
                type="button"
                className="appt-view-action-btn"
                onClick={() => {
                  onClose();
                  onReschedule(appointment);
                }}
              >
                Reschedule
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                className="appt-view-action-btn danger"
                onClick={() => {
                  onClose();
                  onCancel(appointment);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingModal({
  open,
  onClose,
  onBooked,
  userId,
}: BookingModalProps) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [services, setServices] = useState<ClinicService[]>([]);

  const [clinicId, setClinicId] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [appointmentDate, setAppointmentDate] = useState<string>("");
  const [appointmentTime, setAppointmentTime] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");
  const [symptoms, setSymptoms] = useState<string>("");
  const [patientNote, setPatientNote] = useState<string>("");

  const [bookingForSelf, setBookingForSelf] = useState<boolean>(true);
  const [guestName, setGuestName] = useState<string>("");
  const [guestPhone, setGuestPhone] = useState<string>("");

  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const accountName: string = currentUser?.full_name || currentUser?.name || "";
  const accountPhone: string = currentUser?.phone || "";

  const [loadingClinics, setLoadingClinics] = useState<boolean>(false);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [errorModalMessage, setErrorModalMessage] = useState<string>("");

  const showBookingError = (message: string) => {
    setError(message);
    setErrorModalMessage(message);
  };

  useEffect(() => {
    if (!open) return;

    const loadClinics = async () => {
      try {
        setLoadingClinics(true);
        setError("");

        const res = await fetch(apiUrl("/api/clinics"));
        if (!res.ok) throw new Error("Failed to load clinics");

        const data: Clinic[] = await res.json();
        setClinics(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        showBookingError("Failed to load clinics.");
      } finally {
        setLoadingClinics(false);
      }
    };

    loadClinics();
  }, [open]);

  useEffect(() => {
    if (!open || !clinicId) {
      setServices([]);
      setServiceId("");
      return;
    }

    const loadServices = async () => {
      try {
        setLoadingServices(true);
        setError("");

        const res = await fetch(
          apiUrl(`/api/clinic/services?clinic_id=${clinicId}`)
        );
        if (!res.ok) throw new Error("Failed to load services");

        const data: ClinicService[] = await res.json();
        setServices(
          Array.isArray(data) ? data.filter((s) => s.is_active === 1) : []
        );
      } catch (err) {
        console.error(err);
        showBookingError("Failed to load clinic services.");
      } finally {
        setLoadingServices(false);
      }
    };

    loadServices();
  }, [open, clinicId]);

  const selectedClinic = useMemo(
    () => clinics.find((c) => c.id === Number(clinicId)) || null,
    [clinics, clinicId]
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === Number(serviceId)) || null,
    [services, serviceId]
  );
  const selectedClinicDisabledReason = selectedClinic
    ? getClinicBookingDisabledReason(selectedClinic)
    : "";
  const selectedClinicRating = selectedClinic
    ? getClinicRatingSummary(selectedClinic)
    : null;
  const selectedScheduleMessage =
    selectedClinic && appointmentDate && appointmentTime
      ? isPastAppointmentTime(appointmentDate, appointmentTime)
        ? "Please choose a future date and time."
        : getAppointmentScheduleMessage(
            selectedClinic,
            appointmentDate,
            appointmentTime,
            Number(selectedService?.duration_minutes || 30)
          )
      : "";

  const resetForm = () => {
    setClinicId("");
    setServiceId("");
    setAppointmentDate("");
    setAppointmentTime("");
    setPurpose("");
    setSymptoms("");
    setPatientNote("");
    setBookingForSelf(true);
    setGuestName("");
    setGuestPhone("");
    setError("");
    setErrorModalMessage("");
    setServices([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    try {
      setError("");

      if (!userId) {
        showBookingError("No logged-in user found.");
        return;
      }

      if (!clinicId || !serviceId || !appointmentDate || !appointmentTime) {
        showBookingError("Please complete clinic, service, date, and time.");
        return;
      }

      if (isPastAppointmentTime(appointmentDate, appointmentTime)) {
        showBookingError("Please choose a future date and time.");
        return;
      }

      const patientName = bookingForSelf ? accountName : guestName.trim();
      const patientPhone = bookingForSelf
        ? accountPhone
        : toPhilippineLocalMobileNumber(guestPhone);

      if (!patientName) {
        showBookingError(
          bookingForSelf
            ? "Your account has no name on file. Please update your profile."
            : "Please enter the patient's name."
        );
        return;
      }

      if (!bookingForSelf && !isValidPhilippineMobileNumber(patientPhone)) {
        showBookingError("Please enter a valid Philippine mobile number starting with 09 or 63, e.g. 09171234567.");
        return;
      }

      if (!selectedClinic || !selectedService) {
        showBookingError("Please select a valid clinic and service.");
        return;
      }

      if (selectedClinicDisabledReason) {
        showBookingError(selectedClinicDisabledReason);
        return;
      }

      if (selectedScheduleMessage) {
        showBookingError(selectedScheduleMessage);
        return;
      }

      setSubmitting(true);

      const startAt = toMySqlDateTime(appointmentDate, appointmentTime);
      const endAt = addMinutes(
        appointmentDate,
        appointmentTime,
        Number(selectedService.duration_minutes || 30)
      );

      const payload = {
        user_id: userId,
        clinic_id: Number(clinicId),
        start_at: startAt,
        end_at: endAt,
        purpose: purpose || selectedService.name,
        symptoms,
        patient_note: patientNote,
        patient_name_snapshot: patientName,
        patient_phone_snapshot: patientPhone,
        clinic_name_snapshot: selectedClinic.clinic_name,
        services: [
          {
            service_id: selectedService.id,
            service_name_snapshot: selectedService.name,
            price_snapshot: selectedService.price,
            duration_minutes_snapshot: selectedService.duration_minutes,
            description: selectedService.description || "",
          },
        ],
      };

      console.log("BOOK PAYLOAD:", payload);

      const res = await fetch(apiUrl("/api/appointments/book"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      console.log("BOOK STATUS:", res.status);
      console.log("BOOK RAW RESPONSE:", rawText);

      let data: ApiErrorResponse | null = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const serverMessage =
          typeof data?.error_detail === "string" && data.error_detail.trim()
            ? data.error_detail.trim()
            : typeof data?.message === "string" && data.message.trim()
            ? data.message.trim()
            : rawText.trim();

        let friendlyMessage = serverMessage;

        if (serverMessage.toLowerCase().includes("not available for booking")) {
          friendlyMessage =
            "This clinic is not approved or active for booking yet.";
        } else if (
          serverMessage.toLowerCase().includes("already has an appointment") ||
          serverMessage.toLowerCase().includes("active appointment during that time") ||
          serverMessage.toLowerCase().includes("time slot already")
        ) {
          friendlyMessage =
            "That time slot is already taken. Please choose another schedule.";
        } else if (serverMessage.toLowerCase().includes("required")) {
          friendlyMessage = "Some required booking details are missing.";
        } else if (
          serverMessage
            .toLowerCase()
            .includes("cannot add or update a child row")
        ) {
          friendlyMessage =
            "A required clinic, user, or service record is missing in the database.";
        } else if (
          serverMessage.toLowerCase().includes("incorrect datetime value")
        ) {
          friendlyMessage = "The selected date or time format is invalid.";
        } else if (
          serverMessage
            .toLowerCase()
            .includes("doesn't have a default value")
        ) {
          friendlyMessage =
            "The database requires a field that is not being sent.";
        } else if (!friendlyMessage) {
          friendlyMessage = `Failed to book appointment. Server returned ${res.status}.`;
        }

        showBookingError(friendlyMessage);
        return;
      }

      onBooked();
      handleClose();
    } catch (err) {
      console.error("BOOKING CATCH:", err);

      if (err instanceof Error && err.message.trim()) {
        showBookingError(err.message);
      } else {
        showBookingError("Something went wrong while booking the appointment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="booking-modal-overlay front">
        <div className="booking-modal">
        <div className="booking-modal-header">
          <div>
            <h2>Book Appointment</h2>
            <p>Choose your clinic, service, and preferred schedule.</p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
            aria-label="Close booking modal"
          >
            <X size={18} />
          </button>
        </div>

        {error && <div className="booking-error">{error}</div>}
        {!error && selectedClinicDisabledReason && (
          <div className="booking-error">{selectedClinicDisabledReason}</div>
        )}
        {!error && !selectedClinicDisabledReason && selectedScheduleMessage && (
          <div className="booking-warning">{selectedScheduleMessage}</div>
        )}

        <div className="booking-form-grid">
          <div className="booking-field">
            <label>Clinic</label>
            <select
              value={clinicId}
              onChange={(e) => {
                setClinicId(e.target.value);
                setError("");
              }}
              disabled={loadingClinics || submitting}
            >
              <option value="">Select clinic</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.clinic_name}
                </option>
              ))}
            </select>
          </div>

          <div className="booking-field">
            <label>Service</label>
            <select
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                setError("");
              }}
              disabled={!clinicId || loadingServices || submitting}
            >
              <option value="">Select service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - ₱{Number(service.price).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="booking-field">
            <label>Date</label>
            <input
              type="date"
              value={appointmentDate}
              min={toDateInputValue()}
              onChange={(e) => {
                setAppointmentDate(e.target.value);
                setError("");
              }}
              disabled={submitting}
            />
          </div>

          <div className="booking-field">
            <label>Time</label>
            <input
              type="time"
              value={appointmentTime}
              min={getMinimumTimeForDate(appointmentDate)}
              onChange={(e) => {
                setAppointmentTime(e.target.value);
                setError("");
              }}
              disabled={submitting}
            />
          </div>

          {/* WHO IS THIS FOR? */}
          <div className="booking-field full-width">
            <div className="fc-for-toggle">
              <span className="fc-for-label">Who is this for?</span>
              <div className="fc-for-btns">
                <button
                  type="button"
                  className={`fc-for-btn ${bookingForSelf ? "active" : ""}`}
                  onClick={() => { setBookingForSelf(true); setGuestName(""); setGuestPhone(""); setError(""); }}
                  disabled={submitting}
                >
                  Myself
                </button>
                <button
                  type="button"
                  className={`fc-for-btn ${!bookingForSelf ? "active" : ""}`}
                  onClick={() => { setBookingForSelf(false); setError(""); }}
                  disabled={submitting}
                >
                  Someone else
                </button>
              </div>
            </div>
          </div>

          {bookingForSelf ? (
            <div className="booking-field full-width">
              <div className="fc-patient-summary">
                <span>👤 {accountName || "No name on file"}</span>
                <span>📞 {accountPhone || "No phone on file"}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="booking-field">
                <label>Patient name <span className="fc-required">*</span></label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => { setGuestName(e.target.value); setError(""); }}
                  placeholder="Full name of the patient"
                  disabled={submitting}
                />
              </div>
              <div className="booking-field">
                <label>Contact number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={13}
                  pattern="09[0-9]{9}"
                  value={guestPhone}
                  onChange={(e) => {
                    setGuestPhone(normalizePhilippineMobileInput(e.target.value));
                    setError("");
                  }}
                  placeholder="09171234567"
                  disabled={submitting}
                />
                <small className="booking-field-hint">
                  Use 09XXXXXXXXX or 639XXXXXXXXX.
                </small>
              </div>
            </>
          )}

          <div className="booking-field full-width">
            <label>Purpose</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Reason for appointment"
              disabled={submitting}
            />
          </div>

          <div className="booking-field full-width">
            <label>Symptoms</label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Describe your symptoms"
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="booking-field full-width">
            <label>Patient Note</label>
            <textarea
              value={patientNote}
              onChange={(e) => setPatientNote(e.target.value)}
              placeholder="Additional note for the clinic"
              rows={3}
              disabled={submitting}
            />
          </div>
        </div>

        {selectedClinic && (
          <div className="booking-summary-box clinic-booking-summary">
            <div>
              <h4>Selected Clinic</h4>
              <p>{selectedClinic.clinic_name}</p>
              <small>{selectedClinic.address || "Address unavailable"}</small>
            </div>
            <div className="booking-summary-meta">
              <span
                className={`clinic-open-pill ${
                  selectedClinicDisabledReason ? "closed" : "open"
                }`}
              >
                {selectedClinicDisabledReason ? "Closed" : "Open"}
              </span>
              <span className="booking-rating-row">
                <Star size={14} fill="currentColor" />
                {selectedClinicRating?.score
                  ? `${selectedClinicRating.score.toFixed(1)} / 5`
                  : "No ratings yet"}
              </span>
            </div>
          </div>
        )}

        {selectedService && (
          <div className="booking-summary-box">
            <h4>Selected Service</h4>
            <p>{selectedService.name}</p>
            <small>
              ₱{Number(selectedService.price).toFixed(2)} • {selectedService.duration_minutes} mins
            </small>
          </div>
        )}

        <div className="booking-modal-actions">
          <button type="button" className="cancel-btn" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="button"
            className="book-btn"
            onClick={handleSubmit}
            disabled={
              submitting
            }
          >
            {submitting ? "Sending..." : "Send Request"}
          </button>
        </div>
        </div>
      </div>

      {errorModalMessage && (
        <div
          className="booking-modal-overlay front booking-error-dialog-overlay"
          onClick={() => setErrorModalMessage("")}
        >
          <div
            className="booking-modal small-modal booking-error-dialog"
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="booking-error-dialog-title"
          >
            <div className="booking-error-dialog-icon">
              <AlertTriangle size={34} strokeWidth={2.4} />
            </div>
            <h2 id="booking-error-dialog-title">Unable to Continue</h2>
            <p>{errorModalMessage}</p>
            <div className="booking-modal-actions">
              <button
                type="button"
                className="book-btn"
                onClick={() => setErrorModalMessage("")}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ServiceChangeModal({
  appointment,
  userId,
  onClose,
  onSaved,
}: {
  appointment: Appointment | null;
  userId: number;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [services, setServices] = useState<ClinicService[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  useEffect(() => {
    if (!appointment) return;

    const loadServices = async () => {
      try {
        setLoadingServices(true);
        setErrorModalMessage("");

        const res = await fetch(
          apiUrl(`/api/clinic/services?clinic_id=${appointment.clinic_id}`)
        );
        const data: ClinicService[] = await res.json();

        if (!res.ok) {
          throw new Error("Failed to load clinic services.");
        }

        const activeServices = Array.isArray(data)
          ? data.filter((service) => Number(service.is_active) === 1)
          : [];
        const currentServiceIds = new Set(
          (appointment.services || [])
            .map((service) => String(service.service_id))
            .filter(Boolean)
        );
        const initiallySelected = activeServices
          .filter((service) => currentServiceIds.has(String(service.id)))
          .map((service) => String(service.id));

        setServices(activeServices);
        setSelectedServiceIds(
          initiallySelected.length > 0
            ? initiallySelected
            : activeServices.length > 0
            ? [String(activeServices[0].id)]
            : []
        );
      } catch (err) {
        setServices([]);
        setSelectedServiceIds([]);
        setErrorModalMessage(
          err instanceof Error ? err.message : "Failed to load clinic services."
        );
      } finally {
        setLoadingServices(false);
      }
    };

    void loadServices();
  }, [appointment]);

  if (!appointment) return null;

  const selectedServices = services.filter((service) =>
    selectedServiceIds.includes(String(service.id))
  );
  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + getServiceDurationMinutes(service.duration_minutes),
    0
  );
  const isConfirmed = appointment.status === "confirmed";

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedServices.length) {
      setErrorModalMessage("Please select at least one clinic service.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorModalMessage("");

      const res = await fetch(apiUrl(`/api/appointments/${appointment.id}/services`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          services: selectedServices.map((service) => ({
            service_id: service.id,
          })),
        }),
      });

      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};

      if (!res.ok) {
        throw new Error(data.message || "Failed to update appointment services.");
      }

      onSaved(
        data.message ||
          (isConfirmed
            ? "Service change request sent to the clinic."
            : "Appointment services updated.")
      );
      onClose();
    } catch (err) {
      setErrorModalMessage(
        err instanceof Error ? err.message : "Failed to update appointment services."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="booking-modal-overlay front">
      <div className="booking-modal small-modal">
        <div className="booking-modal-header">
          <div>
            <h2>{isConfirmed ? "Request Service Change" : "Edit Services"}</h2>
            <p>
              {isConfirmed
                ? "The clinic must approve service changes for confirmed appointments."
                : "Update the services before the clinic confirms your request."}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close service change modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="booking-field full-width">
          <label>Services</label>
          {loadingServices ? (
            <div className="booking-service-empty">Loading services...</div>
          ) : services.length > 0 ? (
            <div className="booking-service-picker" role="group" aria-label="Appointment services">
              {services.map((service) => {
                const serviceId = String(service.id);
                const selected = selectedServiceIds.includes(serviceId);

                return (
                  <label
                    className={`booking-service-option ${selected ? "selected" : ""}`}
                    key={service.id}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleService(serviceId)}
                      disabled={submitting}
                    />
                    <span>
                      <strong>{service.name}</strong>
                      <small>
                        {formatServicePrice(service.price)} -{" "}
                        {formatServiceDuration(service.duration_minutes)}
                      </small>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="booking-service-empty">
              This clinic has no active services listed.
            </div>
          )}
        </div>

        {selectedServices.length > 0 && (
          <div className="booking-summary-box">
            <h4>Selected Services</h4>
            <p>{selectedServices.map((service) => service.name).join(", ")}</p>
            <small>
              Total estimated time: {formatServiceDuration(totalDuration || 30)}
            </small>
          </div>
        )}

        <div className="booking-modal-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="book-btn"
            onClick={handleSubmit}
            disabled={submitting || loadingServices}
          >
            {submitting
              ? "Saving..."
              : isConfirmed
              ? "Send Request"
              : "Save Services"}
          </button>
        </div>
      </div>

      {errorModalMessage && (
        <div
          className="booking-modal-overlay front booking-error-dialog-overlay"
          onClick={() => setErrorModalMessage("")}
        >
          <div
            className="booking-modal small-modal booking-error-dialog"
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="booking-error-dialog-icon">
              <AlertTriangle size={34} strokeWidth={2.4} />
            </div>
            <h2>Unable to Continue</h2>
            <p>{errorModalMessage}</p>
            <div className="booking-modal-actions">
              <button
                type="button"
                className="book-btn"
                onClick={() => setErrorModalMessage("")}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserAppointmentsContent({
  searchTerm,
  setSearchTerm,
}: UserAppointmentsContentProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [bookingOpen, setBookingOpen] = useState<boolean>(false);
  const [viewModalAppointment, setViewModalAppointment] =
    useState<Appointment | null>(null);
  const [serviceChangeAppointment, setServiceChangeAppointment] =
    useState<Appointment | null>(null);

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleConfirmOpen, setRescheduleConfirmOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  const [actionMessage, setActionMessage] = useState("");
  const [actionErrorModalMessage, setActionErrorModalMessage] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackAppointment, setFeedbackAppointment] = useState<Appointment | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "All">(
    "upcoming"
  );
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<
    | "all"
    | "pending"
    | "confirmed"
    | "reschedule_requested"
    | "cancelled"
    | "completed"
    | "no_show"
  >("all");
  const [clinicFilter, setClinicFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const userId = currentUser?.id;

  const showActionError = (message: string) => {
    setActionMessage("");
    setActionErrorModalMessage(message);
  };

  const showFeedbackError = (message: string) => {
    setFeedbackError(message);
    setActionErrorModalMessage(message);
  };

  const loadAppointments = async (silent = false) => {
    try {
      if (!userId) {
        setError("No logged-in user found.");
        if (!silent) showActionError("No logged-in user found.");
        setAppointments([]);
        if (!silent) setLoading(false);
        return;
      }

      if (!silent) setLoading(true);
      setError("");

      const res = await fetch(apiUrl(`/api/appointments/by-user/${userId}`));

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data: Appointment[] = await res.json();
      setAppointments(Array.isArray(data) ? data : []);

      void fetch(apiUrl(`/api/users/${userId}/notifications`)).catch(
        (notificationError) => {
          console.warn("Failed to sync appointment reminders:", notificationError);
        }
      );
    } catch (err) {
      console.error("Failed to load appointments:", err);
      if (!silent) {
        const message = "Failed to load appointments.";
        setError(message);
        showActionError(message);
        setAppointments([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    const interval = setInterval(() => loadAppointments(true), 30_000);
    return () => clearInterval(interval);
  }, [userId]);

  const now = Date.now();
  const startOfToday = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }, []);

  const validAppointments = useMemo(() => {
    return appointments.filter((a) => getAppointmentDate(a) !== null);
  }, [appointments]);

  const upcomingAppointments = useMemo<Appointment[]>(() => {
    return validAppointments
      .filter((a) => {
        const date = getAppointmentDate(a);
        return Boolean(
          date && isActiveAppointment(a) && date.getTime() >= startOfToday
        );
      })
      .sort(
        (a, b) =>
          (getAppointmentDate(a)?.getTime() ?? 0) -
          (getAppointmentDate(b)?.getTime() ?? 0)
      );
  }, [validAppointments, startOfToday]);

  const pastAppointments = useMemo<Appointment[]>(() => {
    return validAppointments
      .filter((a) => {
        const date = getAppointmentDate(a);
        return Boolean(
          !isActiveAppointment(a) || (date && date.getTime() < startOfToday)
        );
      })
      .sort(
        (a, b) =>
          (getAppointmentDate(b)?.getTime() ?? 0) -
          (getAppointmentDate(a)?.getTime() ?? 0)
      );
  }, [validAppointments, startOfToday]);

  const allAppointments = useMemo<Appointment[]>(() => {
    return [...validAppointments].sort(
      (a, b) =>
        (getAppointmentDate(b)?.getTime() ?? 0) -
        (getAppointmentDate(a)?.getTime() ?? 0)
    );
  }, [validAppointments]);

  const clinicOptions = useMemo(() => {
    const names = appointments
      .map((a) => a.clinic_name_snapshot || a.clinic_name || "")
      .filter(Boolean);

    return Array.from(new Set(names));
  }, [appointments]);

  const baseAppointments = useMemo(() => {
    if (activeTab === "past") return pastAppointments;
    if (activeTab === "All") return allAppointments;
    return upcomingAppointments;
  }, [activeTab, pastAppointments, allAppointments, upcomingAppointments]);

  const needsAppointmentResponse = (appointment: Appointment) =>
    appointment.status === "reschedule_requested" &&
    appointment.reschedule_requested_by !== "patient";

  const isRecentAppointment = (appointment: Appointment) => {
    const recentAnchor = parseDateTime(
      appointment.reschedule_requested_at ||
        appointment.updated_at ||
        appointment.created_at ||
        appointment.start_at
    );

    if (!recentAnchor) return false;

    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const age = now - recentAnchor.getTime();
    return age >= 0 && age <= threeDaysMs;
  };

  const rescheduleRequestCount = useMemo(() => {
    return upcomingAppointments.filter(needsAppointmentResponse).length;
  }, [upcomingAppointments]);

  const filteredAppointments = useMemo(() => {
    let list = [...baseAppointments];

    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (clinicFilter !== "all") {
      list = list.filter(
        (a) => (a.clinic_name_snapshot || a.clinic_name || "") === clinicFilter
      );
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();

      list = list.filter((a) => {
        const clinic = (a.clinic_name_snapshot || a.clinic_name || "").toLowerCase();
        const purpose = (a.purpose || "").toLowerCase();
        const specialization = (a.specialization || "").toLowerCase();
        const services = Array.isArray(a.services)
          ? a.services.map((s) => s.service_name_snapshot).join(" ").toLowerCase()
          : "";

        return (
          clinic.includes(query) ||
          purpose.includes(query) ||
          specialization.includes(query) ||
          services.includes(query)
        );
      });
    }

    list.sort((a, b) => {
      const aNeedsResponse = needsAppointmentResponse(a) ? 1 : 0;
      const bNeedsResponse = needsAppointmentResponse(b) ? 1 : 0;

      if (aNeedsResponse !== bNeedsResponse) {
        return bNeedsResponse - aNeedsResponse;
      }

      const aTime = getAppointmentDate(a)?.getTime() ?? 0;
      const bTime = getAppointmentDate(b)?.getTime() ?? 0;

      if (activeTab === "upcoming") {
        return aTime - bTime;
      }

      if (activeTab === "past") {
        return bTime - aTime;
      }

      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });

    return showAllAppointments || activeTab === "upcoming" ? list : list.slice(0, 4);
  }, [
    baseAppointments,
    statusFilter,
    clinicFilter,
    searchTerm,
    sortOrder,
    activeTab,
    showAllAppointments,
  ]);

  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
  const pendingCount = appointments.filter((a) =>
    ["pending", "reschedule_requested"].includes(a.status)
  ).length;
  const cancelledCount = appointments.filter((a) => a.status === "cancelled").length;

  const nextAppointment =
    upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  const canRescheduleAppointment = (appointment: Appointment) =>
    appointment.status === "pending" || appointment.status === "confirmed";

  const canCancelAppointment = (appointment: Appointment) =>
    ["pending", "confirmed", "reschedule_requested"].includes(appointment.status);

  const closeCancelModal = () => {
    setCancelOpen(false);
    setCancelConfirmOpen(false);
    setCancelReason("");
    setCancelSubmitting(false);
  };

  const closeRescheduleModal = () => {
    setRescheduleOpen(false);
    setRescheduleConfirmOpen(false);
    setRescheduleDate("");
    setRescheduleTime("");
    setRescheduleSubmitting(false);
  };

  const closeFeedbackModal = () => {
    setFeedbackOpen(false);
    setFeedbackAppointment(null);
    setFeedbackRating(5);
    setFeedbackText("");
    setFeedbackError("");
  };

  const openFeedbackModal = (appointment: Appointment) => {
    if (appointment.status !== "completed") {
      showActionError("You can rate a clinic after the appointment is completed.");
      return;
    }

    if (appointment.feedback_id) {
      showActionError("You already rated this clinic for this appointment.");
      return;
    }

    setActionMessage("");
    setFeedbackAppointment(appointment);
    setFeedbackRating(5);
    setFeedbackText("");
    setFeedbackError("");
    setFeedbackOpen(true);
  };

  const openCancelModal = (appointment: Appointment) => {
    if (!canCancelAppointment(appointment)) {
      showActionError(
        "Only pending, confirmed, or reschedule-requested appointments can be cancelled."
      );
      return;
    }

    setActionMessage("");
    setSelectedAppointment(appointment);
    setRescheduleOpen(false);
    setRescheduleConfirmOpen(false);
    setCancelReason("");
    setCancelConfirmOpen(false);
    setCancelOpen(true);
  };

  const openRescheduleModal = (appointment: Appointment) => {
    if (!canRescheduleAppointment(appointment)) {
      showActionError("Only pending or confirmed appointments can be rescheduled.");
      return;
    }

    setActionMessage("");
    setSelectedAppointment(appointment);
    setCancelOpen(false);
    setCancelConfirmOpen(false);

    const start = parseDateTime(appointment.start_at);

    if (start) {
      const yyyy = start.getFullYear();
      const mm = String(start.getMonth() + 1).padStart(2, "0");
      const dd = String(start.getDate()).padStart(2, "0");
      const hh = String(start.getHours()).padStart(2, "0");
      const min = String(start.getMinutes()).padStart(2, "0");

      setRescheduleDate(`${yyyy}-${mm}-${dd}`);
      setRescheduleTime(`${hh}:${min}`);
    } else {
      setRescheduleDate("");
      setRescheduleTime("");
    }

    setRescheduleConfirmOpen(false);
    setRescheduleOpen(true);
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      if (!userId) {
        showActionError("No logged-in user found.");
        return;
      }

      setCancelSubmitting(true);
      setActionMessage("");

      const res = await fetch(
        apiUrl(`/api/appointments/${selectedAppointment.id}/cancel`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            reason: cancelReason,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to cancel appointment");
      }

      closeCancelModal();
      setSelectedAppointment(null);
      setActionMessage("Appointment cancelled successfully.");
      await loadAppointments(true);
    } catch (err) {
      showActionError(
        err instanceof Error ? err.message : "Failed to cancel appointment."
      );
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleSubmitClinicFeedback = async () => {
    if (!feedbackAppointment) return;

    if (!userId) {
      showFeedbackError("No logged-in user found.");
      return;
    }

    try {
      setFeedbackSubmitting(true);
      setFeedbackError("");

      const res = await fetch(apiUrl("/api/clinic-feedback"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointment_id: feedbackAppointment.id,
          clinic_id: feedbackAppointment.clinic_id,
          user_id: userId,
          rating: feedbackRating,
          feedback: feedbackText,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(result?.message || "Failed to save clinic feedback.");
      }

      closeFeedbackModal();
      setActionMessage("Thank you. Your clinic rating was saved.");
      await loadAppointments(true);
    } catch (err) {
      showFeedbackError(
        err instanceof Error ? err.message : "Failed to save clinic feedback."
      );
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleRescheduleAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      if (!userId) {
        showActionError("No logged-in user found.");
        return;
      }

      setRescheduleSubmitting(true);
      setActionMessage("");

      if (!rescheduleDate || !rescheduleTime) {
        throw new Error("Please select date and time.");
      }

      if (isPastAppointmentTime(rescheduleDate, rescheduleTime)) {
        throw new Error("Please choose a future date and time.");
      }

      const startAt = toMySqlDateTime(rescheduleDate, rescheduleTime);

      const duration =
        Array.isArray(selectedAppointment.services) &&
        selectedAppointment.services.length > 0
          ? Number(selectedAppointment.services[0].duration_minutes_snapshot || 30)
          : 30;

      const endAt = addMinutes(rescheduleDate, rescheduleTime, duration);

      if (
        !isWithinClinicHours(
          rescheduleTime,
          endAt,
          selectedAppointment.opening_time,
          selectedAppointment.closing_time
        )
      ) {
        const open = normalizeClockTime(selectedAppointment.opening_time);
        const close = normalizeClockTime(selectedAppointment.closing_time);

        throw new Error(
          open && close
            ? `Selected time is outside clinic hours (${open} - ${close}).`
            : "Selected time is outside clinic hours."
        );
      }

      const res = await fetch(
        apiUrl(`/api/appointments/${selectedAppointment.id}/reschedule`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            start_at: startAt,
            end_at: endAt,
            reason: "Rescheduled by patient",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to reschedule appointment");
      }

      closeRescheduleModal();
      setSelectedAppointment(null);
      setActionMessage("Appointment rescheduled successfully.");
      await loadAppointments(true);
    } catch (err) {
      showActionError(
        err instanceof Error ? err.message : "Failed to reschedule appointment."
      );
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const handleClinicRescheduleResponse = async (
    appointment: Appointment,
    action: "accept" | "cancel"
  ) => {
    try {
      if (!userId) {
        showActionError("No logged-in user found.");
        return;
      }

      setActionMessage("");
      setRespondingId(appointment.id);

      const res = await fetch(
        apiUrl(`/api/appointments/${appointment.id}/reschedule-response`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            action,
          }),
        }
      );

      const data = (await res.json().catch(() => ({}))) as ApiErrorResponse;

      if (!res.ok) {
        throw new Error(data.message || "Failed to update reschedule request");
      }

      setActionMessage(
        action === "accept"
          ? "✓ New schedule accepted. Your appointment has been confirmed."
          : "Reschedule declined. The appointment was cancelled."
      );
      await loadAppointments(true);
    } catch (err) {
      showActionError(
        err instanceof Error
          ? err.message
          : "Failed to update reschedule request."
      );
    } finally {
      setRespondingId(null);
    }
  };

  const monthCells = useMemo(() => {
    return getMonthMatrix(calendarDate.getFullYear(), calendarDate.getMonth());
  }, [calendarDate]);

  const appointmentDates = useMemo(() => {
    return validAppointments
      .map((a) => getAppointmentDate(a))
      .filter((d): d is Date => d !== null);
  }, [validAppointments]);

  const todayReference = nextAppointment
    ? getAppointmentDate(nextAppointment) || new Date()
    : new Date();

  const dayAppointments = validAppointments
    .filter((a) => {
      const date = getAppointmentDate(a);
      return date ? sameDate(date, todayReference) : false;
    })
    .sort(
      (a, b) =>
        (getAppointmentDate(a)?.getTime() ?? 0) -
        (getAppointmentDate(b)?.getTime() ?? 0)
    );


    

  return (
    <>
      <div className="appointments-page">
        <div className="appointments-topbar">
          <div className="appointments-heading">
            <h1 className="page-title">Appointments</h1>
            <p className="page-subtitle">
              Manage your upcoming and past medical appointments.
            </p>
          </div>

          <div className="top-actions">
            <button
              className="filter-btn"
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
            >
              <Filter size={18} />
              Filter
            </button>

            <button
              className="book-btn"
              type="button"
              onClick={() => setBookingOpen(true)}
            >
              <Plus size={18} />
              Book Appointment
            </button>
          </div>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === "upcoming" ? "active" : ""}`}
            type="button"
            onClick={() => {
              setActiveTab("upcoming");
              setShowAllAppointments(false);
            }}
          >
            Upcoming
          </button>
          <button
            className={`tab ${activeTab === "past" ? "active" : ""}`}
            type="button"
            onClick={() => {
              setActiveTab("past");
              setShowAllAppointments(false);
            }}
          >
            Past
          </button>
          <button
            className={`tab ${activeTab === "All" ? "active" : ""}`}
            type="button"
            onClick={() => {
              setActiveTab("All");
              setShowAllAppointments(true);
            }}
          >
            All
          </button>
        </div>

        {showFilters && (
          <div className="card appointments-filter-card">
            <div className="booking-form-grid">
              <div className="booking-field">
                <label>Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Clinic, purpose, service..."
                />
              </div>

              <div className="booking-field">
                <label>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as
                        | "all"
                        | "pending"
                        | "confirmed"
                        | "reschedule_requested"
                        | "cancelled"
                        | "completed"
                        | "no_show"
                    )
                  }
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="reschedule_requested">Reschedule Requested</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                  <option value="no_show">No show</option>
                </select>
              </div>

              <div className="booking-field">
                <label>Clinic</label>
                <select value={clinicFilter} onChange={(e) => setClinicFilter(e.target.value)}>
                  <option value="all">All clinics</option>
                  {clinicOptions.map((clinic) => (
                    <option key={clinic} value={clinic}>
                      {clinic}
                    </option>
                  ))}
                </select>
              </div>

              <div className="booking-field">
                <label>Sort</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                >
                  <option value="desc">Newest to oldest</option>
                  <option value="asc">Oldest to newest</option>
                </select>
              </div>
            </div>

            <div className="booking-modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setClinicFilter("all");
                  setSortOrder("desc");
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        <div className="appointments-grid">
          <div className="left-column">
            <div className="card calendar-card">
              <div className="calendar-header">
                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={() =>
                    setCalendarDate(
                      new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1)
                    )
                  }
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>

                <h3>
                  {calendarDate.toLocaleDateString([], {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>

                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={() =>
                    setCalendarDate(
                      new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)
                    )
                  }
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="calendar-weekdays">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="calendar-grid">
                {monthCells.map((cell, index) => {
                  const isToday = sameDate(cell.date, new Date());
                  const hasAppointment = appointmentDates.some((d) => sameDate(d, cell.date));
                  const isSelected = sameDate(cell.date, todayReference);

                  return (
                    <button
                      type="button"
                      key={`${cell.date.toISOString()}-${index}`}
                      className={[
                        "calendar-day",
                        cell.currentMonth ? "" : "muted",
                        isToday ? "today" : "",
                        isSelected ? "selected" : "",
                        hasAppointment ? "has-dot" : "",
                      ]
                        .join(" ")
                        .trim()}
                    >
                      <span>{cell.date.getDate()}</span>
                    </button>
                  );
                })}
              </div>

              <div className="today-section">
                <p className="today-section-title">Today • {formatDate(todayReference)}</p>

                {dayAppointments.length > 0 ? (
                  <div className="today-mini-card">
                    <div className="today-mini-time">
                      {formatTime(getTimelineStartAt(dayAppointments[0]))}
                    </div>

                    <div className="today-mini-body">
                      <div className="today-mini-avatar">👩‍⚕️</div>

                      <div className="today-mini-info">
                        <h4>
                          {dayAppointments[0].clinic_name_snapshot ||
                            dayAppointments[0].clinic_name ||
                            "Clinic"}
                        </h4>
                        {dayAppointments[0].patient_name_snapshot && (
                          <span className="appt-for-tag">
                            For: {dayAppointments[0].patient_name_snapshot}
                          </span>
                        )}
                        <p>
                          {dayAppointments[0].purpose ||
                            dayAppointments[0].specialization ||
                            "Consultation"}
                        </p>
                        <span className={`status ${dayAppointments[0].status || ""}`}>
                          {formatStatus(dayAppointments[0].status)}
                        </span>

                        <div className="today-location-row">
                          <span>{dayAppointments[0].address || "Clinic address unavailable"}</span>
                          <button
                            type="button"
                            className="today-view-btn"
                            onClick={() => setViewModalAppointment(dayAppointments[0])}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="empty-state-text">No appointment for this day.</p>
                )}
              </div>
            </div>
          </div>

          <div className="center-column">
            <div className="card appointments-card">
              <div className="appointments-card-head">
                <div>
                  <h2>
                    {activeTab === "past"
                      ? "Past Appointments"
                      : activeTab === "All"
                      ? "All Appointments"
                      : "Upcoming Appointments"}
                  </h2>
                </div>

                {activeTab !== "All" && (
                  <button
                    className="view-all-btn"
                    type="button"
                    onClick={() => {
                      setActiveTab("All");
                      setShowAllAppointments(true);
                    }}
                  >
                    View All Appointments →
                  </button>
                )}
              </div>

              {rescheduleRequestCount > 0 && activeTab !== "past" && (
                <button
                  type="button"
                  className="appointment-priority-banner"
                  onClick={() => {
                    setStatusFilter("reschedule_requested");
                    setShowFilters(true);
                    setShowAllAppointments(true);
                  }}
                >
                  <strong>
                    {rescheduleRequestCount} reschedule{" "}
                    {rescheduleRequestCount === 1 ? "request needs" : "requests need"} your
                    response
                  </strong>
                  <span>Review the clinic's proposed time before your appointment changes.</span>
                </button>
              )}

              {loading ? (
                <p>Loading appointments...</p>
              ) : error ? (
                <p>{error}</p>
              ) : filteredAppointments.length === 0 ? (
                <div className="appointments-empty-card">
                  <h3>
                    {activeTab === "upcoming"
                      ? "No upcoming appointments visible"
                      : "No appointments found"}
                  </h3>
                  <p>
                    {activeTab === "upcoming"
                      ? "Upcoming shows active appointments from today onward. Check All if you want to see completed or cancelled appointments."
                      : "Try changing the search, status, or clinic filters."}
                  </p>
                  <div className="appointments-empty-actions">
                    {activeTab !== "All" && (
                      <button
                        type="button"
                        className="mini-action-btn"
                        onClick={() => {
                          setActiveTab("All");
                          setShowAllAppointments(true);
                        }}
                      >
                        Show All
                      </button>
                    )}
                    {(searchTerm || statusFilter !== "all" || clinicFilter !== "all") && (
                      <button
                        type="button"
                        className="mini-action-btn"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                          setClinicFilter("all");
                        }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="appointment-list">
                  {filteredAppointments.map((item) => (
                    <div
                      className={[
                        "appointment-item",
                        needsAppointmentResponse(item) ? "needs-action" : "",
                        isRecentAppointment(item) ? "is-new" : "",
                        item.status === "reschedule_requested" ? "reschedule-layout" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={item.id}
                    >
                      <div className="appointment-time">
                        <span className="time-main">
                          {formatTime(getTimelineStartAt(item))}
                        </span>
                      </div>

                      <div className="appointment-info-wrap">
                        <div className="appointment-avatar">👨‍⚕️</div>

                        <div className="appointment-info">
                          <h3>{item.clinic_name_snapshot || item.clinic_name || "Clinic"}</h3>

                          {item.patient_name_snapshot && (
                            <span className="appt-for-tag">
                              For: {item.patient_name_snapshot}
                            </span>
                          )}

                          {(needsAppointmentResponse(item) || isRecentAppointment(item)) && (
                            <div className="appointment-meta-badges">
                              {needsAppointmentResponse(item) && (
                                <span className="appointment-badge warning">
                                  Needs response
                                </span>
                              )}
                              {isRecentAppointment(item) && (
                                <span className="appointment-badge new">New update</span>
                              )}
                            </div>
                          )}

                          <p>{item.purpose || item.specialization || "Consultation"}</p>

                          <div className="clinic-row">
                            <MapPin size={14} />
                            <span>{item.address || "Address unavailable"}</span>
                          </div>

                          {Array.isArray(item.services) && item.services.length > 0 && (
                            <small>
                              {item.services
                                .map((s) => s.service_name_snapshot)
                                .filter(Boolean)
                                .join(", ")}
                            </small>
                          )}
                        </div>
                      </div>

                      <div className="appointment-date">
                        <div className="date-row">
                          <CalendarDays size={16} />
                          <span>{formatDate(getTimelineStartAt(item))}</span>
                        </div>
                        <small>{formatDay(getTimelineStartAt(item))}</small>
                      </div>

                      <div className={`status ${item.status || ""}`}>
                        {formatStatus(item.status)}
                      </div>

                      {/* Full-width reschedule proposal banner */}
                      {item.status === "reschedule_requested" && (
                        <div className="appointment-reschedule-row">
                          <div className="reschedule-row-icon">🗓️</div>
                          <div className="reschedule-row-body">
                            <strong>
                              {isPatientServiceChangeRequest(item)
                                ? "Service change pending clinic approval"
                                : "Clinic proposed a new schedule"}
                            </strong>
                            {isPatientServiceChangeRequest(item) ? (
                              <span>{item.proposed_purpose || item.reschedule_reason}</span>
                            ) : (
                              <span>
                                {formatDate(item.proposed_start_at)} at{" "}
                                {formatTime(item.proposed_start_at)}
                              </span>
                            )}
                            {item.reschedule_reason && (
                              <small>{item.reschedule_reason}</small>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="appointment-more">
                        <button type="button" className="more-btn" aria-label="More options">
                          <MoreVertical size={18} />
                        </button>
                      </div>

                      <div className="appointment-actions">
                        <button
                          className="mini-action-btn view"
                          type="button"
                          onClick={() => setViewModalAppointment(item)}
                        >
                          View
                        </button>

                        {item.status === "reschedule_requested" ? (
                          isPatientServiceChangeRequest(item) ? (
                            <button
                              className="mini-action-btn"
                              type="button"
                              onClick={() => setViewModalAppointment(item)}
                            >
                              Pending Clinic Approval
                            </button>
                          ) : (
                          <>
                            <button
                              className="mini-action-btn accept"
                              type="button"
                              disabled={respondingId === item.id}
                              onClick={() =>
                                handleClinicRescheduleResponse(item, "accept")
                              }
                            >
                              {respondingId === item.id ? "Saving…" : "Accept New Time"}
                            </button>

                            <button
                              className="mini-action-btn danger"
                              type="button"
                              disabled={respondingId === item.id}
                              onClick={() =>
                                handleClinicRescheduleResponse(item, "cancel")
                              }
                            >
                              {respondingId === item.id ? "Saving…" : "Decline and Cancel"}
                            </button>
                          </>
                          )
                        ) : item.status === "completed" ? (
                          <button
                            className={`mini-action-btn feedback ${
                              item.feedback_id ? "rated" : ""
                            }`}
                            type="button"
                            disabled={Boolean(item.feedback_id)}
                            onClick={() => openFeedbackModal(item)}
                          >
                            <Star size={14} fill="currentColor" />
                            {item.feedback_id
                              ? item.clinic_feedback_rating
                                ? `Rated ${Number(
                                    item.clinic_feedback_rating
                                  ).toFixed(0)}/5`
                                : "Rated"
                              : "Rate Clinic"}
                          </button>
                        ) : (
                          <>
                            {(item.status === "pending" || item.status === "confirmed") && (
                              <button
                                className="mini-action-btn"
                                type="button"
                                onClick={() => setServiceChangeAppointment(item)}
                              >
                                {item.status === "confirmed"
                                  ? "Request Services"
                                  : "Edit Services"}
                              </button>
                            )}

                            <button
                              className="mini-action-btn"
                              type="button"
                              onClick={() => openRescheduleModal(item)}
                              disabled={!canRescheduleAppointment(item)}
                            >
                              Reschedule
                            </button>

                            <button
                              className="mini-action-btn danger"
                              type="button"
                              onClick={() => openCancelModal(item)}
                              disabled={!canCancelAppointment(item)}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {actionMessage && <div className="booking-success">{actionMessage}</div>}
          </div>

          <div className="right-column">
            <div className="card summary-card">
              <div className="summary-head">
                <div className="summary-icon">
                  <CalendarDays size={22} />
                </div>
                <div>
                  <h3>Appointment Summary</h3>
                  <h1>{upcomingAppointments.length}</h1>
                  <p>Upcoming Appointments</p>
                </div>
              </div>

              <div className="summary-stats">
                <div className="stat-box green">
                  <h4>{confirmedCount}</h4>
                  <p>Confirmed</p>
                </div>
                <div className="stat-box blue">
                  <h4>{pendingCount}</h4>
                  <p>Pending</p>
                </div>
                <div className="stat-box red">
                  <h4>{cancelledCount}</h4>
                  <p>Canceled</p>
                </div>
              </div>
            </div>

            <div className="card quick-card">
              <h3>Quick Actions</h3>

              <button
                type="button"
                className="quick-action"
                onClick={() => setBookingOpen(true)}
              >
                <div className="quick-icon">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h4>Book Appointment</h4>
                  <p>Find a doctor and time</p>
                </div>
                <ChevronRight className="quick-chevron" size={18} />
              </button>

              <Link className="quick-action" to="/find-clinic">
                <div className="quick-icon">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4>Find Clinic</h4>
                  <p>Search nearby clinics</p>
                </div>
                <ChevronRight className="quick-chevron" size={18} />
              </Link>

              <Link className="quick-action" to="/help">
                <div className="quick-icon">
                  <Video size={20} />
                </div>
                <div>
                  <h4>Telehealth Visit</h4>
                  <p>Consult from home</p>
                </div>
                <ChevronRight className="quick-chevron" size={18} />
              </Link>
            </div>

            <div className="card health-card">
              <div className="health-head">
                <Lightbulb size={20} />
                <h3>Health Tip</h3>
              </div>
              <p>
                Regular check-ups help detect health issues early and keep you on track for a
                healthier life.
              </p>
              <div className="health-watermark">♡</div>
            </div>
          </div>
        </div>
      </div>

      <AppointmentViewModal
        appointment={viewModalAppointment}
        onClose={() => setViewModalAppointment(null)}
        onReschedule={(appointment) => {
          setViewModalAppointment(null);
          openRescheduleModal(appointment);
        }}
        onCancel={(appointment) => {
          setViewModalAppointment(null);
          openCancelModal(appointment);
        }}
        onServiceChange={(appointment) => {
          setViewModalAppointment(null);
          setServiceChangeAppointment(appointment);
        }}
      />

      <ServiceChangeModal
        appointment={serviceChangeAppointment}
        userId={userId || 0}
        onClose={() => setServiceChangeAppointment(null)}
        onSaved={(message) => {
          setServiceChangeAppointment(null);
          setActionMessage(message);
          void loadAppointments();
        }}
      />

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onBooked={() => {
          void loadAppointments();
          setActionMessage(
            "Appointment request sent successfully. The clinic will review it before confirming."
          );
        }}
        userId={userId || 0}
      />

      {actionErrorModalMessage && (
        <div
          className="booking-modal-overlay front booking-error-dialog-overlay"
          onClick={() => setActionErrorModalMessage("")}
        >
          <div
            className="booking-modal small-modal booking-error-dialog"
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="appointment-error-dialog-title"
          >
            <div className="booking-error-dialog-icon">
              <AlertTriangle size={34} strokeWidth={2.4} />
            </div>
            <h2 id="appointment-error-dialog-title">Unable to Continue</h2>
            <p>{actionErrorModalMessage}</p>
            <div className="booking-modal-actions">
              <button
                type="button"
                className="book-btn"
                onClick={() => setActionErrorModalMessage("")}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackOpen && feedbackAppointment && (
        <div className="booking-modal-overlay">
          <div className="booking-modal feedback-modal">
            <div className="booking-modal-header">
              <div>
                <h2>Rate Clinic</h2>
                <p>
                  {feedbackAppointment.clinic_name_snapshot ||
                    feedbackAppointment.clinic_name ||
                    "Clinic"}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeFeedbackModal}
                aria-label="Close feedback modal"
                disabled={feedbackSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            {feedbackError && <div className="booking-error">{feedbackError}</div>}

            <div className="feedback-rating-panel">
              <span>How was your appointment?</span>
              <div className="feedback-stars" aria-label="Clinic rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`feedback-star-btn ${
                      value <= feedbackRating ? "active" : ""
                    }`}
                    onClick={() => setFeedbackRating(value)}
                    disabled={feedbackSubmitting}
                    aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  >
                    <Star size={24} fill="currentColor" />
                  </button>
                ))}
              </div>
            </div>

            <div className="booking-field full-width">
              <label>Feedback</label>
              <textarea
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                placeholder="Tell the clinic what went well or what can improve."
                rows={4}
                disabled={feedbackSubmitting}
              />
            </div>

            <p className="feedback-modal-note">
              This helps other users compare clinics and helps the clinic improve their service.
            </p>

            <div className="booking-modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={closeFeedbackModal}
                disabled={feedbackSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="book-btn"
                onClick={handleSubmitClinicFeedback}
                disabled={feedbackSubmitting}
              >
                {feedbackSubmitting ? "Saving..." : "Save Rating"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelOpen && selectedAppointment && (
        <div className="booking-modal-overlay">
          <div className="booking-modal small-modal">
            <div className="booking-modal-header">
              <div>
                <h2>Cancel Appointment</h2>
                <p>
                  {selectedAppointment.clinic_name_snapshot ||
                    selectedAppointment.clinic_name ||
                    "Clinic"}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeCancelModal}
                aria-label="Close cancel modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="booking-field full-width">
              <label>Reason</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why are you cancelling?"
                rows={4}
              />
            </div>

            <div className="booking-modal-actions">
              <button type="button" className="cancel-btn" onClick={closeCancelModal}>
                Back
              </button>
              <button
                type="button"
                className="book-btn"
                onClick={() => setCancelConfirmOpen(true)}
                disabled={cancelSubmitting}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelConfirmOpen && selectedAppointment && (
        <div className="booking-modal-overlay">
          <div className="booking-modal small-modal">
            <div className="booking-modal-header">
              <div>
                <h2>Are you sure?</h2>
                <p>This action will cancel your appointment.</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setCancelConfirmOpen(false)}
                aria-label="Close confirmation modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="booking-summary-box">
              <h4>
                {selectedAppointment.clinic_name_snapshot ||
                  selectedAppointment.clinic_name ||
                  "Clinic"}
              </h4>
              {selectedAppointment.patient_name_snapshot && (
                <p className="summary-for-tag">For: {selectedAppointment.patient_name_snapshot}</p>
              )}
              <small>
                {formatDate(selectedAppointment.start_at)} at{" "}
                {formatTime(selectedAppointment.start_at)}
              </small>
            </div>

            <div className="booking-modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setCancelConfirmOpen(false)}
                disabled={cancelSubmitting}
              >
                No, go back
              </button>
              <button
                type="button"
                className="book-btn"
                onClick={handleCancelAppointment}
                disabled={cancelSubmitting}
              >
                {cancelSubmitting ? "Cancelling..." : "Yes, cancel appointment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleOpen && selectedAppointment && (
        <div className="booking-modal-overlay">
          <div className="booking-modal small-modal">
            <div className="booking-modal-header">
              <div>
                <h2>Reschedule Appointment</h2>
                <p>
                  {selectedAppointment.clinic_name_snapshot ||
                    selectedAppointment.clinic_name ||
                    "Clinic"}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeRescheduleModal}
                aria-label="Close reschedule modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="booking-form-grid">
              <div className="booking-field">
                <label>Date</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    min={toDateInputValue()}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
              </div>

              <div className="booking-field">
                <label>Time</label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    min={getMinimumTimeForDate(rescheduleDate)}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                  />
              </div>
            </div>

            {(selectedAppointment.opening_time || selectedAppointment.closing_time) && (
              <div className="booking-summary-box">
                <h4>Clinic Hours</h4>
                <small>
                  {normalizeClockTime(selectedAppointment.opening_time) || "--:--"} -{" "}
                  {normalizeClockTime(selectedAppointment.closing_time) || "--:--"}
                </small>
              </div>
            )}

            <div className="booking-modal-actions">
              <button type="button" className="cancel-btn" onClick={closeRescheduleModal}>
                Back
              </button>
              <button
                type="button"
                className="book-btn"
                onClick={() => setRescheduleConfirmOpen(true)}
                disabled={rescheduleSubmitting}
              >
                {rescheduleSubmitting ? "Saving..." : "Confirm Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleConfirmOpen && selectedAppointment && (
        <div className="booking-modal-overlay">
          <div className="booking-modal small-modal">
            <div className="booking-modal-header">
              <div>
                <h2>Confirm Reschedule</h2>
                <p>Please review your new appointment schedule.</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setRescheduleConfirmOpen(false)}
                aria-label="Close reschedule confirmation modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="booking-summary-box">
              <h4>
                {selectedAppointment.clinic_name_snapshot ||
                  selectedAppointment.clinic_name ||
                  "Clinic"}
              </h4>
              {selectedAppointment.patient_name_snapshot && (
                <p className="summary-for-tag">For: {selectedAppointment.patient_name_snapshot}</p>
              )}
              <small>
                New schedule: {rescheduleDate || "--"} at {rescheduleTime || "--:--"}
              </small>
            </div>

            <div className="booking-modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setRescheduleConfirmOpen(false)}
                disabled={rescheduleSubmitting}
              >
                Back
              </button>
              <button
                type="button"
                className="book-btn"
                onClick={handleRescheduleAppointment}
                disabled={rescheduleSubmitting}
              >
                {rescheduleSubmitting ? "Saving..." : "Yes, reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function UserAppointments() {
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(false);
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className={`user-layout ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search appointments..."
      />

      <main className="page-content appointments-page-content">
        <UserAppointmentsContent
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </main>
    </div>
  );
}
