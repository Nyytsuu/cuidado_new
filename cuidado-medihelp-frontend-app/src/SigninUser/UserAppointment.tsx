

import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import "./UserAppointment.css";
import UserSidebar from "../Categories/UserSidebar";
import VoiceAssistantPopup from "./VoiceAssistantPopup";
import { apiUrl } from "../sharedBackendFetch";
import { useUnreadNotifications } from "../useUnreadNotifications";
import logo from "../img/logo.png";
import {
  Filter,
  Plus,
  CalendarDays,
  House,
  Stethoscope,
  MapPin,
  Video,
  Lightbulb,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Search,
  Menu,
  Bell,
  Mic,
  Calculator,
  UserRound,
} from "lucide-react";

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
};

type Clinic = {
  id: number;
  clinic_name: string;
  address?: string;
  specialization?: string;
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
  openSidebar: () => void;
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

function isValidDate(
  value: string | number | Date | null | undefined
): boolean {
  return parseDateTime(value) !== null;
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

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function normalizeClockTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = String(value).match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : null;
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
    } catch { return null; }
  }, []);

  const accountName: string = currentUser?.full_name || currentUser?.name || "";
  const accountPhone: string = currentUser?.phone || "";

  const [loadingClinics, setLoadingClinics] = useState<boolean>(false);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    const loadClinics = async () => {
      try {
        setLoadingClinics(true);
        setError("");

        const res = await fetch("http://localhost:5000/api/clinics");
        if (!res.ok) throw new Error("Failed to load clinics");

        const data: Clinic[] = await res.json();
        setClinics(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError("Failed to load clinics.");
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
          `http://localhost:5000/api/clinic/services?clinic_id=${clinicId}`
        );
        if (!res.ok) throw new Error("Failed to load services");

        const data: ClinicService[] = await res.json();
        setServices(
          Array.isArray(data) ? data.filter((s) => s.is_active === 1) : []
        );
      } catch (err) {
        console.error(err);
        setError("Failed to load clinic services.");
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
        setError("No logged-in user found.");
        return;
      }

      if (!clinicId || !serviceId || !appointmentDate || !appointmentTime) {
        setError("Please complete clinic, service, date, and time.");
        return;
      }

      if (isPastAppointmentTime(appointmentDate, appointmentTime)) {
        setError("Please choose a future date and time.");
        return;
      }

      const patientName = bookingForSelf ? accountName : guestName.trim();
      const patientPhone = bookingForSelf
        ? accountPhone
        : toPhilippineLocalMobileNumber(guestPhone);

      if (!patientName) {
        setError(bookingForSelf ? "Your account name is missing." : "Please enter the patient's name.");
        return;
      }

      if (!bookingForSelf && !isValidPhilippineMobileNumber(patientPhone)) {
        setError("Please enter a valid Philippine mobile number starting with 09 or 63, e.g. 09171234567.");
        return;
      }

      if (!selectedClinic || !selectedService) {
        setError("Please select a valid clinic and service.");
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
          serverMessage
            .toLowerCase()
            .includes("already has an appointment at that time")
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

        setError(friendlyMessage);
        return;
      }

      onBooked();
      handleClose();
    } catch (err) {
      console.error("BOOKING CATCH:", err);

      if (err instanceof Error && err.message.trim()) {
        setError(err.message);
      } else {
        setError("Something went wrong while booking the appointment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="booking-modal-overlay front">
      <div className="booking-modal">
        <div className="booking-modal-header">
          <div>
            <h2>Book Appointment</h2>
            <p>Choose your clinic, service, and schedule.</p>
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

        <div className="booking-form-grid">
          <div className="booking-field">
            <label>Clinic</label>
            <select
              value={clinicId}
              onChange={(e) => setClinicId(e.target.value)}
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
              onChange={(e) => setServiceId(e.target.value)}
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
              onChange={(e) => setAppointmentDate(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="booking-field">
            <label>Time</label>
            <input
              type="time"
              value={appointmentTime}
              min={getMinimumTimeForDate(appointmentDate)}
              onChange={(e) => setAppointmentTime(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="booking-field full-width">
            <label>Who is this for?</label>
            <div className="fc-for-toggle">
              <button
                type="button"
                className={`fc-for-btn${bookingForSelf ? " active" : ""}`}
                onClick={() => { setBookingForSelf(true); setGuestName(""); setGuestPhone(""); setError(""); }}
                disabled={submitting}
              >
                Myself
              </button>
              <button
                type="button"
                className={`fc-for-btn${!bookingForSelf ? " active" : ""}`}
                onClick={() => { setBookingForSelf(false); setError(""); }}
                disabled={submitting}
              >
                Someone else
              </button>
            </div>
          </div>

          {bookingForSelf ? (
            <div className="booking-field full-width">
              <div className="fc-patient-summary">
                <span>👤 {accountName || "Name not set"}</span>
                <span>📞 {accountPhone || "Phone not set"}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="booking-field">
                <label>Patient Name <span className="fc-required-star">*</span></label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Full name of the patient"
                  disabled={submitting}
                />
              </div>
              <div className="booking-field">
                <label>Phone Number</label>
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
          <div className="booking-summary-box">
            <h4>Selected Clinic</h4>
            <p>{selectedClinic.clinic_name}</p>
            <small>{selectedClinic.address || "Address unavailable"}</small>
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
            disabled={submitting}
          >
            {submitting ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserAppointmentsContent({
  searchTerm,
  setSearchTerm,
  openSidebar,
}: UserAppointmentsContentProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [bookingOpen, setBookingOpen] = useState<boolean>(false);

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
  const [rescheduleResultModal, setRescheduleResultModal] = useState<{
    action: "accept" | "cancel";
    message: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "all">(
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
  const unreadNotificationCount = useUnreadNotifications(userId || null);
  const hasUnreadNotifications = unreadNotificationCount > 0;
  const unreadNotificationLabel =
    unreadNotificationCount > 9 ? "9+" : String(unreadNotificationCount);

  const loadAppointments = async (silent = false) => {
    try {
      if (!userId) {
        setError("No logged-in user found.");
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
        setError("Failed to load appointments.");
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
    return appointments.filter((a) => isValidDate(a.start_at));
  }, [appointments]);

  const upcomingAppointments = useMemo<Appointment[]>(() => {
    return validAppointments
      .filter((a) => {
        const time = parseDateTime(getTimelineStartAt(a))?.getTime() ?? 0;
        const isActive = ["pending", "confirmed", "reschedule_requested"].includes(a.status);
        return isActive && time >= startOfToday;
      })
      .sort(
        (a, b) =>
          (parseDateTime(getTimelineStartAt(a))?.getTime() ?? 0) -
          (parseDateTime(getTimelineStartAt(b))?.getTime() ?? 0)
      );
  }, [validAppointments, startOfToday]);

  const pastAppointments = useMemo<Appointment[]>(() => {
    return validAppointments
      .filter((a) => {
        const time = parseDateTime(getTimelineStartAt(a))?.getTime() ?? 0;
        const isActive = ["pending", "confirmed", "reschedule_requested"].includes(a.status);
        return !isActive || time < startOfToday;
      })
      .sort(
        (a, b) =>
          (parseDateTime(getTimelineStartAt(b))?.getTime() ?? 0) -
          (parseDateTime(getTimelineStartAt(a))?.getTime() ?? 0)
      );
  }, [validAppointments, startOfToday]);

  const allAppointments = useMemo<Appointment[]>(() => {
    return [...validAppointments].sort(
      (a, b) =>
        (parseDateTime(getTimelineStartAt(a))?.getTime() ?? 0) -
        (parseDateTime(getTimelineStartAt(b))?.getTime() ?? 0)
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
    if (activeTab === "all") return allAppointments;
    return upcomingAppointments;
  }, [activeTab, pastAppointments, allAppointments, upcomingAppointments]);

  const needsAppointmentResponse = (appointment: Appointment) =>
    appointment.status === "reschedule_requested";

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

      const aTime = parseDateTime(getTimelineStartAt(a))?.getTime() ?? 0;
      const bTime = parseDateTime(getTimelineStartAt(b))?.getTime() ?? 0;
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });

    return showAllAppointments || activeTab === "upcoming" ? list : list.slice(0, 4);
  }, [
    activeTab,
    baseAppointments,
    statusFilter,
    clinicFilter,
    searchTerm,
    sortOrder,
    showAllAppointments,
  ]);

  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
  const pendingCount = appointments.filter((a) =>
    ["pending", "reschedule_requested"].includes(a.status)
  ).length;
  const cancelledCount = appointments.filter((a) => a.status === "cancelled").length;
  const displayedAppointmentCount =
    activeTab === "past"
      ? pastAppointments.length
      : activeTab === "all"
      ? allAppointments.length
      : upcomingAppointments.length;
  const displayedAppointmentLabel =
    activeTab === "past"
      ? "Past Appointments"
      : activeTab === "all"
      ? "Total Appointments"
      : "Upcoming Appointments";

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

  const openCancelModal = (appointment: Appointment) => {
    if (!canCancelAppointment(appointment)) {
      setActionMessage(
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
      setActionMessage("Only pending or confirmed appointments can be rescheduled.");
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
        setActionMessage("No logged-in user found.");
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
      await loadAppointments();
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : "Failed to cancel appointment."
      );
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleRescheduleAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      if (!userId) {
        setActionMessage("No logged-in user found.");
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
      await loadAppointments();
    } catch (err) {
      setActionMessage(
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
        setActionMessage("No logged-in user found.");
        return;
      }

      setActionMessage("");

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

      setRescheduleResultModal({
        action,
        message:
          action === "accept"
            ? "New schedule accepted. Your appointment has been confirmed."
            : "Reschedule declined. The appointment has been cancelled.",
      });
      await loadAppointments(true);
    } catch (err) {
      setActionMessage(
        err instanceof Error
          ? err.message
          : "Failed to update reschedule request."
      );
    }
  };

  const monthCells = useMemo(() => {
    return getMonthMatrix(calendarDate.getFullYear(), calendarDate.getMonth());
  }, [calendarDate]);

  const appointmentDates = useMemo(() => {
    return validAppointments
      .map((a) => parseDateTime(getTimelineStartAt(a)))
      .filter((d): d is Date => d !== null);
  }, [validAppointments]);

  const todayReference = nextAppointment
    ? parseDateTime(getTimelineStartAt(nextAppointment)) || new Date()
    : new Date();

  const dayAppointments = validAppointments
    .filter((a) => {
      const date = parseDateTime(getTimelineStartAt(a));
      return date ? sameDate(date, todayReference) : false;
    })
    .sort(
      (a, b) =>
        (parseDateTime(getTimelineStartAt(a))?.getTime() ?? 0) -
        (parseDateTime(getTimelineStartAt(b))?.getTime() ?? 0)
    );


    

  return (
    <>
      <div className="appointments-page">
        <div className="appointments-mobile-header">
          <div className="appointments-mobile-bar">
            <button
              type="button"
              className="appointments-icon-button"
              aria-label="Open sidebar"
              onClick={openSidebar}
            >
              <Menu className="appointments-menu-icon" size={20} strokeWidth={3} />
            </button>

            <Link className="appointments-mobile-brand" to="/homepage">
              <img src={logo} alt="CUIDADO" />
            </Link>

            <Link
              to="/notifications"
              className="appointments-icon-button appointments-notification-button"
              aria-label={
                hasUnreadNotifications
                  ? `Open notifications, ${unreadNotificationCount} unread`
                  : "Open notifications"
              }
            >
              <Bell size={19} />
              {hasUnreadNotifications && (
                <span className="appointments-notification-badge">
                  {unreadNotificationLabel}
                </span>
              )}
            </Link>
          </div>

          <label className="appointments-mobile-search">
            <Search size={16} />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search appointments..."
            />
          </label>
        </div>

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
            className={`tab ${activeTab === "all" ? "active" : ""}`}
            type="button"
            onClick={() => {
              setActiveTab("all");
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
                  <option value="asc">Oldest to newest</option>
                  <option value="desc">Newest to oldest</option>
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
                          <a href={`/appointments/${dayAppointments[0].id}`}>View</a>
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
                      : activeTab === "all"
                      ? "All Appointments"
                      : "Upcoming Appointments"}
                  </h2>
                </div>

                {activeTab !== "all" && (
                  <button
                    className="view-all-btn"
                    type="button"
                    onClick={() => {
                      setActiveTab("all");
                      setShowAllAppointments(true);
                    }}
                  >
                    View All
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
                <p>No appointments found.</p>
              ) : (
                <div className="appointment-list">
                  {filteredAppointments.map((item) => (
                    <div
                      className={[
                        "appointment-item",
                        needsAppointmentResponse(item) ? "needs-action" : "",
                        isRecentAppointment(item) ? "is-new" : "",
                      ]
                        .join(" ")
                        .trim()}
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

                          {item.status === "reschedule_requested" && (
                            <div className="reschedule-request-box">
                              <strong>Clinic proposed a new schedule</strong>
                              <span>
                                {formatDate(item.proposed_start_at)} at{" "}
                                {formatTime(item.proposed_start_at)}
                              </span>
                              {item.reschedule_reason && (
                                <small>{item.reschedule_reason}</small>
                              )}
                            </div>
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

                      <div className="appointment-more">
                        <button type="button" className="more-btn" aria-label="More options">
                          <MoreVertical size={18} />
                        </button>
                      </div>

                      <div className="appointment-actions">
                        {item.status === "reschedule_requested" ? (
                          <>
                            <button
                              className="mini-action-btn accept"
                              type="button"
                              onClick={() =>
                                handleClinicRescheduleResponse(item, "accept")
                              }
                            >
                              Accept New Time
                            </button>

                            <button
                              className="mini-action-btn danger"
                              type="button"
                              onClick={() =>
                                handleClinicRescheduleResponse(item, "cancel")
                              }
                            >
                              Decline and Cancel
                            </button>
                          </>
                        ) : (
                          <>
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
                  <h1>{displayedAppointmentCount}</h1>
                  <p>{displayedAppointmentLabel}</p>
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

              <button type="button" className="quick-action">
                <div className="quick-icon">
                  <Video size={20} />
                </div>
                <div>
                  <h4>Telehealth Visit</h4>
                  <p>Consult from home</p>
                </div>
                <ChevronRight className="quick-chevron" size={18} />
              </button>
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

        <nav className="appointments-bottom-nav" aria-label="Mobile navigation">
          <NavLink to="/homepage" className={({ isActive }) => (isActive ? "active" : "")}>
            <House size={19} />
            <span>Home</span>
          </NavLink>

          <NavLink to="/appointments" className={({ isActive }) => (isActive ? "active" : "")}>
            <CalendarDays size={19} />
            <span>Appointments</span>
          </NavLink>

          <NavLink to="/browse-health" className={({ isActive }) => (isActive ? "active" : "")}>
            <Stethoscope size={19} />
            <span>Health</span>
          </NavLink>

          <VoiceAssistantPopup
            userId={userId ? Number(userId) : null}
            className="bottom-nav-voice"
            ariaLabel="Voice Assistant"
          >
            <Mic size={32} />
            <span>Voice Assistant</span>
          </VoiceAssistantPopup>

          <NavLink to="/bmi-calculator" className={({ isActive }) => (isActive ? "active" : "")}>
            <Calculator size={19} />
            <span>BMI</span>
          </NavLink>

          <NavLink to="/find-clinic" className={({ isActive }) => (isActive ? "active" : "")}>
            <MapPin size={19} />
            <span>Clinics</span>
          </NavLink>

          <NavLink to="/profile" className={({ isActive }) => (isActive ? "active" : "")}>
            <UserRound size={19} />
            <span>Profile</span>
          </NavLink>
        </nav>

      </div>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onBooked={loadAppointments}
        userId={userId || 0}
      />

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
              <small>
                {formatDate(getTimelineStartAt(selectedAppointment))} at{" "}
                {formatTime(getTimelineStartAt(selectedAppointment))}
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

      {rescheduleResultModal && (
        <div className="booking-modal-overlay reschedule-result-overlay">
          <div className="booking-modal small-modal reschedule-result-modal">
            <div className="reschedule-result-icon">
              {rescheduleResultModal.action === "accept" ? (
                <span className="reschedule-result-icon--accept">✓</span>
              ) : (
                <span className="reschedule-result-icon--cancel">✕</span>
              )}
            </div>
            <h2>
              {rescheduleResultModal.action === "accept"
                ? "Appointment Confirmed"
                : "Appointment Cancelled"}
            </h2>
            <p>{rescheduleResultModal.message}</p>
            <button
              type="button"
              className="book-btn"
              onClick={() => setRescheduleResultModal(null)}
            >
              OK
            </button>
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
    <div
      className={`user-layout appointments-shell ${
        sidebarExpanded ? "sidebar-expanded" : ""
      }`}
    >
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

      <main className="page-content">
        <UserAppointmentsContent
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          openSidebar={() => setSidebarExpanded(true)}
        />
      </main>
    </div>
  );
}
