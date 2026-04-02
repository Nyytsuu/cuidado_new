import  { useState } from "react";
import "./UserAppointment.css";
import UserSidebar from "../Categories/UserSidebar";
import {
  Filter,
  Plus,
  CalendarDays,
  MapPin,
  MoreVertical,
  Video,
  Lightbulb,
} from "lucide-react";

const appointments = [
  {
    time: "10:30 AM",
    doctor: "Dr. Sarah Williams",
    specialty: "Cardiologist",
    clinic: "City Health Center",
    date: "May 16, 2024",
    day: "Thursday",
    status: "Confirmed",
    image: "https://i.pravatar.cc/60?img=32",
  },
  {
    time: "02:00 PM",
    doctor: "Dr. David Brown",
    specialty: "Pediatrics",
    clinic: "Sunshine Medical Clinic",
    date: "May 21, 2024",
    day: "Tuesday",
    status: "Pending",
    image: "https://i.pravatar.cc/60?img=15",
  },
  {
    time: "11:00 AM",
    doctor: "Dr. Emily Chen",
    specialty: "Dermatologist",
    clinic: "Skin Care Solutions",
    date: "May 28, 2024",
    day: "Tuesday",
    status: "Confirmed",
    image: "https://i.pravatar.cc/60?img=32",
  },
  {
    time: "03:30 PM",
    doctor: "Dr. Michael Lee",
    specialty: "Orthopedist",
    clinic: "Ortho Plus Clinic",
    date: "Jun 3, 2024",
    day: "Monday",
    status: "Rescheduled",
    image: "https://i.pravatar.cc/60?img=68",
  },
];

function UserAppointmentsContent() {
  return (
    <div className="appointments-page">
      <div className="appointments-topbar">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">
            Manage your upcoming and past medical appointments.
          </p>
        </div>

        <div className="top-actions">
          <button className="filter-btn">
            <Filter size={18} />
            Filter
          </button>

          <button className="book-btn">
            <Plus size={18} />
            Book Appointment
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className="tab active">Upcoming</button>
        <button className="tab">Past</button>
        <button className="tab">Calendar</button>
      </div>

      <div className="appointments-grid">
        <div className="left-column">
          <div className="card calendar-card">
            <div className="calendar-header">
              <button>&lt;</button>
              <h3>May 2024</h3>
              <button>&gt;</button>
            </div>

            <div className="calendar-weekdays">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="calendar-days">
              <span className="muted">28</span>
              <span className="muted">29</span>
              <span className="muted">30</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
              <span>6</span>
              <span>7</span>
              <span>8</span>
              <span>9</span>
              <span>10</span>
              <span>11</span>
              <span>12</span>
              <span>13</span>
              <span>14</span>
              <span>15</span>
              <span className="selected">16</span>
              <span>17</span>
              <span>18</span>
              <span>19</span>
              <span>20</span>
              <span>21</span>
              <span>22</span>
              <span>23</span>
              <span>24</span>
              <span>25</span>
              <span>26</span>
              <span>27</span>
              <span>28</span>
              <span>29</span>
              <span>30</span>
              <span>31</span>
              <span className="muted">1</span>
            </div>

            <div className="today-box">
              <p className="today-label">Today • May 16, 2024</p>

              <div className="today-appointment">
                <div className="today-time">10:30 AM</div>

                <img
                  src="https://i.pravatar.cc/60?img=32"
                  alt="doctor"
                  className="today-avatar"
                />

                <div className="today-info">
                  <h4>Dr. Sarah Williams</h4>
                  <p>Cardiology</p>
                  <span className="status confirmed">Confirmed</span>
                  <div className="today-location-row">
                    <span>City Health Center</span>
                    <a href="/">View</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="center-column">
          <div className="card appointments-card">
            <h2>Upcoming Appointments</h2>

            <div className="appointment-list">
              {appointments.map((item, index) => (
                <div className="appointment-item" key={index}>
                  <div className="appointment-time">{item.time}</div>

                  <img
                    src={item.image}
                    alt={item.doctor}
                    className="doctor-avatar"
                  />

                  <div className="appointment-info">
                    <h3>{item.doctor}</h3>
                    <p>{item.specialty}</p>
                    <div className="clinic-row">
                      <MapPin size={14} />
                      <span>{item.clinic}</span>
                    </div>
                  </div>

                  <div className="appointment-date">
                    <div className="date-row">
                      <CalendarDays size={16} />
                      <span>{item.date}</span>
                    </div>
                    <small>{item.day}</small>
                  </div>

                  <div className={`status ${item.status.toLowerCase()}`}>
                    {item.status}
                  </div>

                  <button className="more-btn">
                    <MoreVertical size={18} />
                  </button>
                </div>
              ))}
            </div>

            <button className="view-all-btn">View All Appointments →</button>
          </div>

          <div className="card action-card">
            <div>
              <h3>Need to make a change?</h3>
              <p>Reschedule or cancel your appointment easily.</p>
            </div>

            <div className="change-actions">
              <button className="reschedule-btn">Reschedule</button>
              <button className="cancel-btn">Cancel Appointment</button>
            </div>
          </div>
        </div>

        <div className="right-column">
          <div className="card summary-card">
            <div className="summary-head">
              <div className="summary-icon">
                <CalendarDays size={22} />
              </div>
              <div>
                <h3>Appointment Summary</h3>
                <h1>4</h1>
                <p>Upcoming Appointments</p>
              </div>
            </div>

            <div className="summary-stats">
              <div className="stat-box green">
                <h4>3</h4>
                <p>Confirmed</p>
              </div>
              <div className="stat-box blue">
                <h4>1</h4>
                <p>Pending</p>
              </div>
              <div className="stat-box red">
                <h4>0</h4>
                <p>Canceled</p>
              </div>
            </div>
          </div>

          <div className="card quick-card">
            <h3>Quick Actions</h3>

            <div className="quick-action">
              <div className="quick-icon">
                <CalendarDays size={20} />
              </div>
              <div>
                <h4>Book Appointment</h4>
                <p>Find a doctor and time</p>
              </div>
            </div>

            <div className="quick-action">
              <div className="quick-icon">
                <MapPin size={20} />
              </div>
              <div>
                <h4>Find Clinic</h4>
                <p>Search nearby clinics</p>
              </div>
            </div>

            <div className="quick-action">
              <div className="quick-icon">
                <Video size={20} />
              </div>
              <div>
                <h4>Telehealth Visit</h4>
                <p>Consult from home</p>
              </div>
            </div>
          </div>

          <div className="card health-card">
            <div className="health-head">
              <Lightbulb size={20} />
              <h3>Health Tip</h3>
            </div>
            <p>
              Regular check-ups help detect health issues early and keep you on
              track for a healthier life.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserAppointments() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  return (
    <div className={`user-layout ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <main className="page-content">
        <UserAppointmentsContent />
      </main>
    </div>
  );
}