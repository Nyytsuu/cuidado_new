import { useMemo, useState } from "react";
import "./ClinicAppoint.css";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";
import SidebarClinic from "./SidebarClinic";

type AppointmentStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

type AppointmentRow = {
  id: string;
  patientName: string;
  serviceType: string;
  date: string; // e.g. 02/28/26
  time: string; // e.g. 10:30 AM
  status: AppointmentStatus;
};

export default function ClinicAppoint() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  // ✅ sample data (replace later with API)
  const [appointments, setAppointments] = useState<AppointmentRow[]>([
    {
      id: "a1",
      patientName: "LeBron James",
      serviceType: "General Consultation",
      date: "02/28/26",
      time: "10:30 AM",
      status: "Pending",
    },
    {
      id: "a2",
      patientName: "Stephen Curry",
      serviceType: "Dental Checkup",
      date: "03/01/26",
      time: "02:00 PM",
      status: "Confirmed",
    },
    {
      id: "a3",
      patientName: "Kevin Durant",
      serviceType: "Eye Checkup",
      date: "02/25/26",
      time: "09:00 AM",
      status: "Completed",
    },
    {
      id: "a4",
      patientName: "Kyrie Irving",
      serviceType: "Vaccination",
      date: "02/26/26",
      time: "04:15 PM",
      status: "Cancelled",
    },
  ]);

  const statusClass = (status: AppointmentStatus) => {
    switch (status) {
      case "Pending":
        return "pill-warning";
      case "Confirmed":
        return "pill-success";
      case "Completed":
        return "pill-gray";
      case "Cancelled":
        return "pill-danger";
      default:
        return "";
    }
  };

  const handleConfirm = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Confirmed" } : a))
    );
  };

  const handleReject = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Cancelled" } : a))
    );
  };

  const handleComplete = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Completed" } : a))
    );
  };

  const handleReschedule = (row: AppointmentRow) => {
    // placeholder — connect to modal later
    alert(`Reschedule: ${row.patientName} (${row.date} ${row.time})`);
  };

  const handleViewPatient = (row: AppointmentRow) => {
    // placeholder — connect to patient details page/modal later
    alert(`View patient details: ${row.patientName}`);
  };

  const tableRows = useMemo(() => appointments, [appointments]);

  return (
    <div
      className={`ClinicAppoint with-sidebar ${
        isPopupOpen ? "modal-open" : ""
      }`}
    >
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
          <div className="admin-content-inner">
            <div className="admin-title">
              <h2>Appointments</h2>
            </div>

            <div className="admin-grid">
              <section className="admin-card admin-table-card">
                <div className="users-table">
                  {/* header row */}
                  <div className="users-row users-header">
                    <div className="users-cell">Patient Name</div>
                    <div className="users-cell">Service Type</div>
                    <div className="users-cell">Date</div>
                    <div className="users-cell">Time</div>
                    <div className="users-cell">Status</div>
                    <div className="users-cell">Actions</div>
                  </div>

                  {/* rows */}
                  {tableRows.map((row) => (
                    <div className="users-row" key={row.id}>
                      <div className="users-cell users-name">
                        {row.patientName}
                      </div>

                      <div className="users-cell">
                        <span className="pills">{row.serviceType}</span>
                      </div>

                      <div className="users-cell">
                        <span className="pills">{row.date}</span>
                      </div>

                      <div className="users-cell">
                        <span className="pills">{row.time}</span>
                      </div>

                      <div className="users-cell">
                        <span className={`pill ${statusClass(row.status)}`}>
                          {row.status}
                        </span>
                      </div>

                      <div className="users-cell">
                        <div className="users-actions">
                          <button
                            type="button"
                            className="pill pill-view"
                            onClick={() => handleViewPatient(row)}
                          >
                            View
                          </button>

                          {row.status === "Pending" && (
                            <>
                              <button
                                type="button"
                                className="pill pill-success"
                                onClick={() => handleConfirm(row.id)}
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                className="pill pill-danger"
                                onClick={() => handleReject(row.id)}
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {(row.status === "Pending" ||
                            row.status === "Confirmed") && (
                            <button
                              type="button"
                              className="pill pill-resched"
                              onClick={() => handleReschedule(row)}
                            >
                              Reschedule
                            </button>
                          )}

                          {row.status === "Confirmed" && (
                            <button
                              type="button"
                              className="pill pill-gray"
                              onClick={() => handleComplete(row.id)}
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="admin-right">
                <div className="admin-card admin-right-card small-card" />
                <div className="admin-card admin-right-card big-card" />
              </aside>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}