import React, { useState } from "react";
import "./ClinicProfile.css";
import SidebarAdmin from "../admin/SidebarAdmin";

import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

import {
  FaPhoneAlt,
  FaClipboardList,
  FaClock,
  FaUserMd,
  FaMapMarkerAlt,
  FaRegClock,
  FaStethoscope,
  FaPlus,
} from "react-icons/fa";

const services = [
  "General Consultation",
  "Vaccination",
  "Dental Checkup",
  "Laboratory Test",
];

const ClinicProfile: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  return (
    <>
      <SidebarAdmin
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
      />

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
          <a className="nav-link" href="/clinic/dashboard">
            Home
          </a>
          <a className="nav-link" href="/clinic/appointments">
            Appointments
          </a>

          <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
            <button
              type="button"
              className="nav-link profile-btn"
              onClick={() => setHeaderProfileOpen((prev) => !prev)}
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

      <div className="clinic-page">
        <div className="clinic-container">
          <div className="top-grid">
            <aside className="card profile-card">
              <div className="logo-circle">
                <FaPlus />
              </div>

              <h1 className="clinic-name">Cavs</h1>
              <h2 className="clinic-subtitle">Cavs Medical Clinic</h2>
              <p className="clinic-email">cavsclinic@email.com</p>

              <div className="clinic-type">
                <FaStethoscope />
                <span>General Clinic</span>
              </div>

              <button className="edit-btn">Edit Clinic Profile</button>
            </aside>

            <div className="right-column">
              <section className="card info-card">
                <h3 className="section-title">Clinic Information</h3>

                <div className="info-columns">
                  <div className="info-group">
                    <div className="info-row">
                      <FaPhoneAlt className="info-icon" />
                      <span>+63 991 234 5678</span>
                    </div>

                    <div className="info-row">
                      <FaClipboardList className="info-icon" />
                      <span>License No: CLN-203942</span>
                    </div>

                    <div className="info-row">
                      <FaClock className="info-icon" />
                      <span>Years of Operation: 5 years</span>
                    </div>
                  </div>

                  <div className="clinic-divider" />

                  <div className="info-group">
                    <div className="info-row">
                      <FaClipboardList className="info-icon" />
                      <span>Phone:</span>
                    </div>

                    <div className="info-row">
                      <FaRegClock className="info-icon" />
                      <span>CLN-203942</span>
                    </div>

                    <div className="info-row align-start">
                      <FaUserMd className="info-icon" />
                      <div>
                        <div className="manager-name">Dr. Juan Dela Cruz</div>
                        <div className="manager-role">Clinic Manager</div>
                      </div>
                    </div>

                    <div className="info-row">
                      <FaPhoneAlt className="info-icon" />
                      <span>+63 987 654 3210</span>
                    </div>
                  </div>
                </div>
              </section>

              <div className="middle-grid">
                <section className="card small-card">
                  <h3 className="section-title">Services Offered</h3>
                  <ul className="bullet-list">
                    {services.map((service) => (
                      <li key={service}>{service}</li>
                    ))}
                  </ul>
                </section>

                <section className="card small-card">
                  <h3 className="section-title">Operating Hours</h3>
                  <div className="hours-list">
                    <p>
                      <strong>Opening:</strong> 08:00 AM
                    </p>
                    <p>
                      <strong>Closing:</strong> 06:00 PM
                    </p>
                    <p>
                      <strong>Days:</strong> Mon - Sat
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <div className="bottom-grid">
            <section className="card summary-card">
              <div className="summary-header">
                <FaStethoscope className="summary-icon teal" />
                <h3>Services Offered</h3>
              </div>
              <ul className="bullet-list compact">
                {services.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
            </section>

            <section className="card summary-card">
              <div className="summary-header">
                <FaClock className="summary-icon teal" />
                <h3>Operating Hours</h3>
              </div>
              <ul className="bullet-list compact">
                <li>Opening: 08:00 AM</li>
                <li>Closing: 06:00 PM</li>
                <li>Days: Mon - Sat</li>
              </ul>
            </section>

            <section className="card summary-card">
              <div className="summary-header">
                <FaMapMarkerAlt className="summary-icon teal" />
                <h3>Clinic Address</h3>
              </div>
              <div className="address-text">
                <p>Dasmariñas, Cavite</p>
                <p>Barangay Salawag</p>
                <p>Blk 1, Blk 2 Lot 8</p>
              </div>
            </section>

            <section className="card summary-card">
              <div className="summary-header">
                <FaRegClock className="summary-icon gold" />
                <h3>Account Status</h3>
              </div>

              <div className="status-pill">
                <span className="status-dot" />
                <span>Pending Approval</span>
              </div>

              <p className="member-since">Member since: March 2026</p>

              <button className="contact-btn">Contact Admin</button>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClinicProfile;