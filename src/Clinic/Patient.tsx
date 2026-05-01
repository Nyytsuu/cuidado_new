import { useEffect, useMemo, useState } from "react";
import "./Patient.css";
import SidebarClinic from "./SidebarClinic";
import ClinicScheduleAside from "./ClinicScheduleAside";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";
// logout
import { useNavigate } from "react-router-dom";



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

const getStoredClinicId = () => {
  try {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    if (user?.role === "clinic" && user?.id) {
      return Number(user.id);
    }

    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("userId");

    if (role === "clinic" && userId) {
      return Number(userId);
    }
  } catch {
    return 1;
  }

  return 1;
};

export default function Patients() {
  const API = "http://localhost:5000/api";
  const clinicId = useMemo(() => getStoredClinicId(), []);

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [loadingPatients, setLoadingPatients] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<PatientRow[]>([]);
   const [profilePopup, setProfilePopup] = useState<PatientRow | null>(null);
 
   // logout
   const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
   const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
   const navigate = useNavigate();

   const [historyPopup, setHistoryPopup] = useState<{
  patient: PatientRow;
  history: {
    date: string;
    service: string;
    status: string;
  }[];
} | null>(null);

  const isPopupOpen = Boolean(profilePopup || historyPopup);

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
  setProfilePopup(row);
};
    // later:
    // navigate(`/clinic/patients/${row.id}`);
  

 const viewHistory = (row: PatientRow) => {
  setHistoryPopup({
    patient: row,
    history: [
      {
        date: "03/10/25",
        service: "Dental Checkup",
        status: "Completed",
      },
      {
        date: "02/22/25",
        service: "Teeth Cleaning",
        status: "Cancelled",
      },
      {
        date: "01/15/25",
        service: "Consultation",
        status: "Completed",
      },
    ],
  });
};
    // later:
    // navigate(`/clinic/patients/${row.id}/history`);
  

  return (
    <div className={`Patient with-sidebar ${isPopupOpen ? "modal-open" : ""}`}>
      <SidebarClinic
              sidebarExpanded={sidebarExpanded}
              setSidebarExpanded={setSidebarExpanded}
              profileOpen={profileOpen}
              setProfileOpen={setProfileOpen}
              headerProfileOpen={headerProfileOpen}
              setHeaderProfileOpen={setHeaderProfileOpen}
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search dashboard..."
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
                
                <button className="logout-btn" onClick={() => {setHeaderProfileOpen(false);setShowLogoutConfirm(true);}}>Logout</button>
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
                    <div className="users-cell">Actions:</div>
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

              <div className="patient-schedule-wrapper">
  <ClinicScheduleAside apiBase={API} clinicId={clinicId} />
</div>
            </div>
          </div>
        </section>
      </main>
   
          {profilePopup && (
  <div
    className="service-modal-overlay"
    onClick={() => setProfilePopup(null)}
  >
    <div
      className="profile-card-modal"
      onClick={(e) => e.stopPropagation()}
    >
      {/* TOP HEADER STRIP */}
      <div className="profile-card-header-bg" />

      <div className="profile-card-body">

        {/* AVATAR */}
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar-large">
            {profilePopup.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* NAME + ROLE */}
        <div className="profile-main-info">
          <h2>{profilePopup.name}</h2>
          <span className="profile-badge">Active Patient</span>
        </div>

        {/* INFO GRID */}
        <div className="profile-info-grid">
          <div className="info-card">
            <span>Age</span>
            <strong>{profilePopup.age || "-"}</strong>
          </div>

          <div className="info-card">
            <span>Contact</span>
            <strong>{profilePopup.contact}</strong>
          </div>

          <div className="info-card">
            <span>Last Visit</span>
            <strong>{profilePopup.lastVisit}</strong>
          </div>

          <div className="info-card">
            <span>Status</span>
            <strong className="status-active">Active</strong>
          </div>
        </div>

        {/* NOTES */}
        <div className="profile-notes">
          <p>
            Regular patient with consistent visits and good medical compliance.
          </p>
        </div>

        {/* ACTION */}
        <div className="profile-actions">
          <button
            className="profile-close-btn"
            onClick={() => setProfilePopup(null)}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  </div>
)}
        
   {historyPopup && (
  <div
    className="service-modal-overlay"
    onClick={() => setHistoryPopup(null)}
  >
    <div
      className="history-card-modal"
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER STRIP */}
      <div className="history-header-bg" />

      <div className="history-card-body">

        {/* AVATAR */}
        <div className="history-avatar-wrapper">
          <div className="history-avatar">
            {historyPopup.patient.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* NAME */}
        <div className="history-main-info">
          <h2>{historyPopup.patient.name}</h2>
          <span className="history-badge">Appointment History</span>
        </div>

        {/* TIMELINE LIST */}
        <div className="history-timeline">
          {historyPopup.history.map((item, index) => (
            <div className="timeline-item" key={index}>

              <div className="timeline-dot" />

              <div className="timeline-content">
                <div className="timeline-top">
                  <span className="timeline-service">{item.service}</span>
                  <span className={`timeline-status ${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </div>

                <span className="timeline-date">{item.date}</span>
              </div>

            </div>
          ))}
        </div>

        {/* ACTION */}
        <div className="history-actions">
          <button
            className="profile-close-btn"
            onClick={() => setHistoryPopup(null)}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  </div>
)}
// logout
{showLogoutConfirm && (
  <div className="logout-confirm-overlay">
    <div className="logout-confirm-modal">
      <h3>Log out?</h3>
      <p>Are you sure you want to log out of your account?</p>

      <div className="logout-actions">
        <button
          className="btn-cancel"
          onClick={() => setShowLogoutConfirm(false)}
        >
          Cancel
        </button>

        <button
          className="btn-confirm"
          onClick={() => {
            setShowLogoutConfirm(false);
            setShowLogoutSuccess(true);

            setTimeout(() => {
              navigate("/signin");
            }, 1500);
          }}
        >
          Logout
        </button>
      </div>
    </div>
  </div>
)}


{showLogoutSuccess && (
  <div className="logout-popup-overlay">
    <div className="logout-popup">
      <div className="logout-icon">✓</div>
      <h3>Logged out successfully</h3>
    </div>
  </div>
)}
    </div>
  );
}
