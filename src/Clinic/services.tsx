import { useCallback, useEffect, useMemo, useState } from "react";
import "./services.css";
import SidebarClinic from "./SidebarClinic";
import ClinicScheduleAside from "./ClinicScheduleAside";
import { FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

type ApiServiceRow = {
  id: number;
  name: string;
  description?: string | null;
  price?: number | null;
  duration?: number | null;
  duration_minutes?: number | null;
  is_active: number;
};

type ServiceRow = {
  id: string;
  name: string;
  description: string;
  price?: number;
  duration?: number;
  enabled: boolean;
};

type ServiceForm = {
  name: string;
  description: string;
  price: string;
  duration: string;
  enabled: boolean;
};

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  price: "",
  duration: "",
  enabled: true,
};

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

export default function Services() {
  const API = "http://localhost:5000/api";
  const clinicId = useMemo(() => getStoredClinicId(), []);

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [loadingServices, setLoadingServices] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [services, setServices] = useState<ServiceRow[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusTarget, setStatusTarget] = useState<ServiceRow | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
   const [showSuccess, setShowSuccess] = useState(false);

   const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
    
   const [validationPopup, setValidationPopup] = useState<string | null>(null);
    
   // logout
   const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
   const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
   const navigate = useNavigate();

  const loadServices = useCallback(async () => {
    try {
      setLoadingServices(true);

      const res = await fetch(`${API}/clinic/services?clinic_id=${clinicId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      const normalized: ServiceRow[] = Array.isArray(data)
        ? data.map((item: ApiServiceRow) => ({
            id: String(item.id),
            name: item.name || "Unnamed Service",
            description: item.description || "No description available.",
            price: item.price != null ? Number(item.price) : undefined,
            duration:
              item.duration != null
                ? Number(item.duration)
                : item.duration_minutes != null
                ? Number(item.duration_minutes)
                : undefined,
            enabled: Number(item.is_active) === 1,
          }))
        : [];

      setServices(normalized);
    } catch (error) {
      console.error("Load clinic services error:", error);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, [API, clinicId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const rows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return services;

    return services.filter(
      (row) =>
        row.name.toLowerCase().includes(keyword) ||
        row.description.toLowerCase().includes(keyword)
    );
  }, [services, searchTerm]);

  const selectedDeleteService = useMemo(
    () => services.find((service) => service.id === deleteTargetId) || null,
    [deleteTargetId, services]
  );

  const openAddModal = () => {
    setModalMode("add");
    setSelectedServiceId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (row: ServiceRow) => {
    setModalMode("edit");
    setSelectedServiceId(row.id);
    setForm({
      name: row.name,
      description: row.description,
      price: row.price != null ? String(row.price) : "",
      duration: row.duration != null ? String(row.duration) : "",
      enabled: row.enabled,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setSelectedServiceId(null);
    setForm(emptyForm);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target;

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setForm((prev) => ({
        ...prev,
        [target.name]: target.checked,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [target.name]: target.value,
    }));
  };

  const buildServicePayload = (data: {
    id?: string | null;
    name: string;
    description: string;
    price?: number | null;
    duration?: number | null;
    enabled: boolean;
  }) => ({
    clinic_id: clinicId,
    id: data.id ? Number(data.id) : undefined,
    name: data.name.trim(),
    description: data.description.trim() || null,
    price: data.price ?? null,
    duration: data.duration ?? null,
    duration_minutes: data.duration ?? null,
    is_active: data.enabled ? 1 : 0,
  });

  const handleSaveService = async () => {
   if (!form.name.trim()) {
  setValidationPopup("Service name is required.");
  return;
}

    try {
      setIsSaving(true);

      const payload = buildServicePayload({
        id: selectedServiceId,
        name: form.name,
        description: form.description,
        price: form.price !== "" ? Number(form.price) : null,
        duration: form.duration !== "" ? Number(form.duration) : null,
        enabled: form.enabled,
      });

      const isAdd = modalMode === "add";
      const url = isAdd
        ? `${API}/clinic/services`
        : `${API}/clinic/services/${selectedServiceId}`;

      const method = isAdd ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      console.log("Save service response:", res.status, raw);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} - ${raw}`);
      }

      await loadServices();
      closeModal();
      setShowSuccess(true);

setTimeout(() => {
  setShowSuccess(false);
}, 2500);
    } catch (error) {
      console.error("Save service error:", error);
      alert(`Failed to save service: ${String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const closeStatusModal = () => {
    if (updatingStatus) return;
    setStatusTarget(null);
  };

  const confirmToggleService = async () => {
  const target = statusTarget;
  if (!target) return;

  const nextEnabled = !target.enabled;
  const nextIsActive = nextEnabled ? 1 : 0;

  try {
    setUpdatingStatus(true);

    const res = await fetch(`${API}/clinic/services/${target.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        is_active: nextIsActive,
      }),
    });

    const raw = await res.text();
    console.log("Toggle status response:", res.status, raw);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${raw}`);
    }

    setServices((prev) =>
      prev.map((service) =>
        service.id === target.id ? { ...service, enabled: nextEnabled } : service
      )
    );

    setStatusTarget(null);
    setStatusToast(
      `"${target.name}" has been ${nextEnabled ? "enabled" : "disabled"}.`
    );
    window.setTimeout(() => setStatusToast(null), 2500);
  } catch (error) {
    console.error("Toggle service error:", error);
    alert(`Failed to update service status: ${String(error)}`);
  } finally {
    setUpdatingStatus(false);
  }
};

const confirmDeleteService = async () => {
  if (!deleteTargetId) return;

  try {
    setIsDeleting(true);

    const res = await fetch(`${API}/clinic/services/${deleteTargetId}`, {
      method: "DELETE",
    });

    const raw = await res.text();
    console.log("Delete service response:", res.status, raw);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${raw}`);
    }

    setServices((prev) =>
      prev.filter((service) => service.id !== deleteTargetId)
    );

    setIsDeleteModalOpen(false);
    setDeleteTargetId(null);

    // OPTIONAL: trigger your delete toast here
    setShowDeleteSuccess(true);
    setTimeout(() => setShowDeleteSuccess(false), 2500);

  } catch (error) {
    console.error("Delete service error:", error);
    alert(`Failed to delete service: ${String(error)}`);
  } finally {
    setIsDeleting(false);
  }
};

const closeDeleteModal = () => {
  if (isDeleting) return;
  setIsDeleteModalOpen(false);
  setDeleteTargetId(null);
};

  return (
    <div
      className={`services with-sidebar ${
        sidebarExpanded ? "sidebar-expanded" : ""
      } ${isModalOpen || isDeleteModalOpen || statusTarget ? "modal-open" : ""}`}
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
        searchPlaceholder="Search services..."
      />
      <main className="preview-canvas">
        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="services-titlebar">
              <div className="admin-title">
                <h2>Services</h2>
                <p className="admin-title-sub">Manage the services your clinic offers to patients</p>
              </div>
              <button
                type="button"
                className="add-btn"
                onClick={openAddModal}
              >
                <FaPlus /> Add Service
              </button>
            </div>

            <div className="admin-grid">
              <section className="admin-card admin-table-card">
                <div className="users-table">
                  <div className="users-row users-header">
                    <div className="users-cell">Service Name</div>
                    <div className="users-cell">Description</div>
                    <div className="users-cell">Price</div>
                    <div className="users-cell">Duration</div>
                    <div className="users-cell">Status</div>
                    <div className="users-cell">Actions:</div>
                  </div>

                  {loadingServices ? (
                    <div className="svc-empty-state">
                      <span className="svc-empty-icon">⏳</span>
                      <p>Loading services…</p>
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="svc-empty-state">
                      <span className="svc-empty-icon">🩺</span>
                      <p>No services found. Add one to get started.</p>
                    </div>
                  ) : (
                    rows.map((row) => (
                      <div className="users-row" key={row.id}>
                        <div className="users-cell users-name">{row.name}</div>

                        <div className="users-cell">
                          <span className="svc-desc" title={row.description}>{row.description}</span>
                        </div>

                        <div className="users-cell">
                          {row.price != null ? `₱${row.price}` : "—"}
                        </div>

                        <div className="users-cell">
                          {row.duration != null ? `${row.duration} min` : "—"}
                        </div>

                        <div className="users-cell">
                          <span className={`status-badge ${row.enabled ? "badge-enabled" : "badge-disabled"}`}>
                            {row.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>

                        <div className="users-cell">
                          <div className="users-actions">
                            <button
                              type="button"
                              className="icon-btn pill-view"
                              title="Edit"
                              onClick={() => openEditModal(row)}
                            >
                              <FaEdit />
                            </button>

                            <button
                              type="button"
                              className="icon-btn pill-danger"
                              title="Delete"
                              onClick={() => { setDeleteTargetId(row.id); setIsDeleteModalOpen(true); }}
                            >
                              <FaTrash />
                            </button>

                            <button
                              type="button"
                              className={`icon-btn ${row.enabled ? "pill-gray" : "pill-success"}`}
                              title={row.enabled ? "Disable" : "Enable"}
                              onClick={() => setStatusTarget(row)}
                            >
                              {row.enabled ? <FaToggleOff /> : <FaToggleOn />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <ClinicScheduleAside apiBase={API} clinicId={clinicId} />
            </div>
          </div>
        </section>
      </main>
         
            {isDeleteModalOpen && (
  <div className="service-modal-overlay" onClick={closeDeleteModal}>
    <div
      className="service-modal service-delete-modal"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-service-title"
    >
      <div className="service-modal-header">
        <div className="service-modal-title">
          <span className="service-modal-mark danger">!</span>
          <div>
            <p className="service-modal-kicker">Permanent action</p>
            <h3 id="delete-service-title">Delete Service</h3>
            <p>This removes the service from your clinic services list.</p>
          </div>
        </div>
      </div>

      <div className="service-modal-body">
        <div className="delete-service-card">
          <span>Service</span>
          <strong>{selectedDeleteService?.name || "Selected service"}</strong>
          <p>{selectedDeleteService?.description || "No description available."}</p>
        </div>

        <p className="delete-modal-warning">
          If this service is only temporarily unavailable, use Disable instead.
        </p>
      </div>

      <div className="service-modal-footer">
        <button
          type="button"
          className="pill pill-gray"
          onClick={closeDeleteModal}
          disabled={isDeleting}
        >
          Cancel
        </button>

        <button
          type="button"
          className="pill pill-danger"
          onClick={confirmDeleteService}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete Service"}
        </button>
      </div>
    </div>
  </div>
)}


            {statusTarget && (
  <div className="service-modal-overlay" onClick={closeStatusModal}>
    <div
      className="service-modal service-status-modal"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-status-title"
    >
      <div className="service-modal-header">
        <h3 id="service-status-title">
          {statusTarget.enabled ? "Disable Service" : "Enable Service"}
        </h3>
        <button
          type="button"
          className="service-modal-close"
          onClick={closeStatusModal}
          disabled={updatingStatus}
        >
          ×
        </button>
      </div>

      <div className="service-modal-body">
        <div className="service-status-summary">
          <span className="service-status-label">Service</span>
          <strong>{statusTarget.name}</strong>
          <span className={statusTarget.enabled ? "status-active-copy" : "status-inactive-copy"}>
            Currently {statusTarget.enabled ? "enabled" : "disabled"}
          </span>
        </div>

        <p className="service-status-message">
          {statusTarget.enabled
            ? "Disabling this service will hide it from active booking choices. Existing appointment records will stay unchanged."
            : "Enabling this service will make it available again for patients when they book with your clinic."}
        </p>
      </div>

      <div className="service-modal-footer">
        <button
          type="button"
          className="pill pill-gray"
          onClick={closeStatusModal}
          disabled={updatingStatus}
        >
          Cancel
        </button>

        <button
          type="button"
          className={`pill ${statusTarget.enabled ? "pill-danger" : "pill-success"}`}
          onClick={confirmToggleService}
          disabled={updatingStatus}
        >
          {updatingStatus
            ? "Saving..."
            : statusTarget.enabled
            ? "Yes, Disable"
            : "Yes, Enable"}
        </button>
      </div>
    </div>
  </div>
)}

{statusToast && (
  <div className="success-toast">
    <div className="success-toast-content">
      <span className="success-icon">✓</span>
      <span>{statusToast}</span>
    </div>
  </div>
)}


           {showSuccess && (
  <div className="success-toast">
    <div className="success-toast-content">
      <span className="success-icon">✔</span>
      <span>
        Service {modalMode === "add" ? "added" : "updated"} successfully
      </span>
    </div>
  </div>
)}

{showDeleteSuccess && (
  <div className="delete-toast">
    <div className="delete-toast-content">
      <span className="delete-icon">🗑</span>
      <span>Service deleted successfully</span>
    </div>
  </div>
)}

      {isModalOpen && (
        <div className="service-modal-overlay" onClick={closeModal}>
          <div className="service-modal service-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="service-modal-header">
              <div className="service-modal-title">
                <span className="service-modal-mark">S</span>
                <div>
                  <p className="service-modal-kicker">Clinic service</p>
                  <h3>{modalMode === "add" ? "Add Service" : "Edit Service"}</h3>
                  <p>
                    {modalMode === "add"
                      ? "Create a service patients can choose when booking."
                      : "Update the service details shown to patients."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="service-modal-close"
                onClick={closeModal}
                disabled={isSaving}
              >
                ×
              </button>
            </div>

            <div className="service-modal-body">
              <div className="service-form-card">
              <div className="form-group">
                <label>Service Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter service name"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Enter description"
                  rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="Enter price"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    name="duration"
                    value={form.duration}
                    onChange={handleChange}
                    placeholder="Enter duration"
                    min="0"
                  />
                </div>
              </div>

              <label className="service-toggle-card">
                <input
                  type="checkbox"
                  name="enabled"
                  checked={form.enabled}
                  onChange={handleChange}
                />
                <span className="service-toggle-ui" aria-hidden="true" />
                <span>
                  <strong>{form.enabled ? "Service is enabled" : "Service is disabled"}</strong>
                  <small>
                    {form.enabled
                      ? "Patients can select this service when booking."
                      : "This service stays saved but hidden from active booking choices."}
                  </small>
                </span>
              </label>
              </div>
            </div>

            <div className="service-modal-footer">
              <button
                type="button"
                className="pill pill-gray"
                onClick={closeModal}
                disabled={isSaving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="pill pill-success"
                onClick={handleSaveService}
                disabled={isSaving}
              >
                {isSaving
                  ? "Saving..."
                  : modalMode === "add"
                  ? "Add Service"
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}  


        {validationPopup && (
  <div
    className="service-modal-overlay"
    onClick={() => setValidationPopup(null)}
  >
    <div
      className="service-modal"
      style={{ maxWidth: "380px", textAlign: "center" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="service-modal-body">
        <h3 style={{ color: "#0f4242", marginBottom: "10px" }}>
          Missing Information
        </h3>

        <p style={{ color: "#4b5563", marginBottom: "20px" }}>
          {validationPopup}
        </p>

        <button
          className="pill"
          style={{
            background: "#399a91",
            color: "#fff",
            padding: "8px 20px",
          }}
          onClick={() => setValidationPopup(null)}
        >
          OK
        </button>
      </div>
    </div>
  </div>
)}




   {showLogoutConfirm && (
  <div className="logout-confirm-overlay">
    <div className="logout-confirm-modal">
      <h3>Log out?</h3>
      <p>Are you sure you want to log out of your account?</p>

      <div className="logout-actions">
        <button
          className="btn-cancel"
          onClick={() => setShowLogoutConfirm(false)}
        >
          Cancel
        </button>

        <button
          className="btn-confirm"
          onClick={() => {
            setShowLogoutConfirm(false);
            setShowLogoutSuccess(true);

            setTimeout(() => {
              navigate("/signin");
            }, 1500);
          }}
        >
          Logout
        </button>
      </div>
    </div>
  </div>
)}


{showLogoutSuccess && (
  <div className="logout-popup-overlay">
    <div className="logout-popup">
      <div className="logout-icon">✓</div>
      <h3>Logged out successfully</h3>
    </div>
  </div>
)}     




    </div>
  );
}
