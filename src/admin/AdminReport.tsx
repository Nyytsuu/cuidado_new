import { useEffect, useState, type ReactNode } from "react";
import "./AdminReport.css";
import "./AdminHeader.css";
import "./AdminAppointmentPanel.css";
import SidebarAdmin from "./SidebarAdmin";
import AdminAppointmentDetailsModal, {
  type AdminAppointmentDetails,
} from "./AdminAppointmentDetailsModal";
import AdminHeader from "./AdminHeader";

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
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentDetails, setAppointmentDetails] =
    useState<AdminAppointmentDetails | null>(null);
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

  const handleExportCSV = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/reports/export/csv", {
        method: "GET",
      });

      if (!res.ok) throw new Error("Failed to export CSV");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `reports-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error exporting CSV");
      console.error(err);
    }
  };

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

  const onViewAppointment = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/appointments/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AdminAppointmentDetails = await res.json();
      setAppointmentDetails(data);
    } catch (e) {
      console.error("View appointment details error:", e);
      alert("Failed to load appointment details.");
    }
  };

  const query = q.trim().toLowerCase();
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
        <AdminHeader searchValue={q} onSearchChange={setQ} searchPlaceholder="Search reports..." />

        <section className="admin-content">
          <div className="admin-title">
            <h2>Reports</h2>
          </div>

          <div className="admin-grid">
            {/* LEFT — metric cards + export card */}
            <section className="reports-main-col">
              <div className="rp-metrics">
                <article className="rp-metric">
                  <div className="rp-metric-icon rp-ic-appt">📅</div>
                  <div className="rp-metric-text">
                    <span>Appointments This Month</span>
                    <strong>
                      {loadingSummary ? "…" : summary ? summary.totalAppointmentsThisMonth : "—"}
                    </strong>
                  </div>
                </article>

                <article className="rp-metric">
                  <div className="rp-metric-icon rp-ic-clinic">🏥</div>
                  <div className="rp-metric-text">
                    <span>Most Active Clinic</span>
                    <strong className="rp-metric-sm" title={summary?.mostActiveClinic || ""}>
                      {loadingSummary ? "…" : summary && summary.mostActiveClinic ? summary.mostActiveClinic : "—"}
                    </strong>
                  </div>
                </article>

                <article className="rp-metric">
                  <div className="rp-metric-icon rp-ic-users">👥</div>
                  <div className="rp-metric-text">
                    <span>New Users This Week</span>
                    <strong>
                      {loadingSummary ? "…" : summary ? summary.newUsersThisWeek : "—"}
                    </strong>
                  </div>
                </article>
              </div>

              <article className="rp-export-card">
                <div className="rp-export-head">
                  <div className="rp-export-badge">📊</div>
                  <div className="rp-export-heading">
                    <h3>Generate Report</h3>
                    <p>Download a snapshot of platform activity as CSV or PDF.</p>
                  </div>
                </div>

                <div className="rp-includes">
                  <span className="rp-includes-label">This report includes</span>
                  <ul>
                    {reportExamples.map((item) => (
                      <li key={item}>
                        <span className="rp-check">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rp-export-preview">
                  <div className="rp-preview-copy">
                    <span className="rp-includes-label">Report preview</span>
                    <h4>Platform activity snapshot</h4>
                    <p>
                      Review the latest appointment, clinic, and user activity before
                      downloading the final report.
                    </p>
                  </div>

                  <div className="rp-preview-grid">
                    <div className="rp-preview-stat">
                      <span>Appointments</span>
                      <strong>
                        {loadingSummary ? "..." : summary ? summary.totalAppointmentsThisMonth : "--"}
                      </strong>
                      <small>This month</small>
                    </div>
                    <div className="rp-preview-stat">
                      <span>Top clinic</span>
                      <strong title={summary?.mostActiveClinic || ""}>
                        {loadingSummary ? "..." : summary?.mostActiveClinic || "--"}
                      </strong>
                      <small>Most active</small>
                    </div>
                    <div className="rp-preview-stat">
                      <span>New users</span>
                      <strong>
                        {loadingSummary ? "..." : summary ? summary.newUsersThisWeek : "--"}
                      </strong>
                      <small>This week</small>
                    </div>
                  </div>
                </div>

                <div className="rp-export-actions">
                  <button type="button" className="rp-export-btn rp-csv" onClick={handleExportCSV}>
                    <span className="rp-dl" aria-hidden="true">⬇</span> Export CSV
                  </button>
                  <button type="button" className="rp-export-btn rp-pdf" onClick={handleExportPDF}>
                    <span className="rp-dl" aria-hidden="true">⬇</span> Export PDF
                  </button>
                </div>
              </article>
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

      {appointmentDetails && (
        <AdminAppointmentDetailsModal
          appointment={appointmentDetails}
          onClose={() => setAppointmentDetails(null)}
        />
      )}
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
