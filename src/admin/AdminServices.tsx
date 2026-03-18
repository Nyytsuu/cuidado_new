import { useEffect, useMemo, useState } from "react";
import "./AdminServices.css";
import SidebarAdmin from "./SidebarAdmin";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

type Service = {
  id: number;
  name: string;
  is_active: number; // 1 | 0
};
type AppointmentRow = {
  id: number;
  patient: string;
  clinic: string;
  schedule: string;
  status: string;
};
type ActivityItem = {
  id: string;
  type: "user" | "clinic" | "clinic-approved" | "clinic-rejected" | "appointment";
  text: string;
  time: string;
};
const API = "http://localhost:5000/api/admin";

export default function AdminServices() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  // ✅ Modal state
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceInput, setServiceInput] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  // ✅ Load from DB
  const loadServices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/services`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Service[] = await res.json();
      setServices(data);
    } catch (e) {
      console.error("Load services error:", e);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  // ✅ (Optional) Load appointments later (leave empty if no API yet)
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
    useEffect(() => {
      loadActivity();
      loadAppointments();
    }, []);
  // (optional) show only active in list:
  const activeServices = useMemo(
    () => services.filter((s) => s.is_active === 1),
    [services]
  );

  const openAddModal = () => {
    setEditingId(null);
    setServiceInput("");
    setServiceModalOpen(true);
  };

  const openEditModal = (id: number) => {
    const current = services.find((s) => s.id === id)?.name ?? "";
    setEditingId(id);
    setServiceInput(current);
    setServiceModalOpen(true);
  };

  const closeModal = () => {
    setServiceModalOpen(false);
    setServiceInput("");
    setEditingId(null);
  };

  // ✅ Create or Update in DB
  const saveService = async () => {
    const name = serviceInput.trim();
    if (!name) return;

    try {
      if (editingId === null) {
        // CREATE
        const res = await fetch(`${API}/services`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        // UPDATE
        const res = await fetch(`${API}/services/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }

      closeModal();
      loadServices();
    } catch (e) {
      console.error("Save service error:", e);
      alert("Failed to save service.");
    }
  };

const handleToggle = async (id: number) => {
  const ok = confirm("Deactivate/Activate this service?");
  if (!ok) return;

  try {
    const res = await fetch(`${API}/services/${id}/toggle`, {
      method: "PATCH",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    loadServices();
  } catch (e) {
    console.error("Toggle service error:", e);
    alert("Failed to update service status.");
  }
};
const onViewAppointment = (id: number) => {
    console.log("View appointment:", id);
  };

  return (
    <div className="admin-UserServices with-sidebar">
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
              <h2>Services Management</h2>
            </div>

            <div className="admin-grid">
              <section className="admin-card admin-table-card">
                <div className="admin-table-header">
                  <button type="button" className="btn-add" onClick={openAddModal}>
                    + Add service
                  </button>
                </div>

                <div className="users-table">
                  <div className="users-row users-header services-row">
                    <div className="users-cell">List of services</div>
                    <div className="users-cell">Actions:</div>
                  </div>

                  {loading ? (
                    <div className="users-row services-row">
                      <div className="users-cell" style={{ gridColumn: "1 / -1" }}>
                        Loading...
                      </div>
                    </div>
                  ) : services.length === 0 ? (
                    <div className="users-row services-row">
                      <div className="users-cell" style={{ gridColumn: "1 / -1" }}>
                        No services found.
                      </div>
                    </div>
                  ) : (
                    services.map((s) => (
                      <div className="users-row services-row" key={s.id}>
                        <div className="users-cell users-name">
                          {s.name}{" "}
                          {s.is_active === 0 && (
                            <span className="badge badge-cancelled" style={{ marginLeft: 8 }}>
                              Inactive
                            </span>
                          )}
                        </div>

                        <div className="users-cell">
                          <div className="users-actions">
                            <button
                              type="button"
                              className="pill pill-view"
                              onClick={() => openEditModal(s.id)}
                            >
                              Edit service
                            </button>

                            <button
                              type="button"
                              className="pill pill-danger"
                              onClick={() => handleToggle(s.id)}
                            >
                              {s.is_active === 1 ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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

                  {/* ✅ Appointment Section PANEL inside aside */}
                                  <Panel title="Appointment Section">
                 
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Status</th>
                        <th className="th-action">Action:</th>
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

        {/* ✅ Modal Popup */}
        {serviceModalOpen && (
          <div className="service-modal-overlay" onClick={closeModal} role="presentation">
            <div
              className="service-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="serviceModalTitle"
            >
              <h3 id="serviceModalTitle">
                {editingId === null ? "Add Service" : "Edit Service"}
              </h3>

              <input
                className="service-modal-input"
                type="text"
                placeholder="Enter service name..."
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveService();
                  if (e.key === "Escape") closeModal();
                }}
                autoFocus
              />

              <div className="service-modal-actions">
                <button type="button" className="service-btn cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button type="button" className="service-btn save" onClick={saveService}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
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