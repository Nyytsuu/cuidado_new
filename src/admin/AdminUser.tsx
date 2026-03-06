import { useEffect, useState, type SetStateAction } from "react";
import "./AdminUser.css";
import Sidebar from "./SidebarAdmin";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

/* ---------- TYPES ---------- */
type UserRow = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  status: "active" | "disabled";
};

type UserProfile = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  created_at: string;
  status: "active" | "disabled";
};

type ActivityItem = {
  id: string;
  type: "user" | "clinic" | "clinic-approved" | "clinic-rejected" | "appointment";
  text: string;
  time: string;
};

/* ✅ Appointment type (for panel inside aside) */
type AppointmentRow = {
  id: number;
  patient: string;
  clinic: string;
  schedule: string;
  status: string;
};


export default function AdminUser() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // ✅ Load users
const loadUsers = async () => {
  try {
    setLoading(true);

    const res = await fetch("http://localhost:5000/api/admin/users");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: UserRow[] = await res.json();

    console.log("USERS API RESPONSE:", data); // ✅ check what's coming back
    setUsers(data);
  } catch (e) {
    console.error("Load users error:", e);
    setUsers([]);
  } finally {
    setLoading(false);
  }
};

  // ✅ Load recent activity
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

  // ✅ (Optional) Load appointments later (leave empty if no API yet)
const loadAppointments = async () => {
  try {
    setLoadingAppointments(true);

    const res = await fetch("http://localhost:5000/api/admin/appointments");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // ✅ This is appointments, not clinics
    console.log("APPOINTMENTS API SAMPLE:", data?.[0]);

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

    // ❌ REMOVE THIS:
    // setClinics(data);

  } catch (e) {
    console.error("Load appointments error:", e);
    setAppointments([]);
  } finally {
    setLoadingAppointments(false);
  }
};
  useEffect(() => {
    loadUsers();
    loadActivity();
    loadAppointments();
  }, []);

  // ✅ View profile
  const viewUser = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: UserProfile = await res.json();
      setProfile(data);
      setViewOpen(true);
    } catch (e) {
      console.error("View user error:", e);
    }
  };

  // ✅ Activate/Disable
  const setStatus = async (id: number, status: "active" | "disabled") => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
    } catch (e) {
      console.error("Update status error:", e);
      alert("Failed to update user status.");
    }
  };

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
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={
          setHeaderProfileOpen as unknown as (value: SetStateAction<boolean>) => void
        }
      />

      <main className="preview-canvas">
        <header className="app-header">
          <div className="header-left">
            <img src={logo} alt="CUIDADO logo" className="brand-logo" />

            <div className="header-search">
              <input type="text" placeholder="Search keywords..." />
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
              <h2>User (Patient) Management</h2>
            </div>

            <div className="admin-grid">
              {/* LEFT: TABLE */}
              <section className="admin-card admin-table-card">
                <div className="users-table-wrap">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Gmail</th>
                        <th>Contact</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Profiles</th>
                        <th>Actions:</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="users-empty">
                            Loading...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="users-empty">
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.id}>
                            <td className="users-name">{u.full_name}</td>
                            <td className="users-email">{u.email}</td>
                            <td className="users-phone">{u.phone || "—"}</td>
                            <td className="users-date">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                            </td>
                            <td className="users-status">
                              <span
                                className={`status-badge ${
                                  u.status === "active" ? "is-active" : "is-disabled"
                                }`}
                              >
                                {u.status}
                              </span>
                            </td>
                            <td className="users-view">
                              <button
                                type="button"
                                className="pill-btn pill-view"
                                onClick={() => viewUser(u.id)}
                              >
                                View
                              </button>
                            </td>
                            <td className="users-actions">
                              <div className="users-actions-wrap">
                                <button
                                  type="button"
                                  className="pill-btn pill-success"
                                  disabled={u.status === "active"}
                                  onClick={() => setStatus(u.id, "active")}
                                >
                                  Activate
                                </button>

                                <button
                                  type="button"
                                  className="pill-btn pill-danger"
                                  disabled={u.status === "disabled"}
                                  onClick={() => setStatus(u.id, "disabled")}
                                >
                                  Disable
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* RIGHT: ASIDE (dashboard style) */}
              <aside className="dash-aside">
                {/* Recent activity */}
                <div className="dash-panel dash-right-top">
                  <div className="dash-panel-title">Recent activity</div>

                  <div className="dash-panel-body dash-body-small">
                    {activities.length === 0 ? (
                      <div className="activity-empty">No recent activity yet.</div>
                    ) : (
                      <ul className="activity-list">
                        {activities.map((item) => (
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

                <Panel title="Appointment Section">
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

      {/* VIEW PROFILE MODAL */}
      {viewOpen && profile && (
        <div className="modal-backdrop" onClick={() => setViewOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>User Profile</h3>
              <button className="modal-close" onClick={() => setViewOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p>
                <b>Name:</b> {profile.full_name}
              </p>
              <p>
                <b>Email:</b> {profile.email}
              </p>
              <p>
                <b>Phone:</b> {profile.phone || "—"}
              </p>
              <p>
                <b>Status:</b> {profile.status}
              </p>
              <p>
                <b>Registered:</b> {new Date(profile.created_at).toLocaleString()}
              </p>
              <p>
                <b>Gender:</b> {profile.gender || "—"}
              </p>
              <p>
                <b>Date of Birth:</b> {profile.date_of_birth || "—"}
              </p>
              <p>
                <b>Address:</b> {profile.address || "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ✅ same Panel helper style used in dashboard */
function Panel({ title, children }: any) {
  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <div className="dash-panel-title">{title}</div>
      </div>
      <div className="dash-panel-body dash-panel-pad">{children}</div>
    </div>
  );
}