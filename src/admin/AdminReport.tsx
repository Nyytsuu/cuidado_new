import { useState } from "react";
import "./AdminReport.css";
import SidebarAdmin from "./SidebarAdmin";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

export default function AdminReport() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const handleExportPDF = async () => {
  try {
    const res = await fetch("http://localhost:5000/api/admin/reports/export/pdf", {
      method: "GET",
    });

    if (!res.ok) {
      throw new Error("Failed to export PDF");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "reports.pdf";
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert("Error exporting PDF");
    console.error(err);
  }
};

  return (
    <div className={`admin-UserReport with-sidebar ${isPopupOpen ? "modal-open" : ""}`}>
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
          <div className="admin-title">
            <h2>Reports</h2>
          </div>

          <div className="admin-grid">
            {/* LEFT CARD */}
            <section className="admin-card admin-table-card reports-card">
              <div className="admin-table-header" />

              <div className="reports-body">
                <h3 className="reports-section-title">Examples</h3>

                <ul className="reports-list">
                  <li>Total appointments per month</li>
                  <li>Most active clinics</li>
                  <li>New users per week</li>
                </ul>

                <h3 className="reports-section-title">Actions</h3>

                <div className="reports-actions">
                  <button type="button" className="pill pill-view">
                    Export CSV
                  </button>
                <button
                    type="button"
                    className="pill pill-danger"
                    onClick={handleExportPDF}
                    >
                    Export PDF
                    </button>
                                    </div>

                <div className="reports-preview">
                  <div className="preview-row">
                    <span className="preview-label">Total appointments (this month)</span>
                    <span className="preview-value">—</span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Most active clinic</span>
                    <span className="preview-value">—</span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">New users (this week)</span>
                    <span className="preview-value">—</span>
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT SIDE CARDS */}
            <aside className="admin-right">
              <div className="admin-card admin-right-card small-card" />
              <div className="admin-card admin-right-card big-card" />
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}