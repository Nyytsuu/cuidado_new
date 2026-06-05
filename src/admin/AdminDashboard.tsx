import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import SidebarAdmin from "./SidebarAdmin";
import "./AdminDashboard.css";
import "./AdminHeader.css";
import "./AdminAppointmentPanel.css";
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

import AdminHeader from "./AdminHeader";

const ADMIN_API = "http://localhost:5000/api/admin";

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
  startAt: string;
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

type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "approved"
  | "rejected"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "reschedule_requested";

type AppointmentDetails = {
  id: number;
  user_id: number;
  clinic_id: number;
  start_at: string;
  end_at: string | null;
  purpose: string | null;
  symptoms: string | null;
  patient_note: string | null;
  clinic_note: string | null;
  status: AppointmentStatus;
  cancelled_at: string | null;
  cancelled_by: "patient" | "clinic" | "admin" | null;
  cancel_reason: string | null;
  completed_at: string | null;
  patient_name_snapshot: string | null;
  patient_phone_snapshot: string | null;
  clinic_name_snapshot: string | null;
  created_at: string;
  updated_at: string;
};

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

const toStatusKey = (status: string) =>
  String(status || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

const toStatusLabel = (status: string, compact = false) => {
  const key = toStatusKey(status);
  if (key === "reschedule-requested") {
    return compact ? "Reschedule" : "Reschedule Requested";
  }

  return key
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export default function AdminDashboard() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AppointmentDetails | null>(null);

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(true);

  const [latestUsers, setLatestUsers] = useState<LatestUserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    const previous = {
      htmlHeight: html.style.height,
      htmlOverflowY: html.style.overflowY,
      bodyHeight: body.style.height,
      bodyOverflowY: body.style.overflowY,
      bodyDisplay: body.style.display,
      bodyAlignItems: body.style.alignItems,
      bodyJustifyContent: body.style.justifyContent,
      rootHeight: root?.style.height || "",
      rootMinHeight: root?.style.minHeight || "",
      rootWidth: root?.style.width || "",
    };

    html.style.height = "auto";
    html.style.overflowY = "auto";
    body.style.height = "auto";
    body.style.overflowY = "auto";
    body.style.display = "block";
    body.style.alignItems = "stretch";
    body.style.justifyContent = "flex-start";

    if (root) {
      root.style.height = "auto";
      root.style.minHeight = "100vh";
      root.style.width = "100%";
    }

    return () => {
      html.style.height = previous.htmlHeight;
      html.style.overflowY = previous.htmlOverflowY;
      body.style.height = previous.bodyHeight;
      body.style.overflowY = previous.bodyOverflowY;
      body.style.display = previous.bodyDisplay;
      body.style.alignItems = previous.bodyAlignItems;
      body.style.justifyContent = previous.bodyJustifyContent;

      if (root) {
        root.style.height = previous.rootHeight;
        root.style.minHeight = previous.rootMinHeight;
        root.style.width = previous.rootWidth;
      }
    };
  }, []);

  useEffect(() => {
    const loadClinics = async () => {
      try {
        setLoadingClinics(true);
        const res = await fetch(`${ADMIN_API}/clinics`);
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

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingMetrics(true);
        const res = await fetch(`${ADMIN_API}/dashboard-metrics`);
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

  useEffect(() => {
    const loadActivity = async () => {
      try {
        const res = await fetch(`${ADMIN_API}/recent-activity?limit=8`);
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

  useEffect(() => {
    const loadTables = async () => {
      try {
        const [clinicsRes, usersRes] = await Promise.all([
          fetch(`${ADMIN_API}/clinics?limit=20`),
          fetch(`${ADMIN_API}/users?limit=8`),
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

  const userTrend = useMemo(() => {
    if (!metrics?.userTrend) return [];
    return metrics.userTrend.map((p) => {
      const d = new Date(p.day);
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      return { day: label, total: Number(p.total || 0) };
    });
  }, [metrics]);

  const userTrendMax = useMemo(
    () => userTrend.reduce((max, item) => Math.max(max, item.total), 0),
    [userTrend]
  );

  const userTrendYAxisMax = Math.max(1, Math.ceil(userTrendMax * 1.2));
  const hasUserTrendData = userTrendMax > 0;

  const totalUsers = metrics?.totalUsers ?? 0;
  const totalClinics = metrics?.totalClinics ?? 0;
  const pendingClinicsCount = metrics?.pendingClinics ?? 0;
  const scheduledAppointments = metrics?.scheduledAppointments ?? 0;

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

  const locationText = (c: ClinicRow) => {
    const clinic = c as ClinicRow & {
      provinceId?: number | null;
      municipalityId?: number | null;
      barangayId?: number | null;
    };
    const address = clinic.address?.trim() || "No address";
    const province = clinic.province_id ?? clinic.provinceId;
    const municipality = clinic.municipality_id ?? clinic.municipalityId;
    const barangay = clinic.barangay_id ?? clinic.barangayId;
    const parts = [
      province ? `P:${province}` : null,
      municipality ? `M:${municipality}` : null,
      barangay ? `B:${barangay}` : null,
    ].filter(Boolean);

    return parts.length > 0 ? `${address} (${parts.join(", ")})` : address;
  };

  const dashboardQuery = q.trim().toLowerCase();
  const filteredClinics = clinics.filter((clinic) =>
    matchesSearch(
      dashboardQuery,
      clinic.clinic_name,
      clinic.email,
      clinic.phone,
      clinic.status,
      locationText(clinic),
      fmtDate(clinic.created_at)
    )
  );
  const pendingClinics = filteredClinics.filter(
    (clinic) => clinic.status === "pending"
  );
  const filteredLatestUsers = latestUsers.filter((user) =>
    matchesSearch(
      dashboardQuery,
      user.full_name,
      user.email,
      fmtDate(user.created_at)
    )
  );
  const filteredActivities = activities.filter((activity) =>
    matchesSearch(
      dashboardQuery,
      activity.text,
      activity.type,
      new Date(activity.time).toLocaleString()
    )
  );
  const filteredAppointments = appointments.filter((appointment) =>
    matchesSearch(
      dashboardQuery,
      appointment.patient,
      appointment.clinic,
      appointment.schedule,
      appointment.status,
      toStatusLabel(appointment.status)
    )
  );


  const updateClinicStatus = async (id: number, status: "approved" | "rejected") => {
    try {
      const res = await fetch(`${ADMIN_API}/clinics/${id}/status`, {
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

      const res = await fetch(`${ADMIN_API}/appointments`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: AdminAppointmentApiRow[] = await res.json();

      const mapped: AppointmentRow[] = data.map((a) => ({
        id: a.id,
        patient: a.patient_name,
        clinic: a.clinic_name,
        startAt: a.start_at,
        schedule: `${new Date(a.start_at).toLocaleDateString()} - ${new Date(
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

  const loadLatestUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch(`${ADMIN_API}/users?limit=6`);
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

  const viewDetails = async (id: number) => {
    try {
      const res = await fetch(`${ADMIN_API}/appointments/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AppointmentDetails = await res.json();
      setSelected(data);
      setIsPopupOpen(true);
    } catch (e) {
      console.error("View details error:", e);
      alert("Failed to load appointment details.");
    }
  };

  return (
    <div
      className={`admin-dashboard-page admin-wrap ${
        sidebarExpanded ? "sidebar-expanded" : ""
      }`}
    >
      <SidebarAdmin
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
      />

      <main className="admin-main">
        <AdminHeader searchValue={q} onSearchChange={setQ} />

        <section className="dash-layout">
          <div className="dash-maincol">
            <section className="dash-metrics">
              <div className="metric-card">
                <div className="metric-title">Total Users</div>
                <div className="metric-box">{loadingMetrics ? "..." : totalUsers}</div>
              </div>

              <div className="metric-card">
                <div className="metric-title">Registered Clinics</div>
                <div className="metric-box">{loadingMetrics ? "..." : totalClinics}</div>
              </div>

              <div className="metric-card">
                <div className="metric-title">Pending Clinic Approvals</div>
                <div className="metric-box">
                  {loadingMetrics ? "..." : pendingClinicsCount}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-title">Scheduled Appointments</div>
                <div className="metric-box">
                  {loadingMetrics ? "..." : scheduledAppointments}
                </div>
              </div>
            </section>

            <section className="dash-feature-grid">
              <section className="dash-chart">
                <div className="dash-chart-head">
                  <h3>User Trend (Last 7 Days)</h3>
                </div>

                <div
                  className={`dash-chart-card ${
                    hasUserTrendData ? "" : "is-empty-trend"
                  }`}
                >
                  <ResponsiveContainer width="100%" height={230}>
                    <LineChart
                      data={userTrend}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 10,
                        bottom: 25,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" height={30} tickMargin={10} interval={0} />
                      <YAxis
                        allowDecimals={false}
                        domain={[0, userTrendYAxisMax]}
                        tickCount={4}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#00bfa6"
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  {!loadingMetrics && !hasUserTrendData && (
                    <div className="trend-empty-note">
                      No new users in the last 7 days.
                    </div>
                  )}
                </div>
              </section>

              <Panel title="Recent Activity" className="activity-panel">
                {filteredActivities.length === 0 ? (
                  <div className="activity-empty">No recent activity yet.</div>
                ) : (
                  <ul className="activity-list">
                    {filteredActivities.slice(0, 6).map((item) => (
                      <li key={item.id} className={`activity-item ${item.type}`}>
                        <div className="activity-icon">
                          {item.type === "user" && "U"}
                          {item.type === "clinic" && "CL"}
                          {item.type === "clinic-approved" && "OK"}
                          {item.type === "clinic-rejected" && "NO"}
                          {item.type === "appointment" && "AP"}
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
              </Panel>
            </section>

            <section className="dash-grid dash-grid-2col dash-grid-overview">
              <div className="dash-left">
                <Panel title="Pending Approvals ">
                  <table className="dash-table dash-table-pending">
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
                          <td colSpan={4} className="td-empty">
                            Loading...
                          </td>
                        </tr>
                      ) : pendingClinics.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="td-empty">
                            No pending clinics.
                          </td>
                        </tr>
                      ) : (
                        pendingClinics.slice(0, 6).map((c) => (
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
              </div>

              <div className="dash-center">
                <Panel title="Appointments" className="appointment-panel">
                  <div className="appointment-list">
                    {loadingAppointments ? (
                      <div className="td-empty">Loading...</div>
                    ) : filteredAppointments.length === 0 ? (
                      <div className="td-empty">No appointments yet.</div>
                    ) : (
                      filteredAppointments.slice(0, 8).map((ap) => {
                        const statusKey = toStatusKey(ap.status);

                        return (
                          <div className="appointment-row" key={ap.id}>
                            <div className="appointment-info">
                              <div className="t-main">{ap.patient}</div>
                              <div className="t-sub">
                                {ap.clinic} - {ap.schedule}
                              </div>
                            </div>

                            <div className="appointment-controls">
                              <span
                                className={`appt-badge appt-status-badge badge-${statusKey}`}
                                title={toStatusLabel(ap.status)}
                              >
                                {toStatusLabel(ap.status, true)}
                              </span>

                              <button
                                type="button"
                                className="appt-badge appt-view-btn badge-view"
                                onClick={() => viewDetails(ap.id)}
                              >
                                View
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Panel>
              </div>
            </section>

            <section className="dash-grid dash-grid-2col dash-grid-data">
              <div className="dash-left">
                <Panel
                  title="Users / Patients"
                  actions={
                    <Link to="/admin/users">
                      <button type="button" className="btn-outline btn-view-users">
                        View all
                      </button>
                    </Link>
                  }
                >
                  <table className="dash-table dash-table-users">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Joined</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={2} className="td-empty">
                            Loading...
                          </td>
                        </tr>
                      ) : filteredLatestUsers.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="td-empty">
                            No users yet.
                          </td>
                        </tr>
                      ) : (
                        filteredLatestUsers.map((u) => (
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
                <Panel title="Clinics">
                  <table className="dash-table dash-table-clinics">
                    <thead>
                      <tr>
                        <th>Clinic</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredClinics.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="td-empty">
                            No clinics yet.
                          </td>
                        </tr>
                      ) : (
                        filteredClinics.slice(0, 10).map((c) => (
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

          <aside className="dash-aside">
            <div className="dash-panel-title">Recent Activity</div>
            <div className="dash-panel dash-right-top">
              <div className="dash-panel-body dash-body-small">
                {filteredActivities.length === 0 ? (
                  <div className="activity-empty">No recent activity yet.</div>
                ) : (
                  <ul className="activity-list">
                    {filteredActivities.map((item) => (
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

            <Panel title="Appointments" className="appointment-panel">
              <div className="appointment-list">
                {loadingAppointments ? (
                  <div className="td-empty">Loading...</div>
                ) : filteredAppointments.length === 0 ? (
                  <div className="td-empty">No appointments yet.</div>
                ) : (
                  filteredAppointments.map((ap) => {
                    const statusKey = toStatusKey(ap.status);

                    return (
                      <div className="appointment-row" key={ap.id}>
                        <div className="appointment-info">
                          <div className="t-main">{ap.patient}</div>
                          <div className="t-sub">
                            {ap.clinic} - {ap.schedule}
                          </div>
                        </div>

                        <div className="appointment-controls">
                          <span
                            className={`appt-badge appt-status-badge badge-${statusKey}`}
                            title={toStatusLabel(ap.status)}
                          >
                            {toStatusLabel(ap.status, true)}
                          </span>

                          <button
                            type="button"
                            className="appt-badge appt-view-btn badge-view"
                            onClick={() => viewDetails(ap.id)}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Panel>
          </aside>
        </section>
      </main>

      {isPopupOpen && selected && (
        <div className="popup-overlay" onClick={() => setIsPopupOpen(false)}>
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>
            <h3>Appointment Details</h3>

            <div className="popup-grid">
              <div>
                <strong>Patient:</strong> {selected.patient_name_snapshot ?? "N/A"}
              </div>
              <div>
                <strong>Clinic:</strong> {selected.clinic_name_snapshot ?? "N/A"}
              </div>
              <div>
                <strong>Status:</strong> {selected.status}
              </div>
              <div>
                <strong>Purpose:</strong> {selected.purpose ?? "N/A"}
              </div>
              <div>
                <strong>Symptoms:</strong> {selected.symptoms ?? "N/A"}
              </div>
              <div>
                <strong>Patient Note:</strong> {selected.patient_note ?? "N/A"}
              </div>
              <div>
                <strong>Clinic Note:</strong> {selected.clinic_note ?? "N/A"}
              </div>
              <div>
                <strong>Start:</strong> {new Date(selected.start_at).toLocaleString()}
              </div>
              <div>
                <strong>End:</strong>{" "}
                {selected.end_at ? new Date(selected.end_at).toLocaleString() : "N/A"}
              </div>
            </div>

            <div className="popup-actions">
              <button
                type="button"
                className="btn-sm btn-view"
                onClick={() => setIsPopupOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  children,
  actions,
  className = "",
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {  
  return (
    <div className={`dash-panel ${className}`}>
      <div className="dash-panel-head">
        <div className="dash-panel-title">{title}</div>
        {actions && <div className="dash-panel-actions">{actions}</div>}
      </div>
      <div className="dash-panel-body dash-panel-pad">{children}</div>
    </div>
  );
}
