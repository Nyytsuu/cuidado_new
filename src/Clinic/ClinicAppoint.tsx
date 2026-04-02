import { useEffect, useMemo, useState } from "react";
import "./ClinicAppoint.css";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";
import SidebarClinic from "./SidebarClinic";
import ClinicScheduleAside from "./ClinicScheduleAside";
import { FaCalendarAlt } from "react-icons/fa";
import { FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

type AppointmentStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

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
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  cancelled_at: string | null;
  cancelled_by: "patient" | "clinic" | "admin" | null;
  cancel_reason: string | null;
  completed_at: string | null;
  patient_name_snapshot: string | null;
  patient_phone_snapshot: string | null;
  clinic_name_snapshot: string | null;
  created_at: string;
  updated_at: string;
};

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
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  cancelled_at: string | null;
  cancelled_by: "patient" | "clinic" | "admin" | null;
  cancel_reason: string | null;
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
  date: string;
  time: string;
  status: AppointmentStatus;
  startAtRaw: string;
  endAtRaw?: string | null;
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
};

const emptyRescheduleForm: RescheduleForm = {
  date: "",
  time: "",
};

export default function ClinicAppoint() {
  const API = "http://localhost:5000/api";
  const clinicId = 1; // replace with logged-in clinic id

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentRow | null>(null);
  const [rescheduleForm, setRescheduleForm] =
    useState<RescheduleForm>(emptyRescheduleForm);

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [savingAction, setSavingAction] = useState(false);

  const mapDbStatusToUi = (
    status: ApiAppointmentRow["status"]
  ): AppointmentStatus => {
    switch (status) {
      case "pending":
        return "Pending";
      case "confirmed":
        return "Confirmed";
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

  const fromDateAndTimeToIso = (date: string, time: string) => {
    const combined = new Date(`${date} ${time}`);
    if (Number.isNaN(combined.getTime())) return null;
    return combined.toISOString().slice(0, 19).replace("T", " ");
  };

  const loadAppointments = async () => {
    try {
      setLoadingAppointments(true);

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
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [clinicId]);

  const statusClass = (status: AppointmentStatus) => {
    switch (status) {
      case "Pending":
        return "pill-warning";
      case "Confirmed":
        return "pill-success";
      case "Completed":
        return "pill-gray";
      case "Cancelled":
        return "pill-danger";
      default:
        return "";
    }
  };

  const openViewModal = (row: AppointmentRow) => {
    setSelectedAppointment(row);
    setModalMode("view");
    setIsPopupOpen(true);
  };

  const openRescheduleModal = (row: AppointmentRow) => {
    setSelectedAppointment(row);

    const localValue = toDatetimeLocalString(row.startAtRaw);
    const [datePart, timePart] = localValue.split("T");

    setRescheduleForm({
      date: datePart || "",
      time: timePart || "",
    });

    setModalMode("reschedule");
    setIsPopupOpen(true);
  const openViewModal = (row: AppointmentRow) => {
    setSelectedAppointment(row);
    setModalMode("view");
    setIsPopupOpen(true);
  };

  const openRescheduleModal = (row: AppointmentRow) => {
    setSelectedAppointment(row);

    const localValue = toDatetimeLocalString(row.startAtRaw);
    const [datePart, timePart] = localValue.split("T");

    setRescheduleForm({
      date: datePart || "",
      time: timePart || "",
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

      await loadAppointments();

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

      await loadAppointments();

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

  const handleConfirm = async (id: string) => {
    await updateAppointmentStatus(id, "confirmed");
  };

  const handleReject = async (id: string) => {
    await updateAppointmentStatus(id, "cancelled");
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

    const startAt = `${rescheduleForm.date} ${rescheduleForm.time}:00`;

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
            start_at: startAt,
          }),
        }
      );

      const raw = await res.text();
      console.log("Reschedule appointment:", res.status, raw);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} - ${raw}`);
      }

      await loadAppointments();
      closeModal();
    } catch (error) {
      console.error("Reschedule error:", error);
      alert(`Failed to reschedule appointment: ${String(error)}`);
    } finally {
      setSavingAction(false);
    }
  const handleConfirm = async (id: string) => {
    await updateAppointmentStatus(id, "confirmed");
  };

  const handleReject = async (id: string) => {
    await updateAppointmentStatus(id, "cancelled");
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

    const startAt = `${rescheduleForm.date} ${rescheduleForm.time}:00`;

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
            start_at: startAt,
          }),
        }
      );

      const raw = await res.text();
      console.log("Reschedule appointment:", res.status, raw);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} - ${raw}`);
      }

      await loadAppointments();
      closeModal();
    } catch (error) {
      console.error("Reschedule error:", error);
      alert(`Failed to reschedule appointment: ${String(error)}`);
    } finally {
      setSavingAction(false);
    }
  };

  const filteredAppointments = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return appointments;

    return appointments.filter(
      (row) =>
        row.patientName.toLowerCase().includes(keyword) ||
        row.serviceType.toLowerCase().includes(keyword) ||
        row.date.toLowerCase().includes(keyword) ||
        row.time.toLowerCase().includes(keyword) ||
        row.status.toLowerCase().includes(keyword)
    );
  }, [appointments, searchTerm]);
  const filteredAppointments = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return appointments;

    return appointments.filter(
      (row) =>
        row.patientName.toLowerCase().includes(keyword) ||
        row.serviceType.toLowerCase().includes(keyword) ||
        row.date.toLowerCase().includes(keyword) ||
        row.time.toLowerCase().includes(keyword) ||
        row.status.toLowerCase().includes(keyword)
    );
  }, [appointments, searchTerm]);

  return (
    <div
      className={`ClinicAppoint with-sidebar ${
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
        <header className="app-header">
          <div className="header-left">
            <img src={logo} alt="CUIDADO logo" className="brand-logo" />

            <div className="header-search">
              <input
                type="text"
                placeholder="Search keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
              Appointments
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

        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="admin-title">
              <h2>Appointments</h2>
            </div>
            <div className="admin-grid">
              <section className="admin-card admin-table-card">
                <div className="users-table">
                  <div className="users-row users-header">
                    <div className="users-cell">Patient Name</div>
                    <div className="users-cell">Service Type</div>
                    <div className="users-cell">Date</div>
                    <div className="users-cell">Time</div>
                    <div className="users-cell">Status</div>
                    <div className="users-cell">Actions:</div>
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
                      <div className="users-row" key={row.id}>
                        <div className="users-cell users-name">
                          {row.patientName}
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
                      <div className="users-row" key={row.id}>
                        <div className="users-cell users-name">
                          {row.patientName}
                        </div>

                        <div className="users-cell">
                          <span className="pills">{row.serviceType}</span>
                        </div>
                        <div className="users-cell">
                          <span className="pills">{row.serviceType}</span>
                        </div>

                        <div className="users-cell">
                          <span className="pills">{row.date}</span>
                        </div>
                        <div className="users-cell">
                          <span className="pills">{row.date}</span>
                        </div>

                        <div className="users-cell">
                          <span className="pills">{row.time}</span>
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
                          <span className={`pill ${statusClass(row.status)}`}>
                            {row.status}
                          </span>
                        </div>

                        <div className="users-cell">
                          <div className="users-actions">
                            <button
                              type="button"
                              className="pill pill-view"
                              onClick={() => openViewModal(row)}
                            >
                              View
                            </button>

                            {row.status === "Pending" && (
                              <>
                                <button
                                  type="button"
                                  className="pill pill-success"
                                  onClick={() => handleConfirm(row.id)}
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  className="pill pill-danger"
                                  onClick={() => handleReject(row.id)}
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {(row.status === "Pending" ||
                              row.status === "Confirmed") && (
                              <button
                                type="button"
                                className="pill pill-resched"
                                onClick={() => openRescheduleModal(row)}
                              >
                                Reschedule
                              </button>
                            )}

                            {row.status === "Confirmed" && (
                              <button
                                type="button"
                                className="pill pill-gray"
                                onClick={() => handleComplete(row.id)}
                              >
                                Mark Done
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <aside className="admin-right">
                <div className="admin-card admin-right-card small-card">
                  <h3>Appointment Tips</h3>
                  <p>Use View to check details and Reschedule to update date and time.</p>
                </div>

                <div className="admin-card admin-right-card big-card">
                  <h3>Note</h3>
                  <p>Pending appointments can be confirmed, rejected, or rescheduled.</p>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      {isPopupOpen && selectedAppointment && (
        <div className="appoint-modal-overlay" onClick={closeModal}>
          <div className="appoint-modal" onClick={(e) => e.stopPropagation()}>
            <div className="appoint-modal-header">
              <h3>
                {modalMode === "view"
                  ? "Appointment Details"
                  : "Reschedule Appointment"}
              </h3>
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
                <div className="appoint-details">
                  <div className="appoint-detail-row">
                    <strong>Patient Name:</strong>
                    <span>{selectedAppointment.patientName}</span>
                  </div>

                  <div className="appoint-detail-row">
                    <strong>Phone:</strong>
                    <span>{selectedAppointment.patientPhone || "—"}</span>
                  </div>

                  <div className="appoint-detail-row">
                    <strong>Service Type:</strong>
                    <span>{selectedAppointment.serviceType}</span>
                  </div>

                  <div className="appoint-detail-row">
                    <strong>Date:</strong>
                    <span>{selectedAppointment.date}</span>
                  </div>

                  <div className="appoint-detail-row">
                    <strong>Time:</strong>
                    <span>{selectedAppointment.time}</span>
                  </div>

                  <div className="appoint-detail-row">
                    <strong>Status:</strong>
                    <span
                      className={`pill ${statusClass(selectedAppointment.status)}`}
                    >
                      {selectedAppointment.status}
                    </span>
                  </div>

                  <div className="appoint-detail-row">
                    <strong>Symptoms:</strong>
                    <span>{selectedAppointment.symptoms || "—"}</span>
                  </div>

                  <div className="appoint-detail-row">
                    <strong>Patient Note:</strong>
                    <span>{selectedAppointment.patientNote || "—"}</span>
                  </div>

                  <div className="appoint-detail-row">
                    <strong>Clinic Note:</strong>
                    <span>{selectedAppointment.clinicNote || "—"}</span>
                  </div>
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
                    selectedAppointment.status === "Confirmed") && (
                    <button
                      type="button"
                      className="pill pill-resched"
                      onClick={() => openRescheduleModal(selectedAppointment)}
                    >
                      Reschedule
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="pill pill-gray"
                    onClick={closeModal}
                    disabled={savingAction}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pill pill-success"
                    onClick={handleRescheduleSave}
                    disabled={savingAction}
                  >
                    {savingAction ? "Saving..." : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
