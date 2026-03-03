import { useEffect, useMemo, useState } from "react";
import {Link, useNavigate} from "react-router-dom";
import "./AdminAppoint.css";
import Sidebar from "./SidebarAdmin";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

type AppointmentRow = {
  id: number;
  patient_name: string;
  clinic_name: string;
  start_at: string;     // from backend
  end_at: string | null;
  purpose: string;      // from backend (instead of service_name)
  status: AppointmentStatus;
  created_at?: string;
};

type AppointmentDetails = {
  id: number;
  user_id: number;
  clinic_id: number;
  start_at: string;
  end_at: string | null;
  purpose: string | null;
  symptoms: string | null;
  patient_note: string | null;
  clinic_note: string | null;
  status: AppointmentStatus;
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
type ActivityItem = {
  id: string;
  type: "user" | "clinic" | "clinic-approved" | "clinic-rejected" | "appointment";
  text: string;
  time: string;
};

export default function AdminAppoint() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [q, setQ] = useState("");
  // modal
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selected, setSelected] = useState<AppointmentDetails | null>(null);
  const navigate = useNavigate();

const handleLogout = () => {
  // remove auth data
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // optional: clear session cookie via API
  // await fetch("/api/logout", { method: "POST", credentials: "include" });

  navigate("/login");
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
  useEffect(() => {;
    loadActivity();
  }, []);
  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/admin/appointments");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AppointmentRow[] = await res.json();
      setAppointments(data);
    } catch (e) {
      console.error("Load appointments error:", e);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return appointments;
    return appointments.filter((a) => {
      return (
  a.patient_name.toLowerCase().includes(s) ||
  a.clinic_name.toLowerCase().includes(s) ||
  (a.purpose || "").toLowerCase().includes(s) ||
  a.status.toLowerCase().includes(s)
);
    });
  }, [appointments, q]);

  const viewDetails = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/appointments/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AppointmentDetails = await res.json();
      setSelected(data);
      setIsPopupOpen(true);
    } catch (e) {
      console.error("View details error:", e);
      alert("Failed to load appointment details.");
    }
  };

  const cancelAppointment = (id: number) => {
  const ok = window.confirm("Cancel this appointment?");
  if (!ok) return;
  setStatus(id, "cancelled", "Admin cancelled");
};

const setStatus = async (id: number, status: AppointmentStatus, cancel_reason?: string) => {
  try {
    const res = await fetch(
      `http://localhost:5000/api/admin/appointments/${id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, cancel_reason }),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
  } catch (e) {
    console.error("Update status error:", e);
    alert("Failed to update appointment status.");
  }
};

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusPill = (status: AppointmentStatus) => {
  if (status === "completed") return "pill pill-success";
  if (status === "cancelled") return "pill pill-danger";
  if (status === "confirmed") return "pill pill-view";
  if (status === "no_show") return "pill pill-gray";
  return "pill pill-warning"; // pending
};

  return (
    <div className={`admin-UserAppoint with-sidebar ${isPopupOpen ? "modal-open" : ""}`}>
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
              <h2>Appointment Management</h2>
            </div>

            <div className="admin-grid">
              <section className="admin-card admin-table-card">
                <div className="admin-table-header"></div>

                <div className="users-table">
                  {/* header row */}
                  <div className="users-row users-header">
                    <div className="users-cell">Patient Name</div>
                    <div className="users-cell">Clinic Name</div>
                    <div className="users-cell">Date & Time</div>
                    <div className="users-cell">Service</div>
                    <div className="users-cell">Status</div>
                    <div className="users-cell">Actions:</div>
                  </div>

                  {loading ? (
                    <div className="users-row">
                      <div className="users-cell" style={{ gridColumn: "1 / -1" }}>
                        Loading...
                      </div>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="users-row">
                      <div className="users-cell" style={{ gridColumn: "1 / -1" }}>
                        No appointments found.
                      </div>
                    </div>
                  ) : (
                    filtered.map((a) => (
                      <div className="users-row" key={a.id}>
                        <div className="users-cell users-name">{a.patient_name}</div>

                        <div className="users-cell">
                          <span className="pills">{a.clinic_name}</span>
                        </div>

                        <div className="users-cell">
                          <span className="pills">{formatDateTime(a.start_at)}</span>
                        </div>

                        <div className="users-cell">
                          <span className="pills">{a.purpose}</span>
                        </div>

                        <div className="users-cell">
                          <span className={statusPill(a.status)}>{a.status}</span>
                        </div>

                        <div className="users-cell">
                          <div className="users-actions">
                            <button
                              type="button"
                              className="pill pill-view"
                              onClick={() => viewDetails(a.id)}
                            >
                              View Details
                            </button>

                            <button
                              type="button"
                              className="pill pill-danger"
                              disabled={a.status === "cancelled" || a.status === "completed"}
                              onClick={() => cancelAppointment(a.id)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <aside className="admin-right">
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
              </aside>
            </div>
          </div>
        </section>
      </main>

      {/* ✅ VIEW DETAILS MODAL */}
      {isPopupOpen && selected && (
        <div className="modal-backdrop" onClick={() => setIsPopupOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Appointment Details</h3>
              <button className="modal-close" onClick={() => setIsPopupOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p><b>Patient:</b> {selected.patient_name_snapshot ?? "—"}</p>
<p><b>Clinic:</b> {selected.clinic_name_snapshot ?? "—"}</p>
<p><b>Schedule:</b> {formatDateTime(selected.start_at)}</p>
<p><b>Purpose:</b> {selected.purpose ?? "—"}</p>
<p><b>Status:</b> {selected.status}</p>
{selected.patient_note ? <p><b>Patient Note:</b> {selected.patient_note}</p> : null}
{selected.clinic_note ? <p><b>Clinic Note:</b> {selected.clinic_note}</p> : null}
            </div>

            <div className="modal-foot">
              <button className="pill pill-gray" onClick={() => setIsPopupOpen(false)}>
                Close
              </button>

              <button
  type="button"
  className="pill pill-danger"
  disabled={selected.status === "cancelled" || selected.status === "completed"}
  onClick={() => cancelAppointment(selected.id)}
>
  Cancel
</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
