import { useMemo, useState } from "react";
import "./services.css";
import SidebarClinic from "./SidebarClinic";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

type ServiceRow = {
  id: string;
  name: string;
  description: string;
  price?: number;
  duration?: number; // minutes
  enabled: boolean;
};

export default function Services() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [services, setServices] = useState<ServiceRow[]>([
    {
      id: "s1",
      name: "General Consultation",
      description: "Basic health assessment and consultation.",
      price: 500,
      duration: 30,
      enabled: true,
    },
    {
      id: "s2",
      name: "Dental Checkup",
      description: "Routine dental examination and cleaning.",
      price: 800,
      duration: 45,
      enabled: true,
    },
    {
      id: "s3",
      name: "Pediatric Visit",
      description: "Child wellness check and consultation.",
      price: 600,
      duration: 30,
      enabled: false,
    },
    {
      id: "s4",
      name: "Vaccination",
      description: "Vaccination service with basic screening.",
      enabled: true,
    },
  ]);

  const rows = useMemo(() => services, [services]);

  const addService = () => {
    alert("Add new service (connect modal/form later)");
  };

  const editService = (row: ServiceRow) => {
    alert(`Edit service: ${row.name}`);
  };

  const deleteService = (id: string) => {
    const ok = confirm("Delete this service?");
    if (!ok) return;
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleService = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  return (
    // ✅ IMPORTANT: this MUST match your CSS selector ".services"
    <div className={`services with-sidebar ${isPopupOpen ? "modal-open" : ""}`}>
      <SidebarClinic
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
            <a className="nav-link" href="#">
              Home
            </a>
            <a className="nav-link" href="#">
              Services
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

        {/* ✅ SERVICES ADMIN CONTENT */}
        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="admin-title services-titlebar">
              <h2>Services</h2>

              <button
                type="button"
                className="pill pill-resched add-btn"
                onClick={addService}
              >
                + Add New Service
              </button>
            </div>

            <div className="admin-grid">
              <section className="admin-card admin-table-card">
                <div className="users-table">
                  {/* header row */}
                  <div className="users-row users-header">
                    <div className="users-cell">Service Name</div>
                    <div className="users-cell">Description</div>
                    <div className="users-cell">Price</div>
                    <div className="users-cell">Duration</div>
                    <div className="users-cell">Status</div>
                    <div className="users-cell">Actions</div>
                  </div>

                  {/* rows */}
                  {rows.map((row) => (
                    <div className="users-row" key={row.id}>
                      <div className="users-cell users-name">{row.name}</div>

                      <div className="users-cell">
                        <span className="pills pills-desc">{row.description}</span>
                      </div>

                      <div className="users-cell">
                        <span className="pills">
                          {row.price != null ? `₱${row.price}` : "—"}
                        </span>
                      </div>

                      <div className="users-cell">
                        <span className="pills">
                          {row.duration != null ? `${row.duration} min` : "—"}
                        </span>
                      </div>

                      <div className="users-cell">
                        <span
                          className={`pill ${
                            row.enabled ? "pill-success" : "pill-gray"
                          }`}
                        >
                          {row.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>

                      <div className="users-cell">
                        <div className="users-actions">
                          <button
                            type="button"
                            className="pill pill-view"
                            onClick={() => editService(row)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="pill pill-danger"
                            onClick={() => deleteService(row.id)}
                          >
                            Delete
                          </button>

                          <button
                            type="button"
                            className={`pill ${
                              row.enabled ? "pill-gray" : "pill-success"
                            }`}
                            onClick={() => toggleService(row.id)}
                          >
                            {row.enabled ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="admin-right">
                <div className="admin-card admin-right-card small-card">
                  <h3>Service Tips</h3>
                  <p>Add services your clinic offers and manage availability.</p>
                </div>

                <div className="admin-card admin-right-card big-card">
                  <h3>Examples</h3>
                  <p>• General Consultation</p>
                  <p>• Dental Checkup</p>
                  <p>• Pediatric Visit</p>
                  <p>• Vaccination</p>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}