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

function isValidDate(value: string | number | Date | null | undefined): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function formatTime(dateString: string | number | Date | null | undefined): string {
  if (!isValidDate(dateString)) return "--:--";
  return new Date(dateString as string | number | Date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateString: string | number | Date | null | undefined): string {
  if (!isValidDate(dateString)) return "No date";
  return new Date(dateString as string | number | Date).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDay(dateString: string | number | Date | null | undefined): string {
  if (!isValidDate(dateString)) return "";
  return new Date(dateString as string | number | Date).toLocaleDateString([], {
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

  const end = new Date(endDateTime.replace(" ", "T"));
  if (Number.isNaN(end.getTime())) return false;

  const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(
    end.getMinutes()
  ).padStart(2, "0")}`;

  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  const openMinutes = toMinutes(open);
  const closeMinutes = toMinutes(close);

  return startMinutes >= openMinutes && endMinutes <= closeMinutes;
}

function BookingModal({ open, onClose, onBooked, userId }: BookingModalProps) {
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
        setServices(Array.isArray(data) ? data.filter((s) => s.is_active === 1) : []);
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

      const res = await fetch("http://localhost:5000/api/appointments/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to book appointment");
      }

      onBooked();
      handleClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to book appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="booking-modal-overlay">
      <div className="booking-modal">
        <div className="booking-modal-header">
          <div>
            <h2>Book Appointment</h2>
            <p>Choose your clinic, service, and preferred schedule.</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleClose}>
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
              onChange={(e) => setPatientPhone(e.target.value)}
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
              ₱{Number(selectedService.price).toFixed(2)} •{" "}
              {selectedService.duration_minutes} mins
            </small>
          </div>
        )}

        <div className="booking-modal-actions">
          <button type="button" className="cancel-btn" onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className="book-btn" onClick={handleSubmit} disabled={submitting}>
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

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  const [actionMessage, setActionMessage] = useState("");

  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "confirmed" | "cancelled" | "completed" | "no_show"
  >("all");
  const [clinicFilter, setClinicFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const userId = 1; // replace with logged-in user ID

  const loadAppointments = async () => {
    try {
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
      .filter((a) => new Date(a.start_at).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );
  }, [validAppointments, now]);

  const pastAppointments = useMemo<Appointment[]>(() => {
    return validAppointments
      .filter((a) => new Date(a.start_at).getTime() < now)
      .sort(
        (a, b) =>
          new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
      );
  }, [validAppointments, now]);

  const allAppointments = useMemo<Appointment[]>(() => {
    return [...validAppointments].sort(
      (a, b) =>
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
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
      const aTime = new Date(a.start_at).getTime();
      const bTime = new Date(b.start_at).getTime();
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });

    return showAllAppointments ? list : list.slice(0, 5);
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

  const openCancelModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelReason("");
    setCancelConfirmOpen(false);
    setCancelOpen(true);
    setActionMessage("");
  };

  const openRescheduleModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);

    if (isValidDate(appointment.start_at)) {
      const start = new Date(appointment.start_at);
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

    setRescheduleOpen(true);
    setActionMessage("");
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    try {
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

      setCancelConfirmOpen(false);
      setCancelOpen(false);
      setSelectedAppointment(null);
      setActionMessage("Appointment cancelled successfully.");
      loadAppointments();
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

      setRescheduleOpen(false);
      setSelectedAppointment(null);
      setActionMessage("Appointment rescheduled successfully.");
      loadAppointments();
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : "Failed to reschedule appointment."
      );
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  return (
    <>
      <div className="appointments-page">
        <div className="appointments-topbar">
          <div>
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
                <select
                  value={clinicFilter}
                  onChange={(e) => setClinicFilter(e.target.value)}
                >
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
              <div className="today-box">
                {loading ? (
                  <p>Loading next appointment...</p>
                ) : error ? (
                  <p>{error}</p>
                ) : nextAppointment ? (
                  <>
                    <p className="today-label">
                      Next Appointment • {formatDate(nextAppointment.start_at)}
                    </p>

                    <div className="today-appointment">
                      <div className="today-time">
                        {formatTime(nextAppointment.start_at)}
                      </div>

                      <div className="today-info">
                        <h4>
                          {nextAppointment.clinic_name_snapshot ||
                            nextAppointment.clinic_name ||
                            "Clinic"}
                        </h4>

                        <p>{nextAppointment.purpose || "Consultation"}</p>

                        <span className={`status ${nextAppointment.status || ""}`}>
                          {nextAppointment.status || "unknown"}
                        </span>

                        <div className="today-location-row">
                          <span>
                            {nextAppointment.address || "Clinic address unavailable"}
                          </span>
                          <a href={`/appointments/${nextAppointment.id}`}>View</a>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p>No upcoming appointment.</p>
                )}
              </div>
            </div>
          </div>

          <div className="center-column">
            <div className="card appointments-card">
              <h2>
                {activeTab === "past"
                  ? "Past Appointments"
                  : activeTab === "all"
                  ? "All Appointments"
                  : "Upcoming Appointments"}
              </h2>

              <small>
                Showing {filteredAppointments.length}{" "}
                {filteredAppointments.length === 1 ? "appointment" : "appointments"}
                {showAllAppointments ? "" : " (max 5 preview)"}
              </small>

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
                        {formatTime(item.start_at)}
                      </div>

                      <div className="appointment-info">
                        <h3>
                          {item.clinic_name_snapshot ||
                            item.clinic_name ||
                            "Clinic"}
                        </h3>

                        <p>{item.purpose || item.specialization || "Consultation"}</p>

                        <div className="clinic-row">
                          <MapPin size={14} />
                          <span>{item.address || "Address unavailable"}</span>
                        </div>

                        {Array.isArray(item.services) && item.services.length > 0 && (
                          <small>
                            Services:{" "}
                            {item.services
                              .map((s) => s.service_name_snapshot)
                              .filter(Boolean)
                              .join(", ")}
                          </small>
                        )}
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

                      <div className="appointment-actions">
                        <button
                          className="mini-action-btn"
                          type="button"
                          disabled={!canEditAppointment(item)}
                          onClick={() => openRescheduleModal(item)}
                        >
                          Reschedule
                        </button>

                        <button
                          className="mini-action-btn danger"
                          type="button"
                          disabled={!canEditAppointment(item)}
                          onClick={() => openCancelModal(item)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="view-all-btn"
                type="button"
                onClick={() => {
                  setActiveTab("all");
                  setShowAllAppointments(true);
                }}
              >
                {showAllAppointments ? "Showing All Appointments" : "View All Appointments →"}
              </button>
            </div>

            <div className="card action-card">
              <div>
                <h3>Need to make a change?</h3>
                <p>Reschedule or cancel your appointment easily.</p>
              </div>

              <div className="change-actions">
                <button
                  className="reschedule-btn"
                  type="button"
                  disabled={!nextAppointment || !canEditAppointment(nextAppointment)}
                  onClick={() => nextAppointment && openRescheduleModal(nextAppointment)}
                >
                  Reschedule
                </button>
                <button
                  className="cancel-btn"
                  type="button"
                  disabled={!nextAppointment || !canEditAppointment(nextAppointment)}
                  onClick={() => nextAppointment && openCancelModal(nextAppointment)}
                >
                  Cancel Appointment
                </button>
              </div>
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
                  <p>Total Appointments</p>
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
                  <p>Cancelled</p>
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
                Regular check-ups help detect health issues early and keep you on
                track for a healthier life.
              </p>
            </div>
          </div>
        </div>
      </div>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onBooked={loadAppointments}
        userId={userId}
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
                onClick={() => {
                  setCancelOpen(false);
                  setCancelConfirmOpen(false);
                }}
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
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setCancelOpen(false);
                  setCancelConfirmOpen(false);
                }}
              >
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
                onClick={() => setRescheduleOpen(false)}
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
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setRescheduleOpen(false)}
              >
                Back
              </button>
              <button
                type="button"
                className="book-btn"
                onClick={handleRescheduleAppointment}
                disabled={rescheduleSubmitting}
              >
                {rescheduleSubmitting ? "Saving..." : "Confirm Reschedule"}
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