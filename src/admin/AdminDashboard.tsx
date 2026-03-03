import { useEffect, useMemo, useState } from "react";
import SidebarAdmin from "./SidebarAdmin";
import "./AdminDashboard.css";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

/* ---------- TYPES ---------- */
type MetricsResponse = {
  totalUsers: number;
  totalClinics: number;
  pendingClinics: number;
  scheduledAppointments: number;
  userTrend: { day: string; total: number }[];
};

type ActivityItem = {
  id: string;
  type: "user" | "clinic" | "clinic-approved" | "clinic-rejected" | "appointment";
  text: string;
  time: string;
};

type ClinicRow = {
  id: number;
  clinic_name: string;
  email: string;
  phone?: string;
  province_id: number | null;
  municipality_id: number | null;
  barangay_id: number | null;
  address?: string | null;
  status: "pending" | "approved" | "rejected" | "disabled";
  created_at: string;
};

type LatestUserRow = {
  id: number;
  full_name: string;
  email: string;
  created_at: string;
};

type AppointmentRow = {
  id: number;
  patient: string;
  clinic: string;
  schedule: string;
  status: string;
};

export default function AdminDashboard() {
  const API = "http://localhost:5000/api/admin";

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(true);

  const [latestUsers, setLatestUsers] = useState<LatestUserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const loadClinics = async () => {
      try {
        setLoadingClinics(true);
        const res = await fetch(`${API}/clinics`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ClinicRow[] = await res.json();
        setClinics(data);
      } catch (e) {
        console.error("Load clinics error:", e);
        setClinics([]);
      } finally {
        setLoadingClinics(false);
      }
    };
    loadClinics();
  }, []);

  /*  ---------- LOAD METRICS ---------- */
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingMetrics(true);
        const res = await fetch("http://localhost:5000/api/admin/dashboard-metrics");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: MetricsResponse = await res.json();
        setMetrics(data);
      } catch (e) {
        console.error("Dashboard metrics error:", e);
        setMetrics(null);
      } finally {
        setLoadingMetrics(false);
      }
    };
    load();
  }, []);

  /* ---------- LOAD RECENT ACTIVITY ---------- */
  useEffect(() => {
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
    loadActivity();
  }, []);

  /* ---------- LOAD DASHBOARD TABLES ---------- */
  useEffect(() => {
    const loadTables = async () => {
      try {
        const [clinicsRes, usersRes] = await Promise.all([
          fetch("http://localhost:5000/api/admin/clinics?limit=20"),
          fetch("http://localhost:5000/api/admin/users/latest?limit=8"),
        ]);

        if (!clinicsRes.ok) throw new Error(`Clinics HTTP ${clinicsRes.status}`);
        if (!usersRes.ok) throw new Error(`Users HTTP ${usersRes.status}`);

        const clinicsData: ClinicRow[] = await clinicsRes.json();
        const usersData: LatestUserRow[] = await usersRes.json();

        setClinics(clinicsData);
        setLatestUsers(usersData);
      } catch (e) {
        console.error("Load tables error:", e);
        setClinics([]);
        setLatestUsers([]);
      }
    };

    loadTables();
  }, []);

  /* ---------- HELPERS ---------- */
  const userTrend = useMemo(() => {
    if (!metrics?.userTrend) return [];
    return metrics.userTrend.map((p) => {
      const d = new Date(p.day);
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      return { day: label, total: p.total };
    });
  }, [metrics]);

  const totalUsers = metrics?.totalUsers ?? 0;
  const totalClinics = metrics?.totalClinics ?? 0;
  const pendingClinicsCount = metrics?.pendingClinics ?? 0;
  const scheduledAppointments = metrics?.scheduledAppointments ?? 0;

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

  const locationText = (c: ClinicRow) =>
    `${c.address} (P:${c.province_id}, M:${c.municipality_id}, B:${c.barangay_id})`;

  const updateClinicStatus = async (id: number, status: "approved" | "rejected") => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/clinics/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setClinics((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    } catch (e) {
      console.error("Clinic status update error:", e);
      alert("Failed to update clinic status.");
    }
  };

  const loadAppointments = async () => {
    try {
      setLoadingAppointments(true);

      const res = await fetch("http://localhost:5000/api/admin/appointments");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      const mapped: AppointmentRow[] = data.map((a: any) => ({
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
    loadAppointments();
  }, []);

  const onViewAppointment = (id: number) => {
    console.log("View appointment:", id);
  };

  const loadLatestUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch(`${API}/users?limit=6`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LatestUserRow[] = await res.json();
      setLatestUsers(data);
    } catch (e) {
      console.error("Load latest users error:", e);
      setLatestUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadLatestUsers();
  }, []);

  return (
    <div className={`ad-wrap ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <SidebarAdmin
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
      />

      <main className="ad-main">
        <section className="dash-layout">
          {/* LEFT */}
          <div className="dash-maincol">
            <section className="dash-metrics">
              <div className="metric-card">
                <div className="metric-title">Total user</div>
                <div className="metric-box">{loadingMetrics ? "..." : totalUsers}</div>
              </div>

              <div className="metric-card">
                <div className="metric-title">Total clinic Registered</div>
                <div className="metric-box">{loadingMetrics ? "..." : totalClinics}</div>
              </div>

              <div className="metric-card">
                <div className="metric-title">Pending Clinic Approvals</div>
                <div className="metric-box">
                  {loadingMetrics ? "..." : pendingClinicsCount}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-title">Total Appointments Scheduled</div>
                <div className="metric-box">
                  {loadingMetrics ? "..." : scheduledAppointments}
                </div>
              </div>
            </section>

            {/* ================= USER TREND CHART ================= */}
<section className="dash-chart">
  <div className="dash-chart-head">
    <h3>User Trend (Last 7 Days)</h3>
  </div>

  <div className="dash-chart-card">
    <ResponsiveContainer width="100%" height={260}>
      <LineChart
        data={userTrend}
        margin={{
          top: 10,
          right: 20,
          left: 10,
          bottom: 35,   // ✅ space for X-axis labels
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis
          dataKey="day"
          height={30}          // ✅ reserve space
          tickMargin={10}      // ✅ spacing from axis
          interval={0}         // ✅ show all labels
        />

        <YAxis allowDecimals={false} />

        <Tooltip />

        <Line
          type="monotone"
          dataKey="total"
          stroke="#00bfa6"
          strokeWidth={3}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
</section>

            <section className="dash-grid dash-grid-2col">
              <div className="dash-left">
                <Panel title="Pending Approvals">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Clinic</th>
                        <th>Location</th>
                        <th>Date</th>
                        <th className="th-action-pending">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loadingClinics ? (
                        <tr>
                          <td colSpan={4} className="td-empty">Loading...</td>
                        </tr>
                      ) : clinics.filter((c) => c.status === "pending").length === 0 ? (
                        <tr>
                          <td colSpan={4} className="td-empty">No pending clinics.</td>
                        </tr>
                      ) : (
                        clinics
                          .filter((c) => c.status === "pending")
                          .slice(0, 6)
                          .map((c) => (
                            <tr key={c.id}>
                              <td>
                                <div className="t-main">{c.clinic_name}</div>
                                <div className="t-sub">{c.email}</div>
                              </td>
                              <td>{locationText(c)}</td>
                              <td>{fmtDate(c.created_at)}</td>
                              <td className="td-action">
                                <div className="t-actions">
                                  <button
                                    className="btn-sm btn-approve"
                                    onClick={() => updateClinicStatus(c.id, "approved")}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="btn-sm btn-reject"
                                    onClick={() => updateClinicStatus(c.id, "rejected")}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </Panel>

                <Panel title="Users / Patients Section">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th className="th-joined">
                          Joined
                          <Link to="/admin/users">
                            <button type="button" className="btn-outline btn-view-users">
                              View all
                            </button>
                          </Link>
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={2} className="td-empty">Loading...</td>
                        </tr>
                      ) : latestUsers.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="td-empty">No users yet.</td>
                        </tr>
                      ) : (
                        latestUsers.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <div className="t-main">{u.full_name}</div>
                              <div className="t-sub">{u.email}</div>
                            </td>
                            <td>{fmtDate(u.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </Panel>
              </div>

              <div className="dash-center">
                <Panel title="Clinic Section">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Clinic</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>

                    <tbody>
                      {clinics.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="td-empty">No clinics yet.</td>
                        </tr>
                      ) : (
                        clinics.slice(0, 10).map((c) => (
                          <tr key={c.id}>
                            <td>
                              <div className="t-main">{c.clinic_name}</div>
                              <div className="t-sub">{c.email}</div>
                            </td>
                            <td>{locationText(c)}</td>
                            <td>
                              <span className={`badge badge-${c.status}`}>{c.status}</span>
                            </td>
                            <td>{fmtDate(c.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </Panel>
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <aside className="dash-aside">
            <div className="dash-panel dash-right-top">
              <div className="dash-panel-title">Recent activity</div>
              <div className="dash-panel-body dash-body-small">
                {activities.length === 0 ? (
                  <div className="activity-empty">No recent activity yet.</div>
                ) : (
                  <ul className="activity-list">
                    {activities.map((item) => (
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
                          <div className="activity-time">
                            {new Date(item.time).toLocaleString()}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* ✅ Appointment Section (MATCH DESIGN) */}
            <Panel title="Appointment Section" className="appointment-panel">
  <div className="appt-xaxis">
    <table className="dash-table dash-table-appt">
      <thead>
        <tr>
          <th>Patient</th>
          <th>Schedule</th>
          <th>Status</th>
          <th className="th-action">Action</th>
        </tr>
      </thead>

      <tbody>
        {loadingAppointments ? (
          <tr>
            <td colSpan={4} className="td-empty">Loading appointments…</td>
          </tr>
        ) : appointments.length === 0 ? (
          <tr>
            <td colSpan={4} className="td-empty">No appointments yet.</td>
          </tr>
        ) : (
          appointments.map((ap) => (
            <tr key={ap.id}>
              <td>
                <div className="t-main">{ap.patient}</div>
                <div className="t-sub">{ap.clinic}</div>
              </td>

              <td>{ap.schedule}</td>

              <td>
                <span className={`badge badge-${ap.status.toLowerCase()}`}>
                  {ap.status}
                </span>
              </td>

              <td className="td-action">
                <button
                  className="btn-sm btn-view"
                  onClick={() => onViewAppointment(ap.id)}
                >
                  View details
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</Panel>
          </aside>
        </section>
      </main>
    </div>
  );
}

/* ✅ UPDATED Panel: supports className */
function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
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