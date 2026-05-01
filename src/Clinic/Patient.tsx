import { useEffect, useMemo, useState } from "react";
import "./Patient.css";
import SidebarClinic from "./SidebarClinic";
import ClinicScheduleAside from "./ClinicScheduleAside";
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
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search patients..."
      />

      <main className="preview-canvas">
        

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
      className="service-modal profile-popup-card"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="service-modal-body">

        {/* HEADER */}
        <div className="profile-popup-header">
          <div className="profile-avatar">
            {profilePopup.name.charAt(0).toUpperCase()}
          </div>

          <h3 className="profile-name">{profilePopup.name}</h3>
          <p className="profile-subtext">Patient Profile</p>
        </div>

        {/* DIVIDER */}
        <div className="profile-divider" />

        {/* DETAILS */}
        <div className="profile-details">

          <div className="profile-row">
            <span className="profile-label">Age</span>
            <span className="profile-value">
              {profilePopup.age || "-"}
            </span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Contact</span>
            <span className="profile-value">
              {profilePopup.contact}
            </span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Last Visit</span>
            <span className="profile-value">
              {profilePopup.lastVisit}
            </span>
          </div>

        </div>

        {/* BUTTON */}
        <div className="profile-footer">
          <button
            className="pill profile-close-btn"
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
      className="service-modal profile-popup-card"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="service-modal-body">

        {/* HEADER */}
        <div className="profile-popup-header">
          <div className="profile-avatar">
            {historyPopup.patient.name.charAt(0).toUpperCase()}
          </div>

          <h3 className="profile-name">
            {historyPopup.patient.name}
          </h3>
          <p className="profile-subtext">Appointment History</p>
        </div>

        {/* DIVIDER */}
        <div className="profile-divider" />

        {/* HISTORY LIST */}
        <div className="history-list">
          {historyPopup.history.map((item, index) => (
            <div className="history-item" key={index}>
              
              <div className="history-left">
                <span className="history-service">{item.service}</span>
                <span className="history-date">{item.date}</span>
              </div>

              <span
                className={`history-status ${
                  item.status.toLowerCase()
                }`}
              >
                {item.status}
              </span>

            </div>
          ))}
        </div>
        {/* BUTTON */}
        <div className="profile-footer">
          <button
            className="pill profile-close-btn"
            onClick={() => setHistoryPopup(null)}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  </div>
)}
    </div>
  );
}
