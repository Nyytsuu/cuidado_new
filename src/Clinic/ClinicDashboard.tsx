import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import SidebarClinic from "./SidebarClinic";
import "./ClinicDashboard.css";

/* ---------- TYPES ---------- */
type MetricsResponse = {
  totalPatients: number;
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
};

type ActivityItem = {
  id: string;
  type: "patient" | "appointment" | "completed" | "cancelled";
  text: string;
  time: string;
};

type PatientRow = {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  created_at: string;
};

type AppointmentRow = {
  id: number;
  patient: string;
  service?: string;
  schedule: string;
  status: string;
};

type RawAppointmentRow = {
  id?: number | string;
  patient?: string;
  full_name?: string;
  service?: string;
  service_name?: string;
  schedule?: string;
  appointment_date?: string;
  created_at?: string;
  status?: string;
};

type RawPatientRow = {
  id?: number | string;
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  joined_at?: string;
};

type RawActivityItem = {
  id?: number | string;
  type?: ActivityItem["type"];
  text?: string;
  message?: string;
  time?: string;
  created_at?: string;
};

type PanelProps = {
  title: string;
  children: ReactNode;
  className?: string;
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

/* ---------- SMALL PANEL COMPONENT ---------- */
function Panel({ title, children, className = "" }: PanelProps) {
  return (
    <div className={`dash-panel ${className}`}>
      <div className="dash-panel-title">{title}</div>
      <div className="dash-panel-body">{children}</div>
    </div>
  );
}

export default function ClinicDashboard() {
  const API = "http://localhost:5000/api";
  const clinicId = 1; // TODO: replace with logged-in clinic id

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  /* ---------- METRICS ---------- */
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const [completedAppointments, setCompletedAppointments] = useState(0);

  /* ---------- APPOINTMENTS ---------- */
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);

  /* ---------- PATIENTS ---------- */
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patients, setPatients] = useState<PatientRow[]>([]);

  /* ---------- ACTIVITIES ---------- */
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  /* ---------- HELPERS ---------- */
  const fmtDate = (created_at: string) => {
    if (!created_at) return "-";

    const d = new Date(created_at);
    if (isNaN(d.getTime())) return "-";

    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const fmtDateTime = (value: string) => {
    if (!value) return "-";

    const d = new Date(value);
    if (isNaN(d.getTime())) return value;

    return d.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const safeStatusClass = (status: string) => {
    return (status || "pending").toLowerCase().replace(/\s+/g, "-");
  };

  const onViewAppointment = (id: number) => {
    console.log("View appointment:", id);
    // Example:
    // navigate(`/clinic/appointments/${id}`);
  };

  const dashboardQuery = searchTerm.trim().toLowerCase();
  const filteredAppointments = appointments.filter((appointment) =>
    matchesSearch(
      dashboardQuery,
      appointment.patient,
      appointment.service,
      fmtDateTime(appointment.schedule),
      appointment.status
    )
  );
  const filteredPatients = patients.filter((patient) =>
    matchesSearch(
      dashboardQuery,
      patient.full_name,
      patient.email,
      patient.phone,
      fmtDate(patient.created_at)
    )
  );
  const filteredActivities = activities.filter((activity) =>
    matchesSearch(
      dashboardQuery,
      activity.text,
      activity.type,
      fmtDate(activity.time)
    )
  );

  /* ---------- FETCH METRICS ---------- */
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoadingMetrics(true);

        const res = await fetch(
          `${API}/clinic/dashboard/metrics?clinic_id=${clinicId}`
        );
        if (!res.ok) throw new Error("Failed to fetch metrics");

        const data: MetricsResponse = await res.json();

        setTotalPatients(data.totalPatients || 0);
        setTotalAppointments(data.totalAppointments || 0);
        setPendingAppointments(data.pendingAppointments || 0);
        setCompletedAppointments(data.completedAppointments || 0);
      } catch (error) {
        console.error("Metrics fetch error:", error);
        setTotalPatients(0);
        setTotalAppointments(0);
        setPendingAppointments(0);
        setCompletedAppointments(0);
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchMetrics();
  }, [API, clinicId]);

  /* ---------- FETCH APPOINTMENTS ---------- */
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoadingAppointments(true);

        const res = await fetch(
          `${API}/clinic/dashboard/appointments?clinic_id=${clinicId}`
        );
        if (!res.ok) throw new Error("Failed to fetch appointments");

        const data = (await res.json()) as RawAppointmentRow[];

        const normalized: AppointmentRow[] = Array.isArray(data)
          ? data.map((item) => ({
              id: Number(item.id || 0),
              patient: item.patient || item.full_name || "Unknown Patient",
              service: item.service || item.service_name || "General Checkup",
              schedule:
                item.schedule || item.appointment_date || item.created_at || "",
              status: item.status || "Pending",
            }))
          : [];

        setAppointments(normalized);
      } catch (error) {
        console.error("Appointments fetch error:", error);
        setAppointments([]);
      } finally {
        setLoadingAppointments(false);
      }
    };

    fetchAppointments();
  }, [API, clinicId]);

  /* ---------- FETCH PATIENTS ---------- */
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoadingPatients(true);

        const res = await fetch(
          `${API}/clinic/dashboard/patients?clinic_id=${clinicId}`
        );
        if (!res.ok) throw new Error("Failed to fetch patients");

        const data = (await res.json()) as RawPatientRow[];

        const normalized: PatientRow[] = Array.isArray(data)
          ? data.map((item) => ({
              id: Number(item.id || 0),
              full_name: item.full_name || item.name || "Unknown Patient",
              email: item.email || "No email",
              phone: item.phone || "",
              created_at: item.created_at || item.joined_at || "",
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

  /* ---------- FETCH ACTIVITIES ---------- */
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoadingActivities(true);

        const res = await fetch(
          `${API}/clinic/dashboard/activities?clinic_id=${clinicId}`
        );
        if (!res.ok) throw new Error("Failed to fetch activities");

        const data = (await res.json()) as RawActivityItem[];

        const normalized: ActivityItem[] = Array.isArray(data)
          ? data.map((item, index) => ({
              id: String(item.id ?? index),
              type: item.type || "appointment",
              text: item.text || item.message || "No activity",
              time: item.time || item.created_at || new Date().toISOString(),
            }))
          : [];

        setActivities(normalized);
      } catch (error) {
        console.error("Activities fetch error:", error);
        setActivities([]);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchActivities();
  }, [API, clinicId]);

  return (
    <div
      className={`ad-wrap clinic-dashboard-page ${
        sidebarExpanded ? "modal-open" : ""
      }`}
    >
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

      <main className="ad-main">
        <section className="dash-layout">
          {/* LEFT */}
          <div className="dash-maincol">
            <section className="dash-metrics">
              <div className="metric-card">
                <div className="metric-title">Today's Appointments</div>
                <div className="metric-box">
                  <div className="metric-value">
                    {loadingMetrics ? "..." : totalAppointments}
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-title">Pending Requests</div>
                <div className="metric-box">
                  <div className="metric-value">
                    {loadingMetrics ? "..." : pendingAppointments}
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-title">Total Patients</div>
                <div className="metric-box">
                  <div className="metric-value">
                    {loadingMetrics ? "..." : totalPatients}
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-title">Completed This Week</div>
                <div className="metric-box">
                  <div className="metric-value">
                    {loadingMetrics ? "..." : completedAppointments}
                  </div>
                </div>
              </div>
            </section>

            <section className="dash-grid dash-grid-main">
              <div className="dash-left-col">
                <section className="dash-chart">
                  <div className="dash-chart-head">
                    <h3>Today’s Schedule</h3>
                  </div>

                  <div className="dash-chart-card schedule-card">
                    {loadingAppointments ? (
                      <div className="box-empty">Loading schedule...</div>
                    ) : filteredAppointments.length === 0 ? (
                      <div className="box-empty">No schedule today.</div>
                    ) : (
                      <div className="simple-list">
                        {filteredAppointments.slice(0, 5).map((ap) => (
                          <div key={ap.id} className="simple-list-item">
                            <div className="simple-main">{ap.patient}</div>
                            <div className="simple-sub">
                              {fmtDateTime(ap.schedule)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="dash-quick-actions">
                  <div className="dash-panel-title">Quick Actions</div>

                  <div className="dash-panel-body">
                    <div className="quick-actions-grid">
                      <Link
                        to="/clinic/appointments"
                        className="quick-action-btn"
                      >
                        Appointments
                      </Link>
                      <Link to="/clinic/patients" className="quick-action-btn">
                        Patients
                      </Link>
                      <Link to="/clinic/schedule" className="quick-action-btn">
                        Schedule
                      </Link>
                      <Link to="/clinic/profile" className="quick-action-btn">
                        Profile
                      </Link>
                    </div>
                  </div>
                </section>
              </div>

              <div className="dash-right-col">
                <div className="dash-panel-title">Appointments</div>

                <div className="dash-panel-body">
                  <table className="dash-table appointments-large">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Schedule</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loadingAppointments ? (
                        <tr>
                          <td colSpan={4} className="td-empty">
                            Loading appointments...
                          </td>
                        </tr>
                      ) : filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="td-empty">
                            No appointments yet.
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.slice(0, 6).map((ap) => (
                          <tr key={ap.id}>
                            <td>
                              <div className="t-main">{ap.patient}</div>
                              <div className="t-sub">
                                {ap.service || "General Checkup"}
                              </div>
                            </td>

                            <td>{fmtDateTime(ap.schedule)}</td>

                            <td>
                              <span
                                className={`badge badge-${safeStatusClass(
                                  ap.status
                                )}`}
                              >
                                {ap.status}
                              </span>
                            </td>

                            <td className="td-action">
                              <button
                                className="btn-sm btn-view"
                                onClick={() => onViewAppointment(ap.id)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <aside className="dash-aside">
            <div className="dash-panel dash-right-top">
              <div className="dash-panel-title">Schedule</div>
              <div className="dash-panel-body dash-body-small right-small-box">
                {loadingActivities ? (
                  <div className="box-empty">Loading...</div>
                ) : filteredActivities.length === 0 ? (
                  <div className="box-empty">No schedule summary.</div>
                ) : (
                  <div className="simple-list compact">
                    {filteredActivities.slice(0, 3).map((item) => (
                      <div key={item.id} className="simple-list-item">
                        <div className="simple-main">{item.text}</div>
                        <div className="simple-sub">{fmtDate(item.time)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Panel title="Patients" className="appointment-panel patients-panel">
              <div className="appt-xaxis">
                <table className="dash-table dash-table-appt">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Joined</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingPatients ? (
                      <tr>
                        <td colSpan={2} className="td-empty">
                          Loading patients...
                        </td>
                      </tr>
                    ) : filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="td-empty">
                          No patients yet.
                        </td>
                      </tr>
                    ) : (
                      filteredPatients.slice(0, 6).map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div className="t-main">{p.full_name}</div>
                            <div className="t-sub">{p.email}</div>
                          </td>
                          <td>{fmtDate(p.created_at)}</td>
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
