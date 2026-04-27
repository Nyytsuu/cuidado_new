

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
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
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

function parseDateTime(
  value: string | number | Date | null | undefined
): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed =
    typeof value === "string"
      ? new Date(value.replace(" ", "T"))
      : new Date(value);

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

function toMySqlDateTime(date: string, time: string): string {
  return `${date} ${time}:00`;
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

  const [patientName, setPatientName] = useState<string>("");
  const [patientPhone, setPatientPhone] = useState<string>("");

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
    setPatientName("");
    setPatientPhone("");
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

      if (!patientName.trim() || !patientPhone.trim()) {
        setError("Please enter your name and phone number.");
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

      const res = await fetch("http://localhost:5000/api/appointments/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      console.log("BOOK STATUS:", res.status);
      console.log("BOOK RAW RESPONSE:", rawText);

      let data: any = null;
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
  onChange={(e) => setAppointmentDate(e.target.value)}
  min={new Date().toISOString().split("T")[0]} // ✅ disables past dates
  disabled={submitting}
            />
          </div>

          <div className="booking-field">
            <label>Time</label>
            <input
              type="time"
              value={appointmentTime}
              onChange={(e) => setAppointmentTime(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="booking-field">
            <label>Your Name</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter your full name"
              disabled={submitting}
            />
          </div>

          <div className="booking-field">
            <label>Phone Number</label>
            <input
  type="text"
  value={patientPhone}
  onChange={(e) => {
    const value = e.target.value.replace(/\D/g, ""); // allow digits only
    if (value.length <= 11) {
      setPatientPhone(value);
    }
  }}
  maxLength={11}
  placeholder="Enter your phone number"
  disabled={submitting}
/>
          </div>

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

function UserAppointmentsContent() {
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

  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "calendar">(
    "upcoming"
  );
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [logoutPopupOpen, setLogoutPopupOpen] = useState(false);


  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "confirmed" | "cancelled" | "completed" | "no_show"
  >("all");
  const [clinicFilter, setClinicFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const userId = currentUser?.id;

  const loadAppointments = async () => {
    try {
      if (!userId) {
        setError("No logged-in user found.");
        setAppointments([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const res = await fetch(
        `http://localhost:5000/api/appointments/by-user/${userId}`
      );

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data: Appointment[] = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load appointments:", err);
      setError("Failed to load appointments.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [userId]);

  const now = Date.now();

  const validAppointments = useMemo(() => {
    return appointments.filter((a) => isValidDate(a.start_at));
  }, [appointments]);

  const upcomingAppointments = useMemo<Appointment[]>(() => {
    return validAppointments
      .filter((a) => (parseDateTime(a.start_at)?.getTime() ?? 0) >= now)
      .sort(
        (a, b) =>
          (parseDateTime(a.start_at)?.getTime() ?? 0) -
          (parseDateTime(b.start_at)?.getTime() ?? 0)
      );
  }, [validAppointments, now]);

  const pastAppointments = useMemo<Appointment[]>(() => {
    return validAppointments
      .filter((a) => (parseDateTime(a.start_at)?.getTime() ?? 0) < now)
      .sort(
        (a, b) =>
          (parseDateTime(b.start_at)?.getTime() ?? 0) -
          (parseDateTime(a.start_at)?.getTime() ?? 0)
      );
  }, [validAppointments, now]);

  const allAppointments = useMemo<Appointment[]>(() => {
    return [...validAppointments].sort(
      (a, b) =>
        (parseDateTime(a.start_at)?.getTime() ?? 0) -
        (parseDateTime(b.start_at)?.getTime() ?? 0)
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
    if (activeTab === "calendar") return allAppointments;
    return upcomingAppointments;
  }, [activeTab, pastAppointments, allAppointments, upcomingAppointments]);

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
      const aTime = parseDateTime(a.start_at)?.getTime() ?? 0;
      const bTime = parseDateTime(b.start_at)?.getTime() ?? 0;
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });

    return showAllAppointments ? list : list.slice(0, 4);
  }, [
    baseAppointments,
    statusFilter,
    clinicFilter,
    searchTerm,
    sortOrder,
    showAllAppointments,
  ]);

  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
  const pendingCount = appointments.filter((a) => a.status === "pending").length;
  const cancelledCount = appointments.filter((a) => a.status === "cancelled").length;

  const nextAppointment =
    upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  const canEditAppointment = (appointment: Appointment) =>
    appointment.status === "pending" || appointment.status === "confirmed";

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
    if (!canEditAppointment(appointment)) {
      setActionMessage("Only pending or confirmed appointments can be cancelled.");
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
    if (!canEditAppointment(appointment)) {
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
        `http://localhost:5000/api/appointments/${selectedAppointment.id}/cancel`,
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
        `http://localhost:5000/api/appointments/${selectedAppointment.id}/reschedule`,
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

  const monthCells = useMemo(() => {
    return getMonthMatrix(calendarDate.getFullYear(), calendarDate.getMonth());
  }, [calendarDate]);

  const appointmentDates = useMemo(() => {
    return validAppointments
      .map((a) => parseDateTime(a.start_at))
      .filter((d): d is Date => d !== null);
  }, [validAppointments]);

  const todayReference = nextAppointment
    ? parseDateTime(nextAppointment.start_at) || new Date()
    : new Date();

  const dayAppointments = validAppointments
    .filter((a) => {
      const date = parseDateTime(a.start_at);
      return date ? sameDate(date, todayReference) : false;
    })
    .sort(
      (a, b) =>
        (parseDateTime(a.start_at)?.getTime() ?? 0) -
        (parseDateTime(b.start_at)?.getTime() ?? 0)
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
            className={`tab ${activeTab === "calendar" ? "active" : ""}`}
            type="button"
            onClick={() => {
              setActiveTab("calendar");
              setShowAllAppointments(true);
            }}
          >
            Calendar
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
                        | "cancelled"
                        | "completed"
                        | "no_show"
                    )
                  }
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
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
                  setSortOrder("asc");
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
                      {formatTime(dayAppointments[0].start_at)}
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
                          {dayAppointments[0].status || "unknown"}
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
                      : activeTab === "calendar"
                      ? "Calendar Appointments"
                      : "Upcoming Appointments"}
                  </h2>
                </div>

                {activeTab !== "calendar" && (
                  <button
                    className="view-all-btn"
                    type="button"
                    onClick={() => {
                      setActiveTab("calendar");
                      setShowAllAppointments(true);
                    }}
                  >
                    View All Appointments →
                  </button>
                )}
              </div>

              {loading ? (
                <p>Loading appointments...</p>
              ) : error ? (
                <p>{error}</p>
              ) : filteredAppointments.length === 0 ? (
                <p>No appointments found.</p>
              ) : (
                <div className="appointment-list">
                  {filteredAppointments.map((item) => (
                    <div className="appointment-item" key={item.id}>
                      <div className="appointment-time">
                        <span className="time-main">{formatTime(item.start_at)}</span>
                      </div>

                      <div className="appointment-info-wrap">
                        <div className="appointment-avatar">👨‍⚕️</div>

                        <div className="appointment-info">
                          <h3>{item.clinic_name_snapshot || item.clinic_name || "Clinic"}</h3>

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
                          <span>{formatDate(item.start_at)}</span>
                        </div>
                        <small>{formatDay(item.start_at)}</small>
                      </div>

                      <div className={`status ${item.status || ""}`}>
                        {item.status || "unknown"}
                      </div>

                      <div className="appointment-more">
                        <button type="button" className="more-btn" aria-label="More options">
                          <MoreVertical size={18} />
                        </button>
                      </div>

                      <div className="appointment-actions">
                        <button
                          className="mini-action-btn"
                          type="button"
                          onClick={() => openRescheduleModal(item)}
                        >
                          Reschedule
                        </button>

                        <button
                          className="mini-action-btn danger"
                          type="button"
                          onClick={() => openCancelModal(item)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab !== "calendar" && (
                <button
                  className="view-all-btn"
                  type="button"
                  onClick={() => {
                    setActiveTab("calendar");
                    setShowAllAppointments(true);
                    setSearchTerm("");
                    setStatusFilter("all");
                    setClinicFilter("all");
                    setSortOrder("asc");
                  }}
                >
                  View All Appointments →
                </button>
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
                  <h1>{appointments.length}</h1>
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

              <div className="quick-action" onClick={() => setBookingOpen(true)}>
                <div className="quick-icon">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h4>Book Appointment</h4>
                  <p>Find a doctor and time</p>
                </div>
              </div>

              <div className="quick-action">
                <div className="quick-icon">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4>Find Clinic</h4>
                  <p>Search nearby clinics</p>
                </div>
              </div>

              <div className="quick-action">
                <div className="quick-icon">
                  <Video size={20} />
                </div>
                <div>
                  <h4>Telehealth Visit</h4>
                  <p>Consult from home</p>
                </div>
              </div>
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
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>

              <div className="booking-field">
                <label>Time</label>
                <input
                  type="time"
                  value={rescheduleTime}
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
    </>
  );
}

export default function UserAppointments() {
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(false);
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState<boolean>(false);

  return (
    <div className={`user-layout ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <main className="page-content">
        <UserAppointmentsContent />
      </main>
    </div>
  );
}