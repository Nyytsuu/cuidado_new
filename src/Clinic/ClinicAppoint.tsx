import { useCallback, useEffect, useMemo, useState } from "react";
import "./ClinicAppoint.css";
import SidebarClinic from "./SidebarClinic";
import ClinicScheduleAside from "./ClinicScheduleAside";
import { FaCalendarAlt, FaCheck, FaEye, FaTimes, FaArchive, FaBoxOpen } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

type AppointmentStatus =
  | "Pending"
  | "Confirmed"
  | "Reschedule Requested"
  | "Completed"
  | "Cancelled";

type ApiAppointmentRow = {
  id: number;
  user_id: number;
  clinic_id: number;
  start_at: string;
  end_at: string | null;
  purpose: string | null;
  symptoms: string | null;
  patient_note: string | null;
  clinic_note: string | null;
  status:
    | "pending"
    | "confirmed"
    | "reschedule_requested"
    | "cancelled"
    | "completed"
    | "no_show";
  cancelled_at: string | null;
  cancelled_by: "patient" | "clinic" | "admin" | null;
  cancel_reason: string | null;
  proposed_start_at?: string | null;
  proposed_end_at?: string | null;
  reschedule_reason?: string | null;
  reschedule_requested_by?: string | null;
  reschedule_requested_at?: string | null;
  completed_at: string | null;
  patient_name_snapshot: string | null;
  patient_phone_snapshot: string | null;
  clinic_name_snapshot: string | null;
  created_at: string;
  updated_at: string;
};

type AppointmentRow = {
  id: string;
  patientName: string;
  serviceType: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  startAtRaw: string;
  endAtRaw?: string | null;
  proposedStartAtRaw?: string | null;
  proposedEndAtRaw?: string | null;
  rescheduleReason?: string;
  rescheduleRequestedAt?: string | null;
  symptoms?: string;
  patientNote?: string;
  clinicNote?: string;
  patientPhone?: string;
  cancelReason?: string;
};

type ModalMode = "view" | "reschedule" | null;

type RescheduleForm = {
  date: string;
  time: string;
  reason: string;
};

type DayKey =
  | "Monday" | "Tuesday" | "Wednesday" | "Thursday"
  | "Friday" | "Saturday" | "Sunday";

type ClinicDaySchedule = {
  day: DayKey;
  working: boolean;
  open: string;
  close: string;
};

type ClinicBlockedDate = {
  id: number;
  date: string;
  reason: string;
};

const emptyRescheduleForm: RescheduleForm = {
  date: "",
  time: "",
  reason: "",
};

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

export default function ClinicAppoint() {
  const API = "http://localhost:5000/api";
  const clinicId = useMemo(() => getStoredClinicId(), []);

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "All">("All");
  const [sortColumn, setSortColumn] = useState<"patientName" | "serviceType" | "date" | "status">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showArchived, setShowArchived] = useState(false);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`clinic_archived_${getStoredClinicId()}`);
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentRow | null>(null);
  const [rescheduleForm, setRescheduleForm] =
    useState<RescheduleForm>(emptyRescheduleForm);

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [savingAction, setSavingAction] = useState(false);
  const [rescheduleSuccessOpen, setRescheduleSuccessOpen] = useState(false);

  /* ── confirm / reject guard modals ── */
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen]   = useState(false);
  const [pendingActionRow, setPendingActionRow]  = useState<AppointmentRow | null>(null);
  const [rejectReason, setRejectReason]          = useState("");

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);

  /* ── clinic schedule (used to validate reschedule times) ── */
  const [clinicSchedule, setClinicSchedule] = useState<ClinicDaySchedule[]>([]);
  const [clinicBlockedDates, setClinicBlockedDates] = useState<ClinicBlockedDate[]>([]);

  const navigate = useNavigate();

  const mapDbStatusToUi = (
    status: ApiAppointmentRow["status"]
  ): AppointmentStatus => {
    switch (status) {
      case "pending":
        return "Pending";
      case "confirmed":
        return "Confirmed";
      case "reschedule_requested":
        return "Reschedule Requested";
      case "completed":
        return "Completed";
      case "cancelled":
      case "no_show":
        return "Cancelled";
      default:
        return "Pending";
    }
  };

  const formatDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";

    return d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  };

  const formatTime = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";

    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const toDatetimeLocalString = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const tzOffset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const toMysqlDatetime = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds()
    )}`;
  };

  const getRescheduleDuration = (row: AppointmentRow) => {
    const fallbackDuration = 30 * 60 * 1000;
    const oldStart = new Date(row.startAtRaw).getTime();
    const oldEnd = row.endAtRaw ? new Date(row.endAtRaw).getTime() : NaN;

    if (
      Number.isFinite(oldStart) &&
      Number.isFinite(oldEnd) &&
      oldEnd > oldStart
    ) {
      return oldEnd - oldStart;
    }

    return fallbackDuration;
  };

  const loadAppointments = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingAppointments(true);

      const res = await fetch(
        `${API}/clinic/appointments?clinic_id=${clinicId}`
      );

      if (!res.ok) {
        const raw = await res.text();
        throw new Error(`HTTP ${res.status} - ${raw}`);
      }

      const data = await res.json();

      const normalized: AppointmentRow[] = Array.isArray(data)
        ? data.map((item: ApiAppointmentRow) => ({
            id: String(item.id),
            patientName: item.patient_name_snapshot || "Unknown Patient",
            serviceType: item.purpose || "General Consultation",
            date: formatDate(item.start_at),
            time: formatTime(item.start_at),
            status: mapDbStatusToUi(item.status),
            startAtRaw: item.start_at,
            endAtRaw: item.end_at,
            proposedStartAtRaw: item.proposed_start_at || null,
            proposedEndAtRaw: item.proposed_end_at || null,
            rescheduleReason: item.reschedule_reason || "",
            rescheduleRequestedAt: item.reschedule_requested_at || null,
            symptoms: item.symptoms || "",
            patientNote: item.patient_note || "",
            clinicNote: item.clinic_note || "",
            patientPhone: item.patient_phone_snapshot || "",
            cancelReason: item.cancel_reason || "",
          }))
        : [];

      setAppointments(normalized);
    } catch (error) {
      console.error("Load appointments error:", error);
      if (!silent) setAppointments([]);
    } finally {
      if (!silent) setLoadingAppointments(false);
    }
  }, [API, clinicId]);

  useEffect(() => {
    loadAppointments();
    const interval = setInterval(() => loadAppointments(true), 30_000);
    return () => clearInterval(interval);
  }, [loadAppointments]);

  /* Fetch clinic schedule once so we can validate reschedule times client-side */
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch(`${API}/clinic/schedule?clinic_id=${clinicId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.schedule))     setClinicSchedule(data.schedule);
        if (Array.isArray(data.blockedDates)) setClinicBlockedDates(data.blockedDates);
      } catch {
        // fail silently — backend will still validate on submit
      }
    };
    fetchSchedule();
  }, [API, clinicId]);

  const statusClass = (status: AppointmentStatus) => {
    switch (status) {
      case "Pending":
        return "pill-warning";
      case "Confirmed":
        return "pill-success";
      case "Reschedule Requested":
        return "pill-resched";
      case "Completed":
        return "pill-gray";
      case "Cancelled":
        return "pill-danger";
      default:
        return "";
    }
  };

  const handleSort = (col: typeof sortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const sortArrow = (col: typeof sortColumn) => {
    if (sortColumn !== col) return <span className="sort-arrow inactive">↕</span>;
    return <span className="sort-arrow active">{sortDirection === "asc" ? "↑" : "↓"}</span>;
  };

  const rowHighlightClass = (status: AppointmentStatus) => {
    switch (status) {
      case "Pending":              return "row-hl-pending";
      case "Reschedule Requested": return "row-hl-reschedule";
      case "Confirmed":            return "row-hl-confirmed";
      case "Completed":            return "row-hl-completed";
      case "Cancelled":            return "row-hl-cancelled";
      default:                     return "";
    }
  };

  const archiveAppointment = (id: string) => {
    setArchivedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(`clinic_archived_${clinicId}`, JSON.stringify([...next]));
      return next;
    });
  };

  const unarchiveAppointment = (id: string) => {
    setArchivedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      localStorage.setItem(`clinic_archived_${clinicId}`, JSON.stringify([...next]));
      return next;
    });
  };

  const openViewModal = (row: AppointmentRow) => {
    setSelectedAppointment(row);
    setModalMode("view");
    setIsPopupOpen(true);
  };

  const openRescheduleModal = (row: AppointmentRow) => {
    setSelectedAppointment(row);

    const localValue = toDatetimeLocalString(
      row.proposedStartAtRaw || row.startAtRaw
    );
    const [datePart, timePart] = localValue.split("T");

    setRescheduleForm({
      date: datePart || "",
      time: timePart || "",
      reason: row.rescheduleReason || "",
    });

    setModalMode("reschedule");
    setIsPopupOpen(true);
  };

  const closeModal = () => {
    if (savingAction) return;
    setIsPopupOpen(false);
    setModalMode(null);
    setSelectedAppointment(null);
    setRescheduleForm(emptyRescheduleForm);
  };

  const updateAppointmentStatus = async (
    id: string,
    status: "confirmed" | "cancelled" | "completed"
  ) => {
    try {
      setSavingAction(true);

      const res = await fetch(`${API}/clinic/appointments/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          cancelled_by: status === "cancelled" ? "clinic" : null,
        }),
      });

      const raw = await res.text();
      console.log("Update appointment status:", res.status, raw);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} - ${raw}`);
      }

      await loadAppointments(true);

      if (selectedAppointment?.id === id) {
        const updated = appointments.find((a) => a.id === id);
        if (updated) {
          setSelectedAppointment(updated);
        }
      }
    } catch (error) {
      console.error("Update appointment status error:", error);
      alert(`Failed to update appointment: ${String(error)}`);
    } finally {
      setSavingAction(false);
    }
  };

  /* open guard modals */
  const handleConfirm = (id: string) => {
    const row = appointments.find((a) => a.id === id) ?? null;
    setPendingActionRow(row);
    setConfirmModalOpen(true);
  };

  const handleReject = (id: string) => {
    const row = appointments.find((a) => a.id === id) ?? null;
    setPendingActionRow(row);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  /* actual API calls after confirmation */
  const doConfirm = async () => {
    if (!pendingActionRow) return;
    setConfirmModalOpen(false);
    await updateAppointmentStatus(pendingActionRow.id, "confirmed");
    setPendingActionRow(null);
  };

  const doReject = async () => {
    if (!pendingActionRow) return;
    setRejectModalOpen(false);
    try {
      setSavingAction(true);
      const res = await fetch(`${API}/clinic/appointments/${pendingActionRow.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          cancelled_by: "clinic",
          cancel_reason: rejectReason.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadAppointments(true);
    } catch (error) {
      console.error("Reject appointment error:", error);
      alert(`Failed to reject appointment: ${String(error)}`);
    } finally {
      setSavingAction(false);
      setPendingActionRow(null);
      setRejectReason("");
    }
  };

  const handleComplete = async (id: string) => {
    await updateAppointmentStatus(id, "completed");
  };

  const handleRescheduleSave = async () => {
    if (!selectedAppointment) return;

    if (!rescheduleForm.date || !rescheduleForm.time) {
      alert("Please enter both date and time.");
      return;
    }

    if (rescheduleError) {
      alert(rescheduleError);
      return;
    }

    const startDate = new Date(
      `${rescheduleForm.date}T${rescheduleForm.time}:00`
    );

    if (Number.isNaN(startDate.getTime())) {
      alert("Please enter a valid appointment date and time.");
      return;
    }

    const endDate = new Date(
      startDate.getTime() + getRescheduleDuration(selectedAppointment)
    );
    const startAt = toMysqlDatetime(startDate);
    const endAt = toMysqlDatetime(endDate);

    try {
      setSavingAction(true);

      const res = await fetch(
        `${API}/clinic/appointments/${selectedAppointment.id}/reschedule`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clinic_id: clinicId,
            start_at: startAt,
            end_at: endAt,
            reason:
              rescheduleForm.reason.trim() ||
              "Clinic requested a new schedule",
          }),
        }
      );

      const raw = await res.text();
      console.log("Reschedule appointment:", res.status, raw);

      if (!res.ok) {
        let message = raw;
        try {
          message = JSON.parse(raw)?.message || raw;
        } catch {
          message = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        }

        throw new Error(message || `HTTP ${res.status}`);
      }

      await loadAppointments(true);
      closeModal();
      setRescheduleSuccessOpen(true);
    } catch (error) {
      console.error("Reschedule error:", error);
      alert(`Failed to reschedule appointment: ${String(error)}`);
    } finally {
      setSavingAction(false);
    }
  };

  /* Real-time validation for the reschedule form */
  const rescheduleError = useMemo(() => {
    const { date, time } = rescheduleForm;
    if (!date || !time) return "";

    const selectedDT = new Date(`${date}T${time}:00`);
    if (Number.isNaN(selectedDT.getTime())) return "Invalid date or time.";
    if (selectedDT.getTime() <= Date.now()) return "Please choose a future date and time.";

    // Blocked date check
    if (clinicBlockedDates.some((bd) => bd.date === date)) {
      return "This date is blocked on your schedule. Please choose another day.";
    }

    // Day-of-week schedule check
    const dayName = selectedDT.toLocaleDateString("en-US", { weekday: "long" }) as DayKey;
    const day = clinicSchedule.find((s) => s.day === dayName);

    if (day) {
      if (!day.working) {
        return `Your clinic is closed on ${dayName}. Please choose another day.`;
      }

      // Normalise to "HH:MM" (handle "HH:MM:SS" format from DB)
      const toMin = (t: string) => {
        const parts = String(t || "").slice(0, 5).split(":").map(Number);
        return (parts[0] || 0) * 60 + (parts[1] || 0);
      };

      if (day.open && day.close) {
        const durationMs = selectedAppointment
          ? getRescheduleDuration(selectedAppointment)
          : 30 * 60 * 1000;
        const startMin = toMin(time);
        const endMin   = startMin + Math.round(durationMs / 60000);
        const openMin  = toMin(day.open);
        const closeMin = toMin(day.close);

        if (startMin < openMin || endMin > closeMin) {
          return `Outside clinic hours for ${dayName} (${day.open.slice(0, 5)}–${day.close.slice(0, 5)}). Please choose a time within opening hours.`;
        }
      }
    }

    return "";
  }, [rescheduleForm, clinicSchedule, clinicBlockedDates, selectedAppointment]);

  const archivedCount = useMemo(
    () => appointments.filter((r) => archivedIds.has(r.id)).length,
    [appointments, archivedIds]
  );

  const filteredAppointments = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    // Split into archived vs active view
    let list = showArchived
      ? appointments.filter((r) => archivedIds.has(r.id))
      : appointments.filter((r) => !archivedIds.has(r.id));

    if (keyword) {
      list = list.filter(
        (row) =>
          row.patientName.toLowerCase().includes(keyword) ||
          row.serviceType.toLowerCase().includes(keyword) ||
          row.date.toLowerCase().includes(keyword) ||
          row.time.toLowerCase().includes(keyword) ||
          row.status.toLowerCase().includes(keyword)
      );
    }

    if (!showArchived && statusFilter !== "All") {
      list = list.filter((row) => row.status === statusFilter);
    }

    const statusOrder: Record<AppointmentStatus, number> = {
      "Pending": 0,
      "Reschedule Requested": 1,
      "Confirmed": 2,
      "Completed": 3,
      "Cancelled": 4,
    };

    list.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortColumn === "date") {
        aVal = new Date(a.startAtRaw).getTime();
        bVal = new Date(b.startAtRaw).getTime();
      } else if (sortColumn === "status") {
        aVal = statusOrder[a.status] ?? 99;
        bVal = statusOrder[b.status] ?? 99;
      } else {
        aVal = (a[sortColumn] || "").toLowerCase();
        bVal = (b[sortColumn] || "").toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [appointments, searchTerm, statusFilter, sortColumn, sortDirection, archivedIds, showArchived]);

  return (
    <div
      className={`ClinicAppoint with-sidebar ${
        sidebarExpanded ? "sidebar-expanded" : ""
      } ${
        isPopupOpen ? "modal-open" : ""
      }`}
    >
      <SidebarClinic
              sidebarExpanded={sidebarExpanded}
              setSidebarExpanded={setSidebarExpanded}
              profileOpen={profileOpen}
              setProfileOpen={setProfileOpen}
              headerProfileOpen={headerProfileOpen}
              setHeaderProfileOpen={setHeaderProfileOpen}
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search dashboard..."
            />
      <main className="preview-canvas">
        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="admin-title">
              <h2>Appointments</h2>
            </div>
            <div className="admin-grid">
              <section className="admin-card admin-table-card">
                <div className="appoint-toolbar">
                  {!showArchived && (
                    <div className="appoint-filter-pills">
                      {(["All", "Pending", "Reschedule Requested", "Confirmed", "Completed", "Cancelled"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`appoint-filter-pill ${statusFilter === s ? "active" : ""} ${s !== "All" ? statusClass(s as AppointmentStatus) : ""}`}
                          onClick={() => setStatusFilter(s)}
                        >
                          {s}
                          {s !== "All" && (
                            <span className="appoint-filter-count">
                              {appointments.filter((r) => r.status === s && !archivedIds.has(r.id)).length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {showArchived && (
                    <div className="appoint-archive-banner">
                      <FaArchive />
                      <span>Showing archived cancelled appointments — hidden from the main list</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className={`appoint-archive-toggle ${showArchived ? "active" : ""}`}
                    onClick={() => setShowArchived((v) => !v)}
                  >
                    {showArchived ? <><FaBoxOpen /> Exit Archive</> : <><FaArchive /> Archived {archivedCount > 0 && <span className="appoint-filter-count">{archivedCount}</span>}</>}
                  </button>
                </div>

                <div className="users-table">
                  <div className="users-row users-header">
                    <button type="button" className="users-cell sort-header" onClick={() => handleSort("patientName")}>
                      Patient Name {sortArrow("patientName")}
                    </button>
                    <button type="button" className="users-cell sort-header" onClick={() => handleSort("serviceType")}>
                      Service Type {sortArrow("serviceType")}
                    </button>
                    <button type="button" className="users-cell sort-header" onClick={() => handleSort("date")}>
                      Date {sortArrow("date")}
                    </button>
                    <div className="users-cell">Time</div>
                    <button type="button" className="users-cell sort-header" onClick={() => handleSort("status")}>
                      Status {sortArrow("status")}
                    </button>
                    <div className="users-cell">Actions</div>
                  </div>

                  {loadingAppointments ? (
                    <div className="users-row">
                      <div
                        className="users-cell"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        Loading appointments...
                      </div>
                    </div>
                  ) : filteredAppointments.length === 0 ? (
                    <div className="users-row">
                      <div
                        className="users-cell"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        No appointments found.
                      </div>
                    </div>
                  ) : (
                    filteredAppointments.map((row) => (
                      <div className={`users-row ${rowHighlightClass(row.status)}`} key={row.id}>
                        <div className="users-cell users-name">
                          {row.patientName}
                        </div>

                        <div className="users-cell">
                          <span className="pills">{row.serviceType}</span>
                        </div>

                        <div className="users-cell">
                          <span className="pills">{row.date}</span>
                        </div>

                        <div className="users-cell">
                          <span className="pills">{row.time}</span>
                        </div>

                        <div className="users-cell">
                          <span className={`pill ${statusClass(row.status)}`}>
                            {row.status}
                          </span>
                        </div>

                        <div className="users-cell">
                          

<div className="users-actions">
  {row.status === "Cancelled" || row.status === "Completed" ? (
    <>
      <button
        type="button"
        className="icon-btn pill-view"
        onClick={() => openViewModal(row)}
      >
        <FaEye />
      </button>
      {row.status === "Cancelled" && (
        archivedIds.has(row.id) ? (
          <button
            type="button"
            className="icon-btn pill-restore"
            title="Restore from archive"
            onClick={() => unarchiveAppointment(row.id)}
          >
            <FaBoxOpen />
          </button>
        ) : (
          <button
            type="button"
            className="icon-btn pill-archive"
            title="Archive"
            onClick={() => archiveAppointment(row.id)}
          >
            <FaArchive />
          </button>
        )
      )}
    </>
  ) : (
    <>
      <button
        type="button"
        className="icon-btn pill-view"
        title="View"
        onClick={() => openViewModal(row)}
      >
        <FaEye />
      </button>

      {row.status === "Pending" && (
        <>
          <button
            type="button"
            className="icon-btn pill-success"
            title="Confirm"
            onClick={() => handleConfirm(row.id)}
          >
            <FaCheck />
          </button>

          <button
            type="button"
            className="icon-btn pill-danger"
            title="Reject"
            onClick={() => handleReject(row.id)}
          >
            <FaTimes />
          </button>
        </>
      )}

      {(row.status === "Pending" ||
        row.status === "Confirmed" ||
        row.status === "Reschedule Requested") && (
        <button
          type="button"
          className="icon-btn pill-resched"
          title="Reschedule"
          onClick={() => openRescheduleModal(row)}
        >
           <FaCalendarAlt />
        </button>
      )}

      {row.status === "Confirmed" && (
        <button
          type="button"
          className="icon-btn pill-done"
          title="Mark Done"
          onClick={() => handleComplete(row.id)}
        >
          <FaCheck />
        </button>
      )}
    </>
  )}
</div>
                          </div>
                        </div>
                    ))
                  )}
                </div>
              </section>

              <ClinicScheduleAside apiBase={API} clinicId={clinicId} />
            </div>
          </div>
        </section>
      </main>

      {isPopupOpen && selectedAppointment && (
        <div className="appoint-modal-overlay" onClick={closeModal}>
          <div
            className={`appoint-modal ${
              modalMode === "view" ? "appoint-view-modal" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="appoint-modal-header">
              <div className="appoint-modal-title">
                <span className="appoint-modal-mark">
                  {modalMode === "view" ? "i" : "R"}
                </span>
                <div>
                  <p>{modalMode === "view" ? "Clinic appointment" : "Schedule change"}</p>
                  <h3>
                    {modalMode === "view"
                      ? "Appointment Details"
                      : "Reschedule Appointment"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                className="appoint-modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className="appoint-modal-body">
              {modalMode === "view" && (
                <div className="appoint-details appoint-details-polished">
                  <section className="appoint-patient-hero">
                    <div className="appoint-patient-avatar">
                      {selectedAppointment.patientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="appoint-patient-copy">
                      <span>Patient</span>
                      <h4>{selectedAppointment.patientName}</h4>
                      <p>{selectedAppointment.patientPhone || "No phone provided"}</p>
                    </div>
                    <span className={`pill ${statusClass(selectedAppointment.status)}`}>
                      {selectedAppointment.status}
                    </span>
                  </section>

                  <section className="appoint-detail-grid">
                    <article className="appoint-info-card">
                      <span>Service</span>
                      <strong>{selectedAppointment.serviceType}</strong>
                    </article>
                    <article className="appoint-info-card">
                      <span>Date</span>
                      <strong>{selectedAppointment.date}</strong>
                    </article>
                    <article className="appoint-info-card">
                      <span>Time</span>
                      <strong>{selectedAppointment.time}</strong>
                    </article>
                  </section>

                  {selectedAppointment.status === "Reschedule Requested" && (
                    <section className="appoint-reschedule-card">
                      <span>Clinic proposed a new schedule</span>
                      <strong>
                        {selectedAppointment.proposedStartAtRaw
                          ? `${formatDate(selectedAppointment.proposedStartAtRaw)} at ${formatTime(
                              selectedAppointment.proposedStartAtRaw
                            )}`
                          : "No proposed schedule provided"}
                      </strong>
                      <p>{selectedAppointment.rescheduleReason || "No reason provided."}</p>
                    </section>
                  )}

                  <section className="appoint-notes-grid">
                    <article className="appoint-note-card">
                      <span>Symptoms</span>
                      <p>{selectedAppointment.symptoms || "No symptoms provided."}</p>
                    </article>
                    <article className="appoint-note-card">
                      <span>Patient Note</span>
                      <p>{selectedAppointment.patientNote || "No patient note provided."}</p>
                    </article>
                    <article className="appoint-note-card">
                      <span>Clinic Note</span>
                      <p>{selectedAppointment.clinicNote || "No clinic note added."}</p>
                    </article>
                  </section>
                </div>
              )}

              {modalMode === "reschedule" && (
                <div className="appoint-form">
                  <div className="form-group">
                    <label>Patient Name</label>
                    <input
                      type="text"
                      value={selectedAppointment.patientName}
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label>Service Type</label>
                    <input
                      type="text"
                      value={selectedAppointment.serviceType}
                      disabled
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Date</label>
                      <input
                        type="date"
                        value={rescheduleForm.date}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) =>
                          setRescheduleForm((prev) => ({
                            ...prev,
                            date: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label>Time</label>
                      <input
                        type="time"
                        value={rescheduleForm.time}
                        onChange={(e) =>
                          setRescheduleForm((prev) => ({
                            ...prev,
                            time: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {rescheduleError && (
                    <p className="appoint-reschedule-error">{rescheduleError}</p>
                  )}

                  <div className="form-group">
                    <label>Message for patient</label>
                    <textarea
                      value={rescheduleForm.reason}
                      onChange={(e) =>
                        setRescheduleForm((prev) => ({
                          ...prev,
                          reason: e.target.value,
                        }))
                      }
                      placeholder="Example: Doctor is unavailable at the original time."
                      rows={3}
                    />
                  </div>

                  <p className="appoint-form-note">
                    This sends a request. The appointment time will only change
                    after the patient accepts it.
                  </p>
                </div>
              )}
            </div>

            <div className="appoint-modal-footer">
              {modalMode === "view" ? (
                <>
                  <button
                    type="button"
                    className="pill pill-gray"
                    onClick={closeModal}
                  >
                    Close
                  </button>

                  {(selectedAppointment.status === "Pending" ||
                    selectedAppointment.status === "Confirmed" ||
                    selectedAppointment.status === "Reschedule Requested") && (
                    <button
                      type="button"
                      className="pill pill-resched"
                      onClick={() => openRescheduleModal(selectedAppointment)}
                    >
                      Reschedule
                    </button>
                  )}

                  {selectedAppointment.status === "Confirmed" && (
                    <button
                      type="button"
                      className="pill pill-done"
                      onClick={() => handleComplete(selectedAppointment.id)}
                      disabled={savingAction}
                    >
                      Mark Done
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="pill pill-gray and-danger"
                    onClick={closeModal}
                    disabled={savingAction}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pill pill-success"
                    onClick={handleRescheduleSave}
                    disabled={savingAction || Boolean(rescheduleError)}
                    title={rescheduleError || undefined}
                  >
                    {savingAction ? "Sending..." : "Send Request"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM GUARD MODAL ── */}
      {confirmModalOpen && pendingActionRow && (
        <div className="appoint-modal-overlay" onClick={() => setConfirmModalOpen(false)}>
          <div className="appoint-guard-modal" onClick={(e) => e.stopPropagation()}>
            <div className="guard-modal-icon guard-icon-confirm">✓</div>
            <h3>Confirm Appointment?</h3>
            <p className="guard-modal-sub">You are about to confirm the following appointment:</p>

            <div className="guard-patient-card">
              <div className="guard-patient-avatar">
                {pendingActionRow.patientName.charAt(0).toUpperCase()}
              </div>
              <div className="guard-patient-info">
                <strong>{pendingActionRow.patientName}</strong>
                <span>{pendingActionRow.patientPhone || "No phone provided"}</span>
              </div>
            </div>

            <div className="guard-detail-grid">
              <div className="guard-detail-item">
                <span>Service</span>
                <strong>{pendingActionRow.serviceType}</strong>
              </div>
              <div className="guard-detail-item">
                <span>Date</span>
                <strong>{pendingActionRow.date}</strong>
              </div>
              <div className="guard-detail-item">
                <span>Time</span>
                <strong>{pendingActionRow.time}</strong>
              </div>
            </div>

            <div className="guard-modal-actions">
              <button
                type="button"
                className="pill pill-gray"
                onClick={() => { setConfirmModalOpen(false); setPendingActionRow(null); }}
                disabled={savingAction}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pill pill-success"
                onClick={doConfirm}
                disabled={savingAction}
              >
                {savingAction ? "Confirming…" : "Yes, Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT GUARD MODAL ── */}
      {rejectModalOpen && pendingActionRow && (
        <div className="appoint-modal-overlay" onClick={() => setRejectModalOpen(false)}>
          <div className="appoint-guard-modal" onClick={(e) => e.stopPropagation()}>
            <div className="guard-modal-icon guard-icon-reject">✕</div>
            <h3>Reject Appointment?</h3>
            <p className="guard-modal-sub">This will cancel the appointment for:</p>

            <div className="guard-patient-card">
              <div className="guard-patient-avatar guard-avatar-danger">
                {pendingActionRow.patientName.charAt(0).toUpperCase()}
              </div>
              <div className="guard-patient-info">
                <strong>{pendingActionRow.patientName}</strong>
                <span>{pendingActionRow.patientPhone || "No phone provided"}</span>
              </div>
            </div>

            <div className="guard-detail-grid">
              <div className="guard-detail-item">
                <span>Service</span>
                <strong>{pendingActionRow.serviceType}</strong>
              </div>
              <div className="guard-detail-item">
                <span>Date</span>
                <strong>{pendingActionRow.date}</strong>
              </div>
              <div className="guard-detail-item">
                <span>Time</span>
                <strong>{pendingActionRow.time}</strong>
              </div>
            </div>

            <div className="guard-reason-group">
              <label>Reason for rejection <span>(optional)</span></label>
              <textarea
                rows={3}
                placeholder="E.g. Doctor unavailable, slot fully booked…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <div className="guard-modal-actions">
              <button
                type="button"
                className="pill pill-gray"
                onClick={() => { setRejectModalOpen(false); setPendingActionRow(null); setRejectReason(""); }}
                disabled={savingAction}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pill pill-danger"
                onClick={doReject}
                disabled={savingAction}
              >
                {savingAction ? "Rejecting…" : "Yes, Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleSuccessOpen && (
        <div className="appoint-modal-overlay success-overlay">
          <div className="appoint-success-modal" role="dialog" aria-modal="true">
            <div className="appoint-success-icon">OK</div>
            <h3>Request Sent</h3>
            <p>
              The patient has been notified. The appointment time will update
              only after they accept the proposed schedule.
            </p>
            <button
              type="button"
              className="pill pill-success"
              onClick={() => setRescheduleSuccessOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* logout */}
{showLogoutConfirm && (
  <div className="logout-confirm-overlay">
    <div className="logout-confirm-modal">
      <h3>Log out?</h3>
      <p>Are you sure you want to log out of your account?</p>

      <div className="logout-actions">
        <button
          className="btn-cancel"
          onClick={() => setShowLogoutConfirm(false)}
        >
          Cancel
        </button>

        <button
          className="btn-confirm"
          onClick={() => {
            setShowLogoutConfirm(false);
            setShowLogoutSuccess(true);

            setTimeout(() => {
              navigate("/signin");
            }, 1500);
          }}
        >
          Logout
        </button>
      </div>
    </div>
  </div>
)}


{showLogoutSuccess && (
  <div className="logout-popup-overlay">
    <div className="logout-popup">
      <div className="logout-icon">✓</div>
      <h3>Logged out successfully</h3>
    </div>
  </div>
)}
    </div>
  );
}
