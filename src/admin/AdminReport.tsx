import { useEffect, useState, type ReactNode } from "react";
import "./AdminReport.css";
import SidebarAdmin from "./SidebarAdmin";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

type ReportSummary = {
  totalAppointmentsThisMonth: number;
  mostActiveClinic: string;
  newUsersThisWeek: number;
};

type ActivityItem = {
  id: string;
  type: "user" | "clinic" | "clinic-approved" | "clinic-rejected" | "appointment";
  text: string;
  time: string;
};

type AppointmentRow = {
  id: number;
  patient: string;
  clinic: string;
  schedule: string;
  status: string;
};

type AdminAppointmentApiRow = {
  id: number;
  patient_name: string;
  clinic_name: string;
  start_at: string;
  status: string;
};

type SummaryRow = {
  label: string;
  value: string | number;
};

const reportExamples = [
  "Total appointments per month",
  "Most active clinics",
  "New users per week",
];

const matchesSearch = (
  query: string,
  ...values: Array<string | number | null | undefined>
) =>
  !query ||
  values.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(query)
  );

export default function AdminReport() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPopupOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoadingSummary(true);
        const res = await fetch("http://localhost:5000/api/admin/reports/summary");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ReportSummary = await res.json();
        setSummary(data);
      } catch (e) {
        console.error("Load report summary error:", e);
        setSummary(null);
      } finally {
        setLoadingSummary(false);
      }
    };

    loadSummary();
  }, []);

  const loadActivity = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/recent-activity?limit=8");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ActivityItem[] = await res.json();
      setActivities(data);
    } catch (e) {
      console.error("Recent activity error:", e);
      setActivities([]);
    }
  };

  const loadAppointments = async () => {
    try {
      setLoadingAppointments(true);

      const res = await fetch("http://localhost:5000/api/admin/appointments");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: AdminAppointmentApiRow[] = await res.json();

      const mapped: AppointmentRow[] = data.map((a) => ({
        id: a.id,
        patient: a.patient_name,
        clinic: a.clinic_name,
        schedule: `${new Date(a.start_at).toLocaleDateString()} • ${new Date(
          a.start_at
        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        status: a.status,
      }));

      setAppointments(mapped);
    } catch (e) {
      console.error("Load appointments error:", e);
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    loadActivity();
    loadAppointments();
  }, []);

  const handleExportPDF = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/reports/export/pdf", {
        method: "GET",
      });

      if (!res.ok) throw new Error("Failed to export PDF");

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

  const onViewAppointment = (id: number) => {
    console.log("View appointment:", id);
  };

  const query = q.trim().toLowerCase();
  const summaryRows: SummaryRow[] = [
    {
      label: "Total appointments (this month)",
      value: loadingSummary
        ? "Loading..."
        : summary
        ? summary.totalAppointmentsThisMonth
        : "-",
    },
    {
      label: "Most active clinic",
      value: loadingSummary ? "Loading..." : summary ? summary.mostActiveClinic : "-",
    },
    {
      label: "New users (this week)",
      value: loadingSummary ? "Loading..." : summary ? summary.newUsersThisWeek : "-",
    },
  ];
  const filteredReportExamples = reportExamples.filter((item) =>
    matchesSearch(query, item)
  );
  const filteredSummaryRows = summaryRows.filter((row) =>
    matchesSearch(query, row.label, row.value)
  );
  const filteredActivities = activities.filter((activity) =>
    matchesSearch(
      query,
      activity.text,
      activity.type,
      new Date(activity.time).toLocaleString()
    )
  );
  const filteredAppointments = appointments.filter((appointment) =>
    matchesSearch(
      query,
      appointment.patient,
      appointment.clinic,
      appointment.schedule,
      appointment.status
    )
  );

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

            <form className="header-search" onSubmit={(event) => event.preventDefault()}>
              <input
                type="text"
                placeholder="Search reports..."
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
              <button aria-label="Search" type="submit" className="search-btn">
                <img src={searchIcon} alt="Search" />
              </button>
            </form>
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
            {/* LEFT CARD (UNCHANGED) */}
            <section className="admin-card admin-table-card reports-card">
              <div className="admin-table-header" />

              <div className="reports-body">
                <h3 className="reports-section-title">Examples</h3>

                <ul className="reports-list">
                  {filteredReportExamples.length === 0 ? (
                    <li>No report examples match your search.</li>
                  ) : (
                    filteredReportExamples.map((item) => <li key={item}>{item}</li>)
                  )}
                </ul>

                <h3 className="reports-section-title">Actions</h3>

                <div className="reports-actions">
                  <button type="button" className="pill pill-view">
                    Export CSV
                  </button>
                  <button type="button" className="pill pill-danger" onClick={handleExportPDF}>
                    Export PDF
                  </button>
                </div>

                <div className="reports-preview">
                  {filteredSummaryRows.length === 0 ? (
                    <div className="preview-row">
                      <span className="preview-label">No report metrics match your search.</span>
                    </div>
                  ) : (
                    filteredSummaryRows.map((row) => (
                      <div className="preview-row" key={row.label}>
                        <span className="preview-label">{row.label}</span>
                        <span className="preview-value">{row.value}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* RIGHT SIDE (REPLACED with Recent activity + Appointment Section) */}
            <aside className="dash-aside">
              {/* Recent activity */}
              <div className="dash-panel dash-right-top">
                <div className="dash-panel-title">Recent activity</div>

                <div className="dash-panel-body dash-body-small">
                  {filteredActivities.length === 0 ? (
                    <div className="activity-empty">No recent activity yet.</div>
                  ) : (
                    <ul className="activity-list">
                      {filteredActivities.slice(0, 3).map((item) => (
                        <li key={item.id} className={`activity-item ${item.type}`}>
                          <div className="activity-icon">
                            {item.type === "user" && "👤"}
                            {item.type === "clinic" && "🏥"}
                            {item.type === "clinic-approved" && "✅"}
                            {item.type === "clinic-rejected" && "❌"}
                            {item.type === "appointment" && "📅"}
                          </div>

                          <div className="activity-content">
                            <div className="activity-text">{item.text}</div>
                            <div className="activity-time">{new Date(item.time).toLocaleString()}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

             <Panel title="Appointment Section" className="appointment-panel">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Status</th>
                      <th className="th-action">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingAppointments ? (
                      <tr>
                        <td colSpan={3} className="td-empty">
                          Loading...
                        </td>
                      </tr>
                    ) : filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="td-empty">
                          Appointments API not connected yet.
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((ap) => (
                        <tr key={ap.id}>
                          <td>
                            <div className="t-main">{ap.patient}</div>
                            <div className="t-sub">{ap.clinic}</div>
                          </td>
                          <td>
                            <span className={`badge badge-${ap.status.toLowerCase()}`}>{ap.status}</span>
                          </td>
                          <td className="td-action">
                            <button className="btn-sm btn-view" onClick={() => onViewAppointment(ap.id)}>
                              View details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Panel>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`dash-panel ${className}`}>
      <div className="dash-panel-head">
        <div className="dash-panel-title">{title}</div>
      </div>
      <div className="dash-panel-body dash-panel-pad">{children}</div>
    </div>
  );
}
