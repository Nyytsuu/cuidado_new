import "./AdminAppointmentDetailsModal.css";

export type AdminAppointmentDetails = {
  id: number;
  user_id?: number | null;
  clinic_id?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  purpose?: string | null;
  symptoms?: string | null;
  patient_note?: string | null;
  clinic_note?: string | null;
  status?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancel_reason?: string | null;
  completed_at?: string | null;
  patient_name_snapshot?: string | null;
  patient_phone_snapshot?: string | null;
  clinic_name_snapshot?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Props = {
  appointment: AdminAppointmentDetails;
  onClose: () => void;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not provided";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatStatus = (status?: string | null) => {
  const normalized = String(status || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

  return normalized
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const statusClass = (status?: string | null) =>
  String(status || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

export default function AdminAppointmentDetailsModal({
  appointment,
  onClose,
}: Props) {
  const patientName = appointment.patient_name_snapshot || "Patient unavailable";
  const patientInitial = patientName.trim().charAt(0).toUpperCase() || "P";
  const statusKey = statusClass(appointment.status);

  return (
    <div
      className="admin-appt-detail-overlay"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="admin-appt-detail-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adminApptDetailTitle"
      >
        <header className="admin-appt-detail-head">
          <div>
            <span className="admin-appt-detail-kicker">View Details</span>
            <h3 id="adminApptDetailTitle">Appointment Details</h3>
          </div>
          <button
            type="button"
            className="admin-appt-detail-close"
            onClick={onClose}
            aria-label="Close appointment details"
          >
            x
          </button>
        </header>

        <div className="admin-appt-detail-body">
          <section className="admin-appt-detail-hero">
            <div className="admin-appt-detail-avatar">{patientInitial}</div>
            <div className="admin-appt-detail-person">
              <span>Patient</span>
              <h4>{patientName}</h4>
              <p>{appointment.patient_phone_snapshot || "No phone provided"}</p>
            </div>
            <span className={`admin-appt-detail-status status-${statusKey}`}>
              {formatStatus(appointment.status)}
            </span>
          </section>

          <section className="admin-appt-detail-grid">
            <div className="admin-appt-detail-item">
              <span>Clinic</span>
              <strong>{appointment.clinic_name_snapshot || "Not provided"}</strong>
            </div>
            <div className="admin-appt-detail-item">
              <span>Start</span>
              <strong>{formatDateTime(appointment.start_at)}</strong>
            </div>
            <div className="admin-appt-detail-item">
              <span>End</span>
              <strong>{formatDateTime(appointment.end_at)}</strong>
            </div>
            <div className="admin-appt-detail-item">
              <span>Requested</span>
              <strong>{formatDateTime(appointment.created_at)}</strong>
            </div>
            <div className="admin-appt-detail-item admin-appt-detail-wide">
              <span>Purpose</span>
              <strong>{appointment.purpose || "No purpose provided"}</strong>
            </div>
            <div className="admin-appt-detail-item admin-appt-detail-wide">
              <span>Symptoms</span>
              <strong>{appointment.symptoms || "No symptoms listed"}</strong>
            </div>
          </section>

          <section className="admin-appt-detail-notes">
            <div className="admin-appt-detail-note">
              <span>Patient Note</span>
              <p>{appointment.patient_note || "No patient note added."}</p>
            </div>
            <div className="admin-appt-detail-note">
              <span>Clinic Note</span>
              <p>{appointment.clinic_note || "No clinic note added."}</p>
            </div>
            {(appointment.cancel_reason || statusKey === "cancelled") && (
              <div className="admin-appt-detail-note is-danger">
                <span>Cancellation</span>
                <p>
                  {appointment.cancel_reason || "No cancellation reason provided."}
                  {appointment.cancelled_by
                    ? ` Cancelled by ${appointment.cancelled_by}.`
                    : ""}
                </p>
              </div>
            )}
          </section>
        </div>

        <footer className="admin-appt-detail-foot">
          <button
            type="button"
            className="admin-appt-detail-done"
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
