import { useEffect, useState, type ReactNode } from "react";
import "./AdminServices.css";
import "./AdminHeader.css";
import SidebarAdmin from "./SidebarAdmin";
import AdminAppointmentDetailsModal, {
  type AdminAppointmentDetails,
} from "./AdminAppointmentDetailsModal";
import AdminHeader from "./AdminHeader";

type Service = {
  id: number;
  name: string;
  is_active: number; // 1 | 0
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

type ActivityItem = {
  id: string;
  type: "user" | "clinic" | "clinic-approved" | "clinic-rejected" | "appointment";
  text: string;
  time: string;
};

const API = "http://localhost:5000/api/admin";

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

export default function AdminServices() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentDetails, setAppointmentDetails] =
    useState<AdminAppointmentDetails | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceInput, setServiceInput] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [serviceError, setServiceError] = useState("");
  const [savingService, setSavingService] = useState(false);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [updatingServiceStatus, setUpdatingServiceStatus] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: "success" | "error" } | null>(
    null
  );
  const [q, setQ] = useState("");

  const getStatusClass = (status: string) => {
    const s = status.trim().toLowerCase();

    if (["approved", "confirmed", "completed"].includes(s)) return "badge-approved";
    if (["pending"].includes(s)) return "badge-pending";
    if (["cancelled", "canceled", "rejected", "declined"].includes(s)) {
      return "badge-cancelled";
    }

    return "badge-pending";
  };

  const loadServices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/services`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Service[] = await res.json();
      setServices(data);
    } catch (e) {
      console.error("Load services error:", e);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const getApiMessage = async (res: Response) => {
    try {
      const data = await res.json();
      if (typeof data?.message === "string") return data.message;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) return text;
    }

    return `Request failed with HTTP ${res.status}`;
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

  useEffect(() => {
    loadActivity();
    loadAppointments();
  }, []);

  const query = q.trim().toLowerCase();
  const filteredServices = services.filter((service) =>
    matchesSearch(
      query,
      service.name,
      service.is_active === 1 ? "active" : "inactive"
    )
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

  const openAddModal = () => {
    setEditingId(null);
    setServiceInput("");
    setServiceError("");
    setServiceModalOpen(true);
  };

  const openEditModal = (id: number) => {
    const current = services.find((s) => s.id === id)?.name ?? "";
    setEditingId(id);
    setServiceInput(current);
    setServiceError("");
    setServiceModalOpen(true);
  };

  const closeModal = () => {
    setServiceModalOpen(false);
    setServiceInput("");
    setEditingId(null);
    setServiceError("");
    setSavingService(false);
  };

  const openToggleModal = (service: Service) => {
    setSelectedService(service);
    setConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setConfirmModalOpen(false);
    setSelectedService(null);
    setUpdatingServiceStatus(false);
  };

  const saveService = async () => {
    const name = serviceInput.trim();
    if (!name) {
      setServiceError("Enter a service name before saving.");
      return;
    }

    try {
      setSavingService(true);
      setServiceError("");

      if (editingId === null) {
        const res = await fetch(`${API}/services`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error(await getApiMessage(res));
      } else {
        const res = await fetch(`${API}/services/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error(await getApiMessage(res));
      }

      closeModal();
      await loadServices();
      setNotice({
        title: editingId === null ? "Service added" : "Service updated",
        message: `"${name}" is now saved in the admin services list.`,
        tone: "success",
      });
    } catch (e) {
      console.error("Save service error:", e);
      setServiceError(e instanceof Error ? e.message : "Failed to save service.");
    } finally {
      setSavingService(false);
    }
  };

  const handleToggle = async () => {
    if (!selectedService) return;

    try {
      setUpdatingServiceStatus(true);
      const res = await fetch(`${API}/services/${selectedService.id}/toggle`, {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error(await getApiMessage(res));
      }

      const nextState = selectedService.is_active === 1 ? "deactivated" : "activated";
      closeConfirmModal();
      await loadServices();
      setNotice({
        title: `Service ${nextState}`,
        message:
          selectedService.is_active === 1
            ? `"${selectedService.name}" is hidden from active service choices but remains in records.`
            : `"${selectedService.name}" is available again.`,
        tone: "success",
      });
    } catch (e) {
      console.error("Toggle service error:", e);
      setNotice({
        title: "Service update failed",
        message: e instanceof Error ? e.message : "Failed to update service status.",
        tone: "error",
      });
      setUpdatingServiceStatus(false);
    }
  };

  const onViewAppointment = async (id: number) => {
    try {
      const res = await fetch(`${API}/appointments/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AdminAppointmentDetails = await res.json();
      setAppointmentDetails(data);
    } catch (e) {
      console.error("View appointment details error:", e);
      alert("Failed to load appointment details.");
    }
  };

  return (
    <div className="admin-UserServices with-sidebar">
      <SidebarAdmin
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
      />

      <main className="preview-canvas">
        <AdminHeader searchValue={q} onSearchChange={setQ} searchPlaceholder="Search services..." />

        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="admin-title">
              <h2>Services Management</h2>
            </div>

            <div className="admin-grid">
              <section className="admin-card admin-table-card">
                <div className="admin-table-header">
                  <button type="button" className="btn-add" onClick={openAddModal}>
                    + Add service
                  </button>
                </div>

                <div className="users-table">
                  <div className="users-row users-header services-row">
                    <div className="users-cell">List of services</div>
                    <div className="users-cell">Status</div>
                    <div className="users-cell">Actions:</div>
                  </div>

                  {loading ? (
                    <div className="users-row services-row">
                      <div className="users-cell" style={{ gridColumn: "1 / -1" }}>
                        Loading...
                      </div>
                    </div>
                  ) : filteredServices.length === 0 ? (
                    <div className="users-row services-row">
                      <div className="users-cell" style={{ gridColumn: "1 / -1" }}>
                        {query ? "No services match your search." : "No services found."}
                      </div>
                    </div>
                  ) : (
                    filteredServices.map((s) => (
                      <div className="users-row services-row" key={s.id}>
                        <div className="users-cell users-name">
                          {s.name}
                        </div>

                        <div className="users-cell">
                          <span
                            className={`service-status-badge ${
                              s.is_active === 1 ? "active" : "inactive"
                            }`}
                          >
                            {s.is_active === 1 ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="users-cell">
                          <div className="users-actions">
                            <button
                              type="button"
                              className="pill pill-view"
                              onClick={() => openEditModal(s.id)}
                            >
                              Edit service
                            </button>

                            <button
                              type="button"
                              className={`pill ${s.is_active === 1 ? "pill-deactivate" : "pill-success"}`}
                              onClick={() => openToggleModal(s)}
                            >
                              {s.is_active === 1 ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <aside className="dash-aside">
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
                            Loading appointments...
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

                            <td className="appt-status-cell">
                              <span className={`appt-badge ${getStatusClass(ap.status)}`}>
                                {ap.status}
                              </span>
                            </td>

                            <td className="td-action appt-action-cell">
                              <button
                                type="button"
                                className="appt-badge badge-view"
                                onClick={() => onViewAppointment(ap.id)}
                              >
                                View Details
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
          </div>
        </section>

        {serviceModalOpen && (
          <div className="service-modal-overlay" onClick={closeModal} role="presentation">
            <div
              className="service-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="serviceModalTitle"
            >
              <h3 id="serviceModalTitle">
                {editingId === null ? "Add Service" : "Edit Service"}
              </h3>

              <input
                className="service-modal-input"
                type="text"
                placeholder="Enter service name..."
                value={serviceInput}
                onChange={(e) => {
                  setServiceInput(e.target.value);
                  if (serviceError) setServiceError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveService();
                  if (e.key === "Escape") closeModal();
                }}
                autoFocus
              />
              {serviceError && (
                <div className="service-modal-message error" role="alert">
                  {serviceError}
                </div>
              )}
              <div className="service-modal-actions">
                <button type="button" className="service-btn cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="service-btn save"
                  onClick={saveService}
                  disabled={savingService}
                >
                  {savingService ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmModalOpen && selectedService && (
          <div
            className="service-modal-overlay"
            onClick={closeConfirmModal}
            role="presentation"
          >
            <div
              className="service-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirmModalTitle"
            >
              <h3 id="confirmModalTitle">
                {selectedService.is_active === 1 ? "Deactivate Service" : "Activate Service"}
              </h3>

              <p className="confirm-text">
                Are you sure you want to{" "}
                <strong>
                  {selectedService.is_active === 1 ? "deactivate" : "activate"}
                </strong>{" "}
                <span className="confirm-service-name">"{selectedService.name}"</span>?
                {selectedService.is_active === 1 && (
                  <span className="confirm-helper">
                    This will not remove the service. It only hides it from active choices.
                  </span>
                )}
              </p>

              <div className="service-modal-actions">
                <button
                  type="button"
                  className="service-btn cancel"
                  onClick={closeConfirmModal}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={`service-btn ${
                    selectedService.is_active === 1 ? "danger" : "save"
                  }`}
                  onClick={handleToggle}
                  disabled={updatingServiceStatus}
                >
                  {updatingServiceStatus
                    ? "Updating..."
                    : selectedService.is_active === 1
                      ? "Deactivate"
                      : "Activate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {notice && (
          <div
            className="service-modal-overlay"
            onClick={() => setNotice(null)}
            role="presentation"
          >
            <div
              className={`service-modal service-notice ${notice.tone}`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="serviceNoticeTitle"
            >
              <div className="service-notice-icon">{notice.tone === "success" ? "OK" : "!"}</div>
              <h3 id="serviceNoticeTitle">{notice.title}</h3>
              <p className="confirm-text">{notice.message}</p>
              <div className="service-modal-actions">
                <button
                  type="button"
                  className="service-btn save"
                  onClick={() => setNotice(null)}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {appointmentDetails && (
          <AdminAppointmentDetailsModal
            appointment={appointmentDetails}
            onClose={() => setAppointmentDetails(null)}
          />
        )}
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
