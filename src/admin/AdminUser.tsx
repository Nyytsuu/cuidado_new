import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AdminUser.css";
import Sidebar from "./SidebarAdmin";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

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
  address: string | null;
  created_at: string;
  account_status?: "active" | "disabled";
  status?: "active" | "disabled";
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
    navigate("/login");
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

  const onViewAppointment = (id: number) => {
    console.log("View appointment:", id);
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
            <a className="nav-link" href="../admin/dashboard">
              Home
            </a>
            <a className="nav-link" href="../admin/appointments">
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
                <Link to="/admin/profile">My Profile</Link>
                <Link to="/admin/settings">Settings</Link>
                <button type="button" className="dropdown-logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          </nav>
        </header>

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
                        <th className="th-action">Action</th>
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
        View
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