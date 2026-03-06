import { useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import "./AdminClinic.css";
import Sidebar from "./SidebarAdmin";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";
import SidebarAdmin from "./SidebarAdmin";

type ClinicStatusUI = "Pending" | "Approved" | "Rejected" | "active" | "disabled";

type ClinicRow = {
  id: number;
  clinic_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  account_status:"active" | "disabled";
};

type ClinicProfile = {
  id: number;
  clinic_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  account_status: "active" | "disabled";
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
const [loadingAppointments, setLoadingAppointments] = useState(true)
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [profile, setProfile] = useState<ClinicProfile | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

const handleLogout = () => {
  // remove auth data
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // optional: clear session cookie via API
  // await fetch("/api/logout", { method: "POST", credentials: "include" });

  navigate("/login");
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
  useEffect(() => {;
    loadActivity();
  }, []);
  // ✅ Load clinics
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
  // ✅ View clinic
  const viewClinic = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/clinics/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ClinicProfile = await res.json();
      setProfile(data);
      setViewOpen(true);
    } catch (e) {
      console.error("View clinic error:", e);
      alert("Failed to view clinic.");
    }
  };

  // ✅ Approve
  const approveClinic = async (id: number) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/clinics/${id}/approve`,
        { method: "PATCH" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setClinics((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "approved" } : c))
      );
    } catch (e) {
      console.error("Approve clinic error:", e);
      alert("Failed to approve clinic.");
    }
  };

  // ✅ Reject
  const rejectClinic = async (id: number) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/clinics/${id}/reject`,
        { method: "PATCH" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setClinics((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "rejected" } : c))
      );
    } catch (e) {
      console.error("Reject clinic error:", e);
      alert("Failed to reject clinic.");
    }
  };

  // ✅ Activate / Disable (Deactive)
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

  // ✅ Edit (simple example: rename only)
  const editClinicName = async (id: number) => {
    const newName = prompt("Enter new clinic name:");
    if (!newName) return;

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
      <SidebarAdmin
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
  <div className="admin-table-header" />

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

            {/* ✅ Approval Status */}
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

            {/* ✅ Account Status */}
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

            {/* ✅ Actions */}
            <td>
              <div className="users-actions clinics-actions slots">
                <button
                  type="button"
                  className="pill pill-view pill-wide"
                  onClick={() => viewClinic(c.id)}
                >
                  View
                </button>

                {/* Approve / Reject ONLY if pending */}
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
                  onClick={() => editClinicName(c.id)}
                >
                  Edit
                </button>

                {/* Activate / Deactivate ONLY if approved */}
                {isApproved && (
                  isDisabled ? (
                    <button
                      type="button"
                      className="pill pill-success pill-wide"
                      onClick={() => setClinicStatus(c.id, "active")}
                    >
                      Activate
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="pill pill-dark pill-wide"
                      onClick={() => setClinicStatus(c.id, "disabled")}
                    >
                      Deactivate
                    </button>
                  )
                )}
              </div>
            </td>
          </tr>
        );
      })
    )}
  </tbody>
</table>
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

                {/* ✅ Appointment Section PANEL inside aside */}
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
                          <td colSpan={4} className="td-empty">
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

      {/* VIEW MODAL */}
      {viewOpen && profile && (
        <div className="modal-backdrop" onClick={() => setViewOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Clinic Profile</h3>
              <button className="modal-close" onClick={() => setViewOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p><b>Clinic Name:</b> {profile.clinic_name}</p>
              <p><b>Email:</b> {profile.email}</p>
              <p><b>Phone:</b> {profile.phone || "—"}</p>
              <p><b>Status:</b> {profile.status}</p>
              <p><b>Registered:</b> {new Date(profile.created_at).toLocaleString()}</p>
              <p><b>Address:</b> {profile.address || "—"}</p>
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