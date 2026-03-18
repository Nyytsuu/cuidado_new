import type { Dispatch, SetStateAction } from "react";
import "./SidebarAdmin.css";
import { Link, useNavigate } from "react-router-dom";

import dashboardIcon from "../img/dashboard.png";
import clinicIcon from "../img/calendar.png";
import appointmentIcon from "../img/appointment.png";
import userIcon from "../img/friends.png";
import serviceIcon from "../img/doctor-bag.png";
import logoutIcon from "../img/logout.png";

import conditionIcon from "../img/stethoscope.png";
import symptomIcon from "../img/thermometer.png";
import mappingIcon from "../img/link.png";

interface SidebarProps {
  sidebarExpanded: boolean;
  setSidebarExpanded: Dispatch<SetStateAction<boolean>>;
  profileOpen: boolean;
  setProfileOpen: Dispatch<SetStateAction<boolean>>;
}

export default function SidebarAdmin({
  sidebarExpanded,
  setSidebarExpanded,
}: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("clinic_token");
    localStorage.removeItem("user_token");
    navigate("/signin", { replace: true });
  };

  return (
    <div className="SidebarAdmin">
      <aside className={`sidebar ${sidebarExpanded ? "expanded" : ""}`}>
        <div className="sidebar-top">
          <button
            className="sidebar-toggle"
            aria-label="Toggle sidebar"
            type="button"
            onClick={() => setSidebarExpanded((prev) => !prev)}
          >
            ☰
          </button>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-item">
            <Link to="/admin/dashboard">
              <img src={dashboardIcon} alt="Dashboard" />
              <span>Dashboard</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/admin/clinics">
              <img src={clinicIcon} alt="Clinics" />
              <span>Clinics</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/admin/appointments">
              <img src={appointmentIcon} alt="Appointments" />
              <span>Appointments</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/admin/users">
              <img src={userIcon} alt="Users" />
              <span>Users</span>
            </Link>
          </div>

          <div className="sidebar-item">
            <Link to="/admin/services">
              <img src={serviceIcon} alt="Services" />
              <span>Services</span>
            </Link>
          </div>

          <div className="sidebar-group">
            <div className="sidebar-label">Medical</div>

            <div className="sidebar-item">
              <Link to="/admin/conditional">
                <img src={conditionIcon} alt="Conditions" />
                <span>Conditions</span>
              </Link>
            </div>

            <div className="sidebar-item">
              <Link to="/admin/symptoms">
                <img src={symptomIcon} alt="Symptoms" />
                <span>Symptoms</span>
              </Link>
            </div>

            <div className="sidebar-item">
              <Link to="/admin/condition-symptom-mapping">
                <img src={mappingIcon} alt="Mapping" />
                <span>Mapping</span>
              </Link>
            </div>
          </div>

          <div className="sidebar-item logout">
            <button type="button" className="logout-btn" onClick={handleLogout}>
              <img src={logoutIcon} alt="Logout icon" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
