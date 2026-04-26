import { useEffect, useMemo, useState } from "react";
import "./Patient.css";
import SidebarClinic from "./SidebarClinic";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";


type ApiPatientRow = {
  id: number;
  name: string;
  contact: string;
  date_of_birth: string;
  lastVisit: string;
};

type PatientRow = {
  id: string;
  name: string;
  age: number;
  contact: string;
  lastVisit: string;
};

export default function Patients() {
  const API = "http://localhost:5000/api";
  const clinicId = 1; // TODO: replace with logged-in clinic id

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [loadingPatients, setLoadingPatients] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<PatientRow[]>([]);

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;

    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return 0;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dob.getDate())
    ) {
      age--;
    }

    return age;
  };

  const formatLastVisit = (value: string) => {
    if (!value) return "-";

    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";

    return d.toLocaleDateString("en-PH", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    });
  };

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoadingPatients(true);

        const res = await fetch(
          `${API}/clinic/patients?clinic_id=${clinicId}`
        );
        if (!res.ok) throw new Error("Failed to fetch patients");

        const data = await res.json();

        const normalized: PatientRow[] = Array.isArray(data)
          ? data.map((item: ApiPatientRow) => ({
              id: String(item.id),
              name: item.name || "Unknown Patient",
              age: calculateAge(item.date_of_birth),
              contact: item.contact || "No contact",
              lastVisit: formatLastVisit(item.lastVisit),
            }))
          : [];

        setPatients(normalized);
      } catch (error) {
        console.error("Patients fetch error:", error);
        setPatients([]);
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchPatients();
  }, [API, clinicId]);

  const rows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return patients;

    return patients.filter(
      (row) =>
        row.name.toLowerCase().includes(keyword) ||
        row.contact.toLowerCase().includes(keyword) ||
        row.lastVisit.toLowerCase().includes(keyword)
    );
  }, [patients, searchTerm]);

  const viewProfile = (row: PatientRow) => {
    alert(`View patient profile: ${row.name}`);
    // later:
    // navigate(`/clinic/patients/${row.id}`);
  };

  const viewHistory = (row: PatientRow) => {
    alert(`See appointment history: ${row.name}`);
    // later:
    // navigate(`/clinic/patients/${row.id}/history`);
  };

  return (
    <div className={`Patient with-sidebar ${isPopupOpen ? "modal-open" : ""}`}>
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
              <input
                type="text"
                placeholder="Search keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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

        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="admin-title">
              <h2>Patients</h2>
            </div>

            <div className="admin-grid">
              <section className="admin-card admin-table-card">
                <div className="users-table">
                  <div className="users-row users-header">
                    <div className="users-cell">Patient Name</div>
                    <div className="users-cell">Age</div>
                    <div className="users-cell">Contact Number</div>
                    <div className="users-cell">Last Visit Date</div>
                    <div className="users-cell">Actions</div>
                  </div>

                  {loadingPatients ? (
                    <div className="users-row">
                      <div className="users-cell" style={{ gridColumn: "1 / -1" }}>
                        Loading patients...
                      </div>
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="users-row">
                      <div className="users-cell" style={{ gridColumn: "1 / -1" }}>
                        No patients found.
                      </div>
                    </div>
                  ) : (
                    rows.map((row) => (
                      <div className="users-row" key={row.id}>
                        <div className="users-cell users-name">{row.name}</div>

                        <div className="users-cell users-center">
                          <span className="pills">{row.age || "-"}</span>
                        </div>

                        <div className="users-cell users-center">
                          <span className="pills">{row.contact}</span>
                        </div>

                        <div className="users-cell users-center">
                          <span className="pills">{row.lastVisit}</span>
                        </div>

                        <div className="users-cell">
                          <div className="users-actions">
                            <button
                              type="button"
                              className="pill pill-view"
                              onClick={() => viewProfile(row)}
                            >
                              View Profile
                            </button>

                            <button
  type="button"
  className="pill pill-history"
  onClick={() => viewHistory(row)}
>
  <i className="bx bx-calendar-detail"></i>
  <span>Appointment History</span>
</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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