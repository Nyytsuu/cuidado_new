import { useMemo, useState } from "react";
import "./Patient.css";
import SidebarClinic from "./SidebarClinic";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

type PatientRow = {
  id: string;
  name: string;
  age: number;
  contact: string;
  lastVisit: string; // e.g. 02/20/26
};

export default function Patients() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  // ✅ sample data (replace with API later)
  const [patients] = useState<PatientRow[]>([
    { id: "p1", name: "LeBron James", age: 39, contact: "0917-123-4567", lastVisit: "02/20/26" },
    { id: "p2", name: "Stephen Curry", age: 37, contact: "0920-555-8899", lastVisit: "02/25/26" },
    { id: "p3", name: "Kevin Durant", age: 36, contact: "0999-111-2233", lastVisit: "01/30/26" },
    { id: "p4", name: "Kyrie Irving", age: 34, contact: "0933-222-3344", lastVisit: "02/01/26" },
  ]);

  const rows = useMemo(() => patients, [patients]);

  const viewProfile = (row: PatientRow) => {
    alert(`View patient profile: ${row.name}`);
  };

  const viewHistory = (row: PatientRow) => {
    alert(`See appointment history: ${row.name}`);
  };

  return (
    <div className={`admin-UserAppoint with-sidebar ${isPopupOpen ? "modal-open" : ""}`}>
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
              Patients
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

        {/* ✅ PATIENTS ADMIN CONTENT */}
        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="admin-title">
              <h2>Patients</h2>
            </div>

            <div className="admin-grid">
              <section className="admin-card admin-table-card">
                <div className="users-table">
                  {/* header row */}
                  <div className="users-row users-header">
                    <div className="users-cell">Patient Name</div>
                    <div className="users-cell">Age</div>
                    <div className="users-cell">Contact Number</div>
                    <div className="users-cell">Last Visit Date</div>
                    <div className="users-cell">Actions</div>
                  </div>

                  {/* rows */}
                  {rows.map((row) => (
                    <div className="users-row" key={row.id}>
                      <div className="users-cell users-name">{row.name}</div>

                      <div className="users-cell">
                        <span className="pills">{row.age}</span>
                      </div>

                      <div className="users-cell">
                        <span className="pills">{row.contact}</span>
                      </div>

                      <div className="users-cell">
                        <span className="pills">{row.lastVisit}</span>
                      </div>

                      <div className="users-cell">
                        <div className="users-actions">
                          <button type="button" className="pill pill-view" onClick={() => viewProfile(row)}>
                            View Profile
                          </button>

                          <button type="button" className="pill pill-history" onClick={() => viewHistory(row)}>
                            Appointment History
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="admin-right">
                <div className="admin-card admin-right-card small-card">
                    <h3>Schedule</h3>
                </div>
                <div className="admin-card admin-right-card big-card"> 
                    <h3>Schedule Option:</h3>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}