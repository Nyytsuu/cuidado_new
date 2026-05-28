import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import SidebarClinic from "./SidebarClinic";
import "./ClinicDashboard.css";
import { apiUrl } from "../sharedBackendFetch";

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

type ClinicReview = {
  id: number;
  appointment_id?: number;
  clinic_id?: number;
  user_id?: number;
  rating: number | string;
  feedback?: string | null;
  clinic_reply?: string | null;
  clinic_reply_updated_at?: string | null;
  reviewer_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ClinicFeedbackResponse = {
  average_rating?: number | null;
  rating_count?: number;
  reviews?: ClinicReview[];
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

type AppointmentService = {
  id?: number;
  service_id?: number;
  service_name_snapshot?: string | null;
  price_snapshot?: number | string | null;
  duration_minutes_snapshot?: number | string | null;
  description?: string | null;
};

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
  status: string;
  cancelled_at?: string | null;
  cancelled_by?: "patient" | "clinic" | "admin" | null;
  cancel_reason?: string | null;
  completed_at?: string | null;
  patient_name_snapshot: string | null;
  patient_phone_snapshot: string | null;
  clinic_name_snapshot: string | null;
  created_at?: string;
  updated_at?: string;
  services?: AppointmentService[];
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

export default function ClinicDashboard() {
  const [clinicId] = useState(() => getStoredClinicId());

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentDetails | null>(null);

  /* ---------- PATIENTS ---------- */
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patients, setPatients] = useState<PatientRow[]>([]);

  /* ---------- ACTIVITIES ---------- */
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  /* ---------- REVIEWS ---------- */
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviews, setReviews] = useState<ClinicReview[]>([]);
  const [reviewRatingCount, setReviewRatingCount] = useState(0);
  const [reviewAverageRating, setReviewAverageRating] = useState<number | null>(
    null
  );
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [savingReplyId, setSavingReplyId] = useState<number | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");

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

  const fmtOptionalDateTime = (value?: string | null) =>
    value ? fmtDateTime(value) : "-";

  const fallbackText = (
    value: string | number | null | undefined,
    fallback = "-"
  ) => {
    const text = String(value ?? "").trim();
    return text || fallback;
  };

  const safeStatusClass = (status: string) => {
    return (status || "pending").toLowerCase().replace(/\s+/g, "-");
  };

  const closeAppointmentDetails = () => {
    setDetailsOpen(false);
    setDetailsLoading(false);
    setDetailsError("");
    setSelectedAppointment(null);
  };

  const onViewAppointment = async (id: number) => {
    try {
      setDetailsOpen(true);
      setDetailsLoading(true);
      setDetailsError("");
      setSelectedAppointment(null);

      const res = await fetch(apiUrl(`/api/appointments/details/${id}`));
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load appointment details.");
      }

      setSelectedAppointment(data as AppointmentDetails);
    } catch (error) {
      console.error("View appointment details error:", error);
      setDetailsError(
        error instanceof Error
          ? error.message
          : "Failed to load appointment details."
      );
    } finally {
      setDetailsLoading(false);
    }
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
  const filteredReviews = reviews.filter((review) =>
    matchesSearch(
      dashboardQuery,
      review.reviewer_name,
      review.feedback,
      review.clinic_reply,
      review.rating,
      review.created_at
    )
  );

  /* ---------- BODY/HTML HEIGHT FIX ---------- */
  const isMounted = useRef(false);
  useLayoutEffect(() => {
    if (isMounted.current) return;
    isMounted.current = true;

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
      rootHeight: root?.style.height ?? "",
      rootMinHeight: root?.style.minHeight ?? "",
      rootWidth: root?.style.width ?? "",
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
      isMounted.current = false;
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

  /* ---------- FETCH METRICS ---------- */
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoadingMetrics(true);

        const res = await fetch(apiUrl(`/api/clinic/dashboard/metrics?clinic_id=${clinicId}`))
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
  }, [clinicId]);

  /* ---------- FETCH APPOINTMENTS ---------- */
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoadingAppointments(true);

        const res = await fetch(
          apiUrl(`/api/clinic/dashboard/appointments?clinic_id=${clinicId}`)
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
  }, [clinicId]);

  /* ---------- FETCH PATIENTS ---------- */
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoadingPatients(true);

        const res = await fetch(
          apiUrl(`/api/clinic/dashboard/patients?clinic_id=${clinicId}`)
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
  }, [clinicId]);

  /* ---------- FETCH ACTIVITIES ---------- */
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoadingActivities(true);

        const res = await fetch(
          apiUrl(`/api/clinic/dashboard/activities?clinic_id=${clinicId}`)
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
  }, [clinicId]);

  /* ---------- FETCH REVIEWS ---------- */
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        setReviewMessage("");

        const res = await fetch(
          apiUrl(`/api/clinic-feedback?clinic_id=${clinicId}`),
          { cache: "no-store" }
        );
        const data = (await res.json().catch(() => ({}))) as ClinicFeedbackResponse;

        if (!res.ok) {
          throw new Error("Failed to fetch patient reviews");
        }

        const normalized = Array.isArray(data.reviews) ? data.reviews : [];
        setReviews(normalized);
        setReviewRatingCount(Number(data.rating_count || 0));
        setReviewAverageRating(
          data.average_rating === null || data.average_rating === undefined
            ? null
            : Number(data.average_rating)
        );
        setReplyDrafts(
          normalized.reduce<Record<number, string>>((drafts, review) => {
            drafts[review.id] = review.clinic_reply || "";
            return drafts;
          }, {})
        );
      } catch (error) {
        console.error("Reviews fetch error:", error);
        setReviews([]);
        setReviewRatingCount(0);
        setReviewAverageRating(null);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [clinicId]);

  const saveReviewReply = async (reviewId: number) => {
    const reply = String(replyDrafts[reviewId] || "").trim();

    if (reply.length > 1000) {
      setReviewMessage("Reply must be 1,000 characters or fewer.");
      return;
    }

    try {
      setSavingReplyId(reviewId);
      setReviewMessage("");

      const res = await fetch(apiUrl(`/api/clinic-feedback/${reviewId}/reply`), {
        method: "PATCH",
        body: JSON.stringify({
          clinic_id: clinicId,
          reply,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save reply.");
      }

      const updatedReview = data?.review as ClinicReview | undefined;

      if (updatedReview?.id) {
        setReviews((current) =>
          current.map((review) =>
            review.id === updatedReview.id ? { ...review, ...updatedReview } : review
          )
        );
        setReplyDrafts((current) => ({
          ...current,
          [updatedReview.id]: updatedReview.clinic_reply || "",
        }));
      }

      setReviewMessage(reply ? "Reply saved." : "Reply removed.");
    } catch (error) {
      console.error("Save review reply error:", error);
      setReviewMessage(
        error instanceof Error ? error.message : "Failed to save reply."
      );
    } finally {
      setSavingReplyId(null);
    }
  };

  return (
    <div
  className={`clinic-wrap clinic-dashboard-page ${
    sidebarExpanded ? "sidebar-expanded" : ""
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

      <main className="clinic-main">
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

            <Panel title="Patient Reviews" className="clinic-reviews-panel">
              <div className="clinic-review-summary">
                <span>
                  {reviewAverageRating
                    ? `${reviewAverageRating.toFixed(1)} / 5`
                    : "No rating yet"}
                </span>
                <span>
                  {reviewRatingCount} {reviewRatingCount === 1 ? "review" : "reviews"}
                </span>
              </div>

              {reviewMessage && (
                <div className="clinic-review-message">{reviewMessage}</div>
              )}

              {loadingReviews ? (
                <div className="box-empty">Loading reviews...</div>
              ) : filteredReviews.length === 0 ? (
                <div className="box-empty">No patient reviews yet.</div>
              ) : (
                <div className="clinic-review-list">
                  {filteredReviews.slice(0, 4).map((review) => {
                    const draft = replyDrafts[review.id] ?? "";
                    const savedReply = review.clinic_reply || "";
                    const hasChanges = draft.trim() !== savedReply.trim();
                    const isSaving = savingReplyId === review.id;

                    return (
                      <article className="clinic-review-card" key={review.id}>
                        <div className="clinic-review-head">
                          <div>
                            <strong>{review.reviewer_name || "Cuidado user"}</strong>
                            <span>{fmtOptionalDateTime(review.created_at)}</span>
                          </div>
                          <b>{Number(review.rating || 0).toFixed(0)} / 5</b>
                        </div>

                        <p className="clinic-review-text">
                          {review.feedback || "No written feedback."}
                        </p>

                        {review.clinic_reply && (
                          <div className="clinic-review-saved-reply">
                            <strong>Current reply</strong>
                            <p>{review.clinic_reply}</p>
                            <span>
                              {fmtOptionalDateTime(review.clinic_reply_updated_at)}
                            </span>
                          </div>
                        )}

                        <label className="clinic-reply-field">
                          <span>Clinic reply</span>
                          <textarea
                            value={draft}
                            maxLength={1000}
                            placeholder="Write a short response..."
                            onChange={(event) =>
                              setReplyDrafts((current) => ({
                                ...current,
                                [review.id]: event.target.value,
                              }))
                            }
                          />
                        </label>

                        <div className="clinic-reply-actions">
                          <span>{draft.trim().length} / 1000</span>
                          <button
                            type="button"
                            className="btn-sm btn-view"
                            disabled={
                              isSaving || !hasChanges || draft.trim().length > 1000
                            }
                            onClick={() => saveReviewReply(review.id)}
                          >
                            {isSaving ? "Saving..." : savedReply ? "Update Reply" : "Save Reply"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </Panel>
          </aside>
        </section>
      </main>

      {detailsOpen && (
        <div
          className="clinic-dash-modal-overlay"
          onClick={closeAppointmentDetails}
        >
          <div
            className="clinic-dash-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clinicDashboardAppointmentTitle"
          >
            <div className="clinic-dash-modal-head">
              <div>
                <h3 id="clinicDashboardAppointmentTitle">Appointment Details</h3>
                <p>
                  {selectedAppointment
                    ? `Appointment #${selectedAppointment.id}`
                    : "Loading appointment"}
                </p>
              </div>

              <button
                type="button"
                className="clinic-dash-modal-close"
                onClick={closeAppointmentDetails}
                aria-label="Close appointment details"
              >
                x
              </button>
            </div>

            <div className="clinic-dash-modal-body">
              {detailsLoading ? (
                <div className="clinic-dash-modal-empty">
                  Loading appointment details...
                </div>
              ) : detailsError ? (
                <div className="clinic-dash-modal-alert">{detailsError}</div>
              ) : selectedAppointment ? (
                <>
                  <div className="clinic-dash-detail-grid">
                    <div>
                      <span>Patient</span>
                      <strong>
                        {fallbackText(
                          selectedAppointment.patient_name_snapshot,
                          `User #${selectedAppointment.user_id}`
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Phone</span>
                      <strong>
                        {fallbackText(selectedAppointment.patient_phone_snapshot)}
                      </strong>
                    </div>

                    <div>
                      <span>Clinic</span>
                      <strong>
                        {fallbackText(
                          selectedAppointment.clinic_name_snapshot,
                          `Clinic #${selectedAppointment.clinic_id}`
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong
                        className={`badge badge-${safeStatusClass(
                          selectedAppointment.status
                        )}`}
                      >
                        {selectedAppointment.status}
                      </strong>
                    </div>

                    <div>
                      <span>Start</span>
                      <strong>{fmtOptionalDateTime(selectedAppointment.start_at)}</strong>
                    </div>

                    <div>
                      <span>End</span>
                      <strong>{fmtOptionalDateTime(selectedAppointment.end_at)}</strong>
                    </div>
                  </div>

                  <div className="clinic-dash-detail-section">
                    <h4>Visit Information</h4>
                    <p>
                      <b>Purpose:</b>{" "}
                      {fallbackText(selectedAppointment.purpose, "No purpose provided")}
                    </p>
                    <p>
                      <b>Symptoms:</b>{" "}
                      {fallbackText(selectedAppointment.symptoms, "No symptoms listed")}
                    </p>
                    <p>
                      <b>Patient Note:</b>{" "}
                      {fallbackText(selectedAppointment.patient_note, "No patient note")}
                    </p>
                    <p>
                      <b>Clinic Note:</b>{" "}
                      {fallbackText(selectedAppointment.clinic_note, "No clinic note")}
                    </p>
                  </div>

                  {selectedAppointment.services &&
                    selectedAppointment.services.length > 0 && (
                      <div className="clinic-dash-detail-section">
                        <h4>Services</h4>
                        <div className="clinic-dash-service-list">
                          {selectedAppointment.services.map((service, index) => (
                            <div
                              className="clinic-dash-service-item"
                              key={`${service.service_id ?? service.id ?? index}`}
                            >
                              <strong>
                                {fallbackText(
                                  service.service_name_snapshot,
                                  `Service #${service.service_id ?? index + 1}`
                                )}
                              </strong>
                              <span>
                                {service.duration_minutes_snapshot
                                  ? `${service.duration_minutes_snapshot} mins`
                                  : "Duration not set"}
                                {" | "}
                                {service.price_snapshot
                                  ? `PHP ${Number(service.price_snapshot).toFixed(2)}`
                                  : "No price"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {selectedAppointment.status === "cancelled" && (
                    <div className="clinic-dash-detail-section">
                      <h4>Cancellation</h4>
                      <p>
                        <b>Cancelled By:</b>{" "}
                        {fallbackText(selectedAppointment.cancelled_by)}
                      </p>
                      <p>
                        <b>Reason:</b>{" "}
                        {fallbackText(
                          selectedAppointment.cancel_reason,
                          "No reason provided"
                        )}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="clinic-dash-modal-empty">
                  No appointment selected.
                </div>
              )}
            </div>

            <div className="clinic-dash-modal-actions">
              <Link to="/clinic/appointments" className="btn-sm btn-view">
                Open Appointments
              </Link>
              <button
                type="button"
                className="btn-sm clinic-dash-secondary-btn"
                onClick={closeAppointmentDetails}
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
