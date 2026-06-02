import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AdminUser.css";
import "./AdminHeader.css";
import Sidebar from "./SidebarAdmin";
import AdminAppointmentDetailsModal, {
  type AdminAppointmentDetails,
} from "./AdminAppointmentDetailsModal";
import AdminHeader from "./AdminHeader";

type UserRow = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  account_status?: "active" | "disabled";
  status?: "active" | "disabled";
};

type UserProfile = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  address: string | null;
  created_at: string;
  account_status?: "active" | "disabled";
  status?: "active" | "disabled";
  appointment_count?: number | string | null;
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

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentDetails, setAppointmentDetails] =
    useState<AdminAppointmentDetails | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [isUserPopupOpen, setIsUserPopupOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const [statusPopupOpen, setStatusPopupOpen] = useState(false);
  const [statusUser, setStatusUser] = useState<UserRow | null>(null);
  const [pendingAccountStatus, setPendingAccountStatus] = useState<"active" | "disabled" | null>(
    null
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/signin");
  };

  const getUserStatus = (
    user: UserRow | UserProfile | null | undefined
  ): "active" | "disabled" => {
    const raw = user?.account_status || user?.status;
    return raw === "active" ? "active" : "disabled";
  };

  const getStatusClass = (status: string) => {
    const s = status.trim().toLowerCase();

    if (["approved", "confirmed", "completed"].includes(s)) return "badge-approved";
    if (["pending"].includes(s)) return "badge-pending";
    if (["cancelled", "canceled", "rejected", "declined"].includes(s)) {
      return "badge-cancelled";
    }

    return "badge-pending";
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

  const formatDate = (value?: string | null) => {
    if (!value) return "Not provided";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysSince = (value?: string | null) => {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  };

  const getLastKnownActivity = (user: UserProfile) =>
    user.last_activity_at || user.last_appointment_request_at || user.created_at;

  const getInactiveLabel = (user: UserProfile) => {
    const days = getDaysSince(getLastKnownActivity(user));

    if (days === null) return "No activity date recorded";
    if (days === 0) return "Active today";
    if (days === 1) return "Inactive for 1 day";

    return `Inactive for ${days} days`;
  };

  const getInitials = (name?: string | null) => {
    const parts = (name || "User").trim().split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
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

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/admin/users");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: UserRow[] = await res.json();
      console.log("USERS API SAMPLE:", data?.[0]);
      setUsers(data);
    } catch (e) {
      console.error("Load users error:", e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoadingAppointments(true);

      const res = await fetch("http://localhost:5000/api/admin/appointments");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

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

  const viewUser = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: UserProfile = await res.json();
      setProfile(data);
      setIsUserPopupOpen(true);
    } catch (e) {
      console.error("View user error:", e);
      alert("Failed to view user.");
    }
  };

  const setUserStatus = async (id: number, accountStatus: "active" | "disabled") => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: accountStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                account_status: accountStatus,
                status: accountStatus,
              }
            : u
        )
      );
    } catch (e) {
      console.error("Update user status error:", e);
      alert("Failed to update user status.");
    }
  };

  const openStatusPopup = (user: UserRow, status: "active" | "disabled") => {
    setStatusUser(user);
    setPendingAccountStatus(status);
    setStatusPopupOpen(true);
  };

  const closeStatusPopup = () => {
    setStatusPopupOpen(false);
    setStatusUser(null);
    setPendingAccountStatus(null);
  };

  const confirmStatusChange = async () => {
    if (!statusUser || !pendingAccountStatus) return;
    await setUserStatus(statusUser.id, pendingAccountStatus);
    closeStatusPopup();
  };

  const filtered = users.filter((u) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      u.full_name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.phone || "").toLowerCase().includes(s)
    );
  });

  const onViewAppointment = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/appointments/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AdminAppointmentDetails = await res.json();
      setAppointmentDetails(data);
    } catch (e) {
      console.error("View appointment details error:", e);
      alert("Failed to load appointment details.");
    }
  };

  return (
    <div className="admin-Userpage with-sidebar">
      <Sidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
      />

      <main className="preview-canvas">
        <AdminHeader searchValue={q} onSearchChange={setQ} />

        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="admin-title">
              <h2>Users Management</h2>
            </div>

            <div className="admin-grid">
              <section className="admin-card admin-table-card">
                <div className="users-table-wrap">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Registered Users</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="users-empty">
                            Loading...
                          </td>
                        </tr>
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="users-empty">
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((u) => {
                          const userStatus = getUserStatus(u);
                          const isActive = userStatus === "active";
                          const isDisabled = userStatus === "disabled";

                          return (
                            <tr key={u.id}>
                              <td className="users-name">{u.full_name}</td>
                              <td>{u.email}</td>
                              <td>
                                <span
                                  className={`status-badge ${
                                    isActive ? "is-active" : "is-disabled"
                                  }`}
                                >
                                  {userStatus}
                                </span>
                              </td>
                              <td>
                                <div className="users-actions-wrap">
                                  <button
                                    type="button"
                                    className="pill-btn pill-view"
                                    onClick={() => viewUser(u.id)}
                                  >
                                    View
                                  </button>

                                  {isDisabled ? (
                                    <button
                                      type="button"
                                      className="pill-btn pill-success"
                                      onClick={() => openStatusPopup(u, "active")}
                                    >
                                      Activate
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="pill-btn pill-danger"
                                      onClick={() => openStatusPopup(u, "disabled")}
                                    >
                                      Deactivate
                                    </button>
                                  )}
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
                        <th className="th-action">Action:</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loadingAppointments ? (
                        <tr>
                          <td colSpan={3} className="td-empty">
                            Loading appointments...
                          </td>
                        </tr>
                      ) : appointments.length === 0 ? (
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

    <td className="appt-status-cell">
      <span className={`appt-badge ${getStatusClass(ap.status)}`}>
        {ap.status}
      </span>
    </td>

    <td className="td-action appt-action-cell">
      <button
        type="button"
        className="appt-badge badge-view"
        onClick={() => onViewAppointment(ap.id)}
      >
        View Details
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

      {isUserPopupOpen && profile && (
        <div className="modal-backdrop" onClick={() => setIsUserPopupOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>User Details</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsUserPopupOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <section className="user-detail-hero">
                <div className="user-detail-avatar">{getInitials(profile.full_name)}</div>
                <div className="user-detail-identity">
                  <h4>{profile.full_name ?? "Unnamed user"}</h4>
                  <span>{profile.email ?? "No email recorded"}</span>
                </div>
                <span className={`user-detail-status ${getUserStatus(profile)}`}>
                  {getUserStatus(profile)}
                </span>
              </section>

              <section className="user-detail-stats">
                <div className="user-detail-stat">
                  <span>Activity estimate</span>
                  <strong>{getInactiveLabel(profile)}</strong>
                  <small>Last known activity: {formatDateTime(getLastKnownActivity(profile))}</small>
                </div>
                <div className="user-detail-stat">
                  <span>Appointments</span>
                  <strong>{Number(profile.appointment_count || 0)}</strong>
                  <small>
                    Latest request: {formatDateTime(profile.last_appointment_request_at)}
                  </small>
                </div>
                <div className="user-detail-stat">
                  <span>Member age</span>
                  <strong>
                    {getDaysSince(profile.created_at) ?? "—"}{" "}
                    {getDaysSince(profile.created_at) === 1 ? "day" : "days"}
                  </strong>
                  <small>Created: {formatDateTime(profile.created_at)}</small>
                </div>
              </section>

              <section className="user-detail-grid">
                <div className="user-detail-field">
                  <span>Phone</span>
                  <strong>{profile.phone || "Not provided"}</strong>
                </div>
                <div className="user-detail-field">
                  <span>Gender</span>
                  <strong>{profile.gender || "Not provided"}</strong>
                </div>
                <div className="user-detail-field">
                  <span>Date of birth</span>
                  <strong>{formatDate(profile.date_of_birth)}</strong>
                </div>
                <div className="user-detail-field">
                  <span>Last appointment</span>
                  <strong>{formatDateTime(profile.last_appointment_at)}</strong>
                </div>
                <div className="user-detail-field">
                  <span>Next appointment</span>
                  <strong>{formatDateTime(profile.next_appointment_at)}</strong>
                </div>
                <div className="user-detail-field user-detail-field-wide">
                  <span>Address</span>
                  <strong>{profile.address || "Not provided"}</strong>
                </div>
              </section>

              <p className="user-detail-note">
                Inactivity is estimated from the latest recorded account or appointment activity.
              </p>
              <p>
                <b>Full Name:</b> {profile.full_name ?? "—"}
              </p>
              <p>
                <b>Email:</b> {profile.email ?? "—"}
              </p>
              <p>
                <b>Phone:</b> {profile.phone ?? "—"}
              </p>
              <p>
                <b>Address:</b> {profile.address ?? "—"}
              </p>
              <p>
                <b>Account:</b> {getUserStatus(profile)}
              </p>
              <p>
                <b>Created At:</b> {profile.created_at ?? "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {statusPopupOpen && statusUser && pendingAccountStatus && (
        <div className="user-status-popup-overlay" onClick={closeStatusPopup}>
          <div className="user-status-popup-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="user-status-popup-title">
              {pendingAccountStatus === "disabled" ? "Deactivate User" : "Activate User"}
            </h3>

            <p className="user-status-popup-text">
              Are you sure you want to{" "}
              <strong>
                {pendingAccountStatus === "disabled" ? "deactivate" : "activate"}
              </strong>{" "}
              <span className="user-status-popup-name">"{statusUser.full_name}"</span>?
            </p>

            <div className="user-status-popup-actions">
              <button
                type="button"
                className="user-status-popup-btn user-status-popup-cancel"
                onClick={closeStatusPopup}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`user-status-popup-btn ${
                  pendingAccountStatus === "disabled"
                    ? "user-status-popup-danger"
                    : "user-status-popup-success"
                }`}
                onClick={confirmStatusChange}
              >
                {pendingAccountStatus === "disabled" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {appointmentDetails && (
        <AdminAppointmentDetailsModal
          appointment={appointmentDetails}
          onClose={() => setAppointmentDetails(null)}
        />
      )}
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`dash-panel ${className}`}>
      <div className="dash-panel-head">
        <div className="dash-panel-title">{title}</div>
      </div>
      <div className="dash-panel-body dash-panel-pad">{children}</div>
    </div>
  );
}
