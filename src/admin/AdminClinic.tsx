import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AdminClinic.css";
import "./AdminHeader.css";
import Sidebar from "./SidebarAdmin";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";


type ClinicRow = {
  id: number;
  clinic_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  account_status: "active" | "disabled";
};

type ClinicProfile = {
  id: number;
  clinic_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  specialization?: string | null;
  license_number?: string | null;
  years_operation?: number | string | null;
  rep_full_name?: string | null;
  rep_position?: string | null;
  rep_phone?: string | null;
  services_offered?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  operating_days?: string | null;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  account_status: "active" | "disabled";
  appointment_count?: number | string | null;
  pending_appointments?: number | string | null;
  completed_appointments?: number | string | null;
  cancelled_appointments?: number | string | null;
  last_activity_at?: string | null;
  last_appointment_request_at?: string | null;
  last_appointment_at?: string | null;
  next_appointment_at?: string | null;
};

type ActivityItem = {
  id: string;
  type: "user" | "clinic" | "clinic-approved" | "clinic-rejected" | "appointment";
  text: string;
  time: string;
};

type AppointmentRow = {
  id: number;
  patient: string;
  clinic: string;
  schedule: string;
  status: string;
};

export default function AdminClinics() {
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [, setLoadingAppointments] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<ClinicProfile | null>(null);
  const [isClinicPopupOpen, setIsClinicPopupOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<ClinicRow | null>(null);
  const [editClinicNameInput, setEditClinicNameInput] = useState("");

  const [statusPopupOpen, setStatusPopupOpen] = useState(false);
  const [statusClinic, setStatusClinic] = useState<ClinicRow | null>(null);
  const [pendingAccountStatus, setPendingAccountStatus] = useState<"active" | "disabled" | null>(
    null
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "Not recorded";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getDaysSince = (value?: string | null) => {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  };

  const toTitle = (value?: string | null) =>
    value
      ? value
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase())
      : "Not provided";

  const getClinicInitials = (name?: string | null) => {
    const parts = (name || "Clinic").trim().split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  };

  const getLastKnownClinicActivity = (clinic: ClinicProfile) =>
    clinic.last_activity_at || clinic.last_appointment_request_at || clinic.created_at;

  const getClinicInactiveLabel = (clinic: ClinicProfile) => {
    const days = getDaysSince(getLastKnownClinicActivity(clinic));

    if (days === null) return "No activity date recorded";
    if (days === 0) return "Active today";
    if (days === 1) return "Inactive for 1 day";

    return `Inactive for ${days} days`;
  };

  const getOperatingWindow = (clinic: ClinicProfile) => {
    const open = clinic.opening_time || "Not set";
    const close = clinic.closing_time || "Not set";

    if (open === "Not set" && close === "Not set") return "Not provided";
    return `${open} - ${close}`;
  };

  const loadActivity = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/recent-activity?limit=8");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ActivityItem[] = await res.json();
      setActivities(data);
    } catch (e) {
      console.error("Recent activity error:", e);
      setActivities([]);
    }
  };

  useEffect(() => {
    loadActivity();
  }, []);

  const loadClinics = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/admin/clinics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ClinicRow[] = await res.json();
      setClinics(data);
    } catch (e) {
      console.error("Load clinics error:", e);
      setClinics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoadingAppointments(true);

      const res = await fetch("http://localhost:5000/api/admin/appointments");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      console.log("CLINICS API SAMPLE:", data?.[0]);

      const mapped: AppointmentRow[] = data.map((a: any) => ({
        id: a.id,
        patient: a.patient_name,
        clinic: a.clinic_name,
        schedule: `${new Date(a.start_at).toLocaleDateString()} • ${new Date(
          a.start_at
        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        status: a.status,
      }));

      setAppointments(mapped);
    } catch (e) {
      console.error("Load appointments error:", e);
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const viewClinic = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/clinics/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ClinicProfile = await res.json();
      setSelectedClinic(data);
      setIsClinicPopupOpen(true);
    } catch (e) {
      console.error("View clinic error:", e);
      alert("Failed to view clinic.");
    }
  };

  const approveClinic = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/clinics/${id}/approve`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setClinics((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "approved" } : c))
      );
    } catch (e) {
      console.error("Approve clinic error:", e);
      alert("Failed to approve clinic.");
    }
  };

  const rejectClinic = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/clinics/${id}/reject`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setClinics((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "rejected" } : c))
      );
    } catch (e) {
      console.error("Reject clinic error:", e);
      alert("Failed to reject clinic.");
    }
  };

  const setClinicStatus = async (id: number, accountStatus: "active" | "disabled") => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/clinics/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: accountStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setClinics((prev) =>
        prev.map((c) => (c.id === id ? { ...c, account_status: accountStatus } : c))
      );
    } catch (e) {
      console.error("Update clinic status error:", e);
      alert("Failed to update clinic status.");
    }
  };

  const editClinicName = async (id: number, newName: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/clinics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_name: newName }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setClinics((prev) =>
        prev.map((c) => (c.id === id ? { ...c, clinic_name: newName } : c))
      );
    } catch (e) {
      console.error("Edit clinic error:", e);
      alert("Failed to edit clinic.");
    }
  };

  const openEditPopup = (clinic: ClinicRow) => {
    setEditingClinic(clinic);
    setEditClinicNameInput(clinic.clinic_name);
    setEditPopupOpen(true);
  };

  const closeEditPopup = () => {
    setEditPopupOpen(false);
    setEditingClinic(null);
    setEditClinicNameInput("");
  };

  const saveEditedClinic = async () => {
    if (!editingClinic) return;
    const newName = editClinicNameInput.trim();
    if (!newName) return;

    await editClinicName(editingClinic.id, newName);
    closeEditPopup();
  };

  const openStatusPopup = (clinic: ClinicRow, status: "active" | "disabled") => {
    setStatusClinic(clinic);
    setPendingAccountStatus(status);
    setStatusPopupOpen(true);
  };

  const closeStatusPopup = () => {
    setStatusPopupOpen(false);
    setStatusClinic(null);
    setPendingAccountStatus(null);
  };

  const confirmStatusChange = async () => {
    if (!statusClinic || !pendingAccountStatus) return;
    await setClinicStatus(statusClinic.id, pendingAccountStatus);
    closeStatusPopup();
  };

  const filtered = clinics.filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      c.clinic_name.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      (c.phone || "").toLowerCase().includes(s)
    );
  });

  const onViewAppointment = (id: number) => {
    console.log("View appointment:", id);
  };

  return (
    <div className="admin-UserClinics with-sidebar">
      <Sidebar
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
              <input
                type="text"
                placeholder="Search keywords..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button aria-label="Search" type="button" className="search-btn">
                <img src={searchIcon} alt="Search" />
              </button>
            </div>
          </div>

          <nav className="header-nav">
            <a className="nav-link" href="../admin/dashboard">Home</a>
            <a className="nav-link" href="../admin/appointments">Appointments</a>

            <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
              <button
                type="button"
                className="nav-link profile-btn"
                onClick={() => setHeaderProfileOpen((v) => !v)}
              >
                Profile <span className="caret">▾</span>
              </button>

              <div className="profile-dropdown">
                <Link to="/admin/profile">My Profile</Link>
                <Link to="/admin/settings">Settings</Link>
                <button
                  type="button"
                  className="dropdown-logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </nav>
        </header>

        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="admin-title">
              <h2>Clinics Management</h2>
            </div>

            <div className="admin-grid">
              <section className="admin-card admin-table-card">
                <div className="clinics-table-wrap">
                  <table className="admin-table clinics-table">
                    <thead>
                      <tr>
                        <th>Registered Clinics</th>
                        <th>Approval</th>
                        <th>Account</th>
                        <th>Actions:</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center" }}>Loading...</td>
                        </tr>
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center" }}>No clinics found.</td>
                        </tr>
                      ) : (
                        filtered.map((c) => {
                          const isPending = c.status === "pending";
                          const isApproved = c.status === "approved";
                          const isRejected = c.status === "rejected";

                          const isActive = c.account_status === "active";
                          const isDisabled = c.account_status === "disabled";

                          return (
                            <tr key={c.id}>
                              <td className="users-name">{c.clinic_name}</td>

                              <td>
                                <span
                                  className={[
                                    "pill",
                                    isPending ? "pill-warning" : "",
                                    isApproved ? "pill-success" : "",
                                    isRejected ? "pill-danger" : "",
                                  ].join(" ")}
                                >
                                  {c.status}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={[
                                    "pill",
                                    isActive ? "pill-success" : "",
                                    isDisabled ? "pill-dark" : "",
                                  ].join(" ")}
                                >
                                  {c.account_status}
                                </span>
                              </td>

                              <td>
                                <div className="users-actions clinics-actions slots">
                                  <button
                                    type="button"
                                    className="pill pill-view pill-wide"
                                    onClick={() => viewClinic(c.id)}
                                  >
                                    View
                                  </button>

                                  {isPending && (
                                    <>
                                      <button
                                        type="button"
                                        className="pill pill-success pill-wide"
                                        onClick={() => approveClinic(c.id)}
                                      >
                                        Approve
                                      </button>

                                      <button
                                        type="button"
                                        className="pill pill-danger pill-wide"
                                        onClick={() => rejectClinic(c.id)}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}

                                  <button
                                    type="button"
                                    className="pill pill-gray pill-wide"
                                    onClick={() => openEditPopup(c)}
                                  >
                                    Edit
                                  </button>

                                  {isApproved &&
                                    (isDisabled ? (
                                      <button
                                        type="button"
                                        className="pill pill-success pill-wide"
                                        onClick={() => openStatusPopup(c, "active")}
                                      >
                                        Activate
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="pill pill-dark pill-wide"
                                        onClick={() => openStatusPopup(c, "disabled")}
                                      >
                                        Deactivate
                                      </button>
                                    ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <aside className="dash-aside">
  <div className="dash-panel dash-right-top">
    <div className="dash-panel-title">Recent activity</div>

    <div className="dash-panel-body dash-body-small">
      {activities.length === 0 ? (
        <div className="activity-empty">No recent activity yet.</div>
      ) : (
        <ul className="activity-list">
          {activities.slice(0, 3).map((item) => (
            <li key={item.id} className={`activity-item ${item.type}`}>
              <div className="activity-icon">
                {item.type === "user" && "👤"}
                {item.type === "clinic" && "🏥"}
                {item.type === "clinic-approved" && "✅"}
                {item.type === "clinic-rejected" && "❌"}
                {item.type === "appointment" && "📅"}
              </div>

              <div className="activity-content">
                <div className="activity-text">{item.text}</div>
                <div className="activity-time">
                  {new Date(item.time).toLocaleString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>

  <Panel title="Appointment Section" className="appointment-panel">
    <table className="dash-table">
      <thead>
        <tr>
          <th>Patient</th>
          <th>Status</th>
          <th className="th-action">Action</th>
        </tr>
      </thead>

      <tbody>
        {appointments.length === 0 ? (
          <tr>
            <td colSpan={3} className="td-empty">
              Appointments API not connected yet.
            </td>
          </tr>
        ) : (
          appointments.map((ap) => (
            <tr key={ap.id}>
              <td>
                <div className="t-main">{ap.patient}</div>
                <div className="t-sub">{ap.clinic}</div>
              </td>
              <td>
                <span className={`badge badge-${ap.status.toLowerCase()}`}>
                  {ap.status}
                </span>
              </td>
              <td className="td-action">
                <button
                  className="btn-sm btn-view"
                  onClick={() => onViewAppointment(ap.id)}
                >
                  View details
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </Panel>
</aside>
            </div>
          </div>
        </section>
      </main>

      {isClinicPopupOpen && selectedClinic && (
        <div
          className="modal-backdrop"
          onClick={() => setIsClinicPopupOpen(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h3>Clinic Details</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsClinicPopupOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <section className="clinic-detail-hero">
                <div className="clinic-detail-avatar">
                  {getClinicInitials(selectedClinic.clinic_name)}
                </div>
                <div className="clinic-detail-identity">
                  <h4>{selectedClinic.clinic_name ?? "Unnamed clinic"}</h4>
                  <span>{selectedClinic.email ?? "No email recorded"}</span>
                  <small>{toTitle(selectedClinic.specialization)}</small>
                </div>
                <div className="clinic-detail-statuses">
                  <span className={`clinic-detail-status approval-${selectedClinic.status}`}>
                    {selectedClinic.status}
                  </span>
                  <span className={`clinic-detail-status account-${selectedClinic.account_status}`}>
                    {selectedClinic.account_status}
                  </span>
                </div>
              </section>

              <section className="clinic-detail-stats">
                <div className="clinic-detail-stat">
                  <span>Activity estimate</span>
                  <strong>{getClinicInactiveLabel(selectedClinic)}</strong>
                  <small>
                    Last known activity: {formatDateTime(getLastKnownClinicActivity(selectedClinic))}
                  </small>
                </div>
                <div className="clinic-detail-stat">
                  <span>Appointment requests</span>
                  <strong>{Number(selectedClinic.appointment_count || 0)}</strong>
                  <small>
                    Pending: {Number(selectedClinic.pending_appointments || 0)} | Completed:{" "}
                    {Number(selectedClinic.completed_appointments || 0)}
                  </small>
                </div>
                <div className="clinic-detail-stat">
                  <span>Registered for</span>
                  <strong>
                    {getDaysSince(selectedClinic.created_at) ?? "--"}{" "}
                    {getDaysSince(selectedClinic.created_at) === 1 ? "day" : "days"}
                  </strong>
                  <small>Created: {formatDateTime(selectedClinic.created_at)}</small>
                </div>
              </section>

              <section className="clinic-detail-grid">
                <div className="clinic-detail-field">
                  <span>Phone</span>
                  <strong>{selectedClinic.phone || "Not provided"}</strong>
                </div>
                <div className="clinic-detail-field">
                  <span>License number</span>
                  <strong>{selectedClinic.license_number || "Not provided"}</strong>
                </div>
                <div className="clinic-detail-field">
                  <span>Years operating</span>
                  <strong>{selectedClinic.years_operation ?? "Not provided"}</strong>
                </div>
                <div className="clinic-detail-field">
                  <span>Operating hours</span>
                  <strong>{getOperatingWindow(selectedClinic)}</strong>
                </div>
                <div className="clinic-detail-field">
                  <span>Operating days</span>
                  <strong>{toTitle(selectedClinic.operating_days)}</strong>
                </div>
                <div className="clinic-detail-field">
                  <span>Services offered</span>
                  <strong>{toTitle(selectedClinic.services_offered)}</strong>
                </div>
                <div className="clinic-detail-field">
                  <span>Representative</span>
                  <strong>{selectedClinic.rep_full_name || "Not provided"}</strong>
                  <small>{selectedClinic.rep_position || "Position not provided"}</small>
                </div>
                <div className="clinic-detail-field">
                  <span>Representative phone</span>
                  <strong>{selectedClinic.rep_phone || "Not provided"}</strong>
                </div>
                <div className="clinic-detail-field">
                  <span>Last appointment</span>
                  <strong>{formatDateTime(selectedClinic.last_appointment_at)}</strong>
                </div>
                <div className="clinic-detail-field">
                  <span>Next appointment</span>
                  <strong>{formatDateTime(selectedClinic.next_appointment_at)}</strong>
                </div>
                <div className="clinic-detail-field clinic-detail-field-wide">
                  <span>Address</span>
                  <strong>{selectedClinic.address || "Not provided"}</strong>
                </div>
              </section>

              <p className="clinic-detail-note">
                Activity is estimated from clinic registration and appointment request history.
              </p>
              <p><b>Clinic Name:</b> {selectedClinic.clinic_name ?? "—"}</p>
              <p><b>Approval:</b> {selectedClinic.status ?? "—"}</p>
              <p><b>Account:</b> {selectedClinic.account_status ?? "—"}</p>
              <p><b>Email:</b> {selectedClinic.email ?? "—"}</p>
              <p><b>Phone:</b> {selectedClinic.phone ?? "—"}</p>
              <p><b>Address:</b> {selectedClinic.address ?? "—"}</p>
              <p><b>Created At:</b> {selectedClinic.created_at ?? "—"}</p>
            </div>

            <div className="modal-foot">
              <button
                type="button"
                className="pill pill-gray"
                onClick={() => setIsClinicPopupOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editPopupOpen && editingClinic && (
        <div
          className="clinic-edit-popup-overlay"
          onClick={closeEditPopup}
        >
          <div
            className="clinic-edit-popup-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="clinic-edit-popup-title">Edit Clinic</h3>

            <input
              className="clinic-edit-popup-input"
              type="text"
              value={editClinicNameInput}
              onChange={(e) => setEditClinicNameInput(e.target.value)}
              placeholder="Enter clinic name..."
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEditedClinic();
                if (e.key === "Escape") closeEditPopup();
              }}
              autoFocus
            />

            <div className="clinic-edit-popup-actions">
              <button
                type="button"
                className="clinic-edit-popup-btn clinic-edit-popup-cancel"
                onClick={closeEditPopup}
              >
                Cancel
              </button>
              <button
                type="button"
                className="clinic-edit-popup-btn clinic-edit-popup-save"
                onClick={saveEditedClinic}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {statusPopupOpen && statusClinic && pendingAccountStatus && (
        <div
          className="clinic-status-popup-overlay"
          onClick={closeStatusPopup}
        >
          <div
            className="clinic-status-popup-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="clinic-status-popup-title">
              {pendingAccountStatus === "disabled" ? "Deactivate Clinic" : "Activate Clinic"}
            </h3>

            <p className="clinic-status-popup-text">
              Are you sure you want to{" "}
              <strong>
                {pendingAccountStatus === "disabled" ? "deactivate" : "activate"}
              </strong>{" "}
              <span className="clinic-status-popup-name">"{statusClinic.clinic_name}"</span>?
            </p>

            <div className="clinic-status-popup-actions">
              <button
                type="button"
                className="clinic-status-popup-btn clinic-status-popup-cancel"
                onClick={closeStatusPopup}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`clinic-status-popup-btn ${
                  pendingAccountStatus === "disabled"
                    ? "clinic-status-popup-danger"
                    : "clinic-status-popup-save"
                }`}
                onClick={confirmStatusChange}
              >
                {pendingAccountStatus === "disabled" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children, className = "" }: any) {
  return (
    <div className={`dash-panel ${className}`}>
      <div className="dash-panel-head">
        <div className="dash-panel-title">{title}</div>
      </div>
      <div className="dash-panel-body dash-panel-pad">{children}</div>
    </div>
  );
}
