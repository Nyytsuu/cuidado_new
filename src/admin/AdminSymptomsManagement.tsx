import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AdminSymptomsManagement.css";
import "./AdminHeader.css";
import Sidebar from "./SidebarAdmin";
import AdminHeader from "./AdminHeader";

type SymptomItem = {
  symptom_id: number;
  symptom_name: string;
  description?: string | null;
  category: string;
  body_system_id?: number | null;
  body_system_name?: string | null;
  is_red_flag: boolean;
};

type BodySystemOption = {
  id: number;
  name: string;
  slug?: string | null;
  icon?: string | null;
};

type SortKey = "symptom" | "category" | "bodySystem" | "redFlag";
type SortDirection = "asc" | "desc";

const API_BASE = "http://localhost:5000/api/admin/symptoms";

export default function AdminSymptomsManagement() {
  const navigate = useNavigate();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [bodySystemFilter, setBodySystemFilter] = useState("all");
  const [redFlagFilter, setRedFlagFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("symptom");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [symptoms, setSymptoms] = useState<SymptomItem[]>([]);
  const [bodySystems, setBodySystems] = useState<BodySystemOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [symptomName, setSymptomName] = useState("");
  const [symptomDescription, setSymptomDescription] = useState("");
  const [category, setCategory] = useState("");
  const [bodySystemId, setBodySystemId] = useState("");
  const [isRedFlag, setIsRedFlag] = useState(false);
   

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [toast, setToast] = useState<{
  type: "success" | "error" | "warning";
  message: string;
} | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/signin");
  };

  const fetchSymptoms = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_BASE);
      if (!res.ok) {
        throw new Error(`Failed to fetch symptoms (${res.status})`);
      }
      const data = await res.json();
      setSymptoms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch symptoms:", err);
      setSymptoms([]);
      setToast({
        type: "error",
        message: "Failed to load symptoms.",
      });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setLoading(false);
    }
  };

  const fetchBodySystems = async () => {
    try {
      const res = await fetch(`${API_BASE}/body-systems/options`);
      if (!res.ok) {
        throw new Error(`Failed to fetch body systems (${res.status})`);
      }
      const data = await res.json();
      setBodySystems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch body systems:", err);
      setBodySystems([]);
    }
  };

  useEffect(() => {
    fetchSymptoms();
    fetchBodySystems();
  }, []);

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        symptoms
          .map((item) => item.category?.trim())
          .filter((item): item is string => Boolean(item))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [symptoms]);

  const filteredSymptoms = useMemo(() => {
    const visible = symptoms.filter((item) => {
      const term = q.toLowerCase();
      const itemCategory = item.category?.trim() || "";
      const itemBodySystemId = item.body_system_id ? String(item.body_system_id) : "";
      const itemBodySystemName = item.body_system_name?.trim() || "";
      const itemIsRedFlag = Boolean(item.is_red_flag);

      if (categoryFilter !== "all" && itemCategory !== categoryFilter) {
        return false;
      }

      if (bodySystemFilter !== "all" && itemBodySystemId !== bodySystemFilter) {
        return false;
      }

      if (redFlagFilter !== "all" && itemIsRedFlag !== (redFlagFilter === "yes")) {
        return false;
      }

      return (
        item.symptom_name.toLowerCase().includes(term) ||
        (item.description || "").toLowerCase().includes(term) ||
        itemCategory.toLowerCase().includes(term) ||
        itemBodySystemName.toLowerCase().includes(term)
      );
    });

    return [...visible].sort((a, b) => {
      let result = 0;

      if (sortBy === "category") {
        result = (a.category || "").trim().localeCompare((b.category || "").trim());
      } else if (sortBy === "bodySystem") {
        result = (a.body_system_name || "").trim().localeCompare((b.body_system_name || "").trim());
      } else if (sortBy === "redFlag") {
        result = Number(Boolean(a.is_red_flag)) - Number(Boolean(b.is_red_flag));
      } else {
        result = a.symptom_name.localeCompare(b.symptom_name);
      }

      if (result === 0) {
        result = a.symptom_name.localeCompare(b.symptom_name);
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [symptoms, q, categoryFilter, bodySystemFilter, redFlagFilter, sortBy, sortDirection]);

  const resetForm = () => {
    setSymptomName("");
    setSymptomDescription("");
    setCategory("");
    setBodySystemId("");
    setIsRedFlag(false);
    setEditingId(null);
  };

  const handleSaveSymptom = async () => {
    try {
      if (!symptomName.trim()) {
        setToast({
  type: "warning",
  message: "Please enter symptom name.",
});

setTimeout(() => setToast(null), 2500);
return;
      }

      const payload = {
        symptom_name: symptomName,
        description: symptomDescription,
        category,
        body_system_id: bodySystemId ? Number(bodySystemId) : null,
        is_red_flag: isRedFlag,
      };

      let res;

      if (editingId !== null) {
        res = await fetch(`${API_BASE}/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        setToast({
  type: "error",
  message: data.message || "Failed to save symptom",
});

setTimeout(() => setToast(null), 2500);
        return;
      }

      const wasEditing = editingId !== null;
      resetForm();
      fetchSymptoms();

      setToast({
        type: "success",
        message: wasEditing
          ? "Symptom updated successfully"
          : "Symptom added successfully",
      });

      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error("Save symptom error:", err);
      setToast({
  type: "error",
  message: "Something went wrong while saving",
});

setTimeout(() => setToast(null), 2500);
    }
  };

  const handleEdit = (item: SymptomItem) => {
    setEditingId(item.symptom_id);
    setSymptomName(item.symptom_name);
    setSymptomDescription(item.description || "");
    setCategory(item.category || "");
    setBodySystemId(item.body_system_id ? String(item.body_system_id) : "");
    setIsRedFlag(!!item.is_red_flag);
  };

  const confirmDelete = async () => {
  if (!deleteId) return;

  try {
    const res = await fetch(`${API_BASE}/${deleteId}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      setToast({
        type: "error",
        message: data.message || "Failed to delete symptom",
      });
      setTimeout(() => setToast(null), 2500);
      return;
    }

    setDeleteId(null);
    fetchSymptoms();

    setToast({
      type: "success",
      message: "Symptom deleted successfully",
    });

    setTimeout(() => setToast(null), 2500);
  } catch (err) {
    console.error(err);

    setToast({
      type: "error",
      message: "Something went wrong while deleting",
    });

    setTimeout(() => setToast(null), 2500);
  }
};

  return (
    <div
      className={`admin-UserClinics admin-symptoms-management with-sidebar ${
        sidebarExpanded ? "sidebar-expanded" : ""
      }`}
    >
      <Sidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
      />

      <main className="preview-canvas">
        <AdminHeader searchValue={q} onSearchChange={setQ} />

        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="symptom-page-head">
              <div className="admin-title">
                <h2>Symptoms Management</h2>
                <p className="admin-breadcrumb">Admin / Symptoms</p>
              </div>

              <button
                type="button"
                className="add-symptom-btn"
                onClick={resetForm}
              >
                + Add New Symptom
              </button>
            </div>

            <section className="symptom-form-card">
              <div className="symptom-form-header">Add / Edit Symptom</div>

              <div className="symptom-form-body">
                <div className="symptom-form-grid">
                  <div className="form-group">
                    <label>Symptom Name</label>
                    <input
                      type="text"
                      value={symptomName}
                      onChange={(e) => setSymptomName(e.target.value)}
                      placeholder="Enter symptom name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Respiratory, General"
                    />
                  </div>

                  <div className="form-group">
                    <label>Body System</label>
                    <select
                      value={bodySystemId}
                      onChange={(e) => setBodySystemId(e.target.value)}
                    >
                      <option value="">Not linked</option>
                      {bodySystems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.icon ? `${item.icon} ` : ""}
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group form-group-full">
                    <label>Description</label>
                    <textarea
                      rows={3}
                      value={symptomDescription}
                      onChange={(e) => setSymptomDescription(e.target.value)}
                      placeholder="Briefly describe what this symptom means or how it may feel."
                    />
                  </div>

                  <div className="form-group form-group-full">
                    <label className="red-flag-label">Red Flag Symptom</label>
                    <div className="red-flag-toggle">
                      <label className="radio-wrap">
                        <input
                          type="radio"
                          name="redFlag"
                          checked={!isRedFlag}
                          onChange={() => setIsRedFlag(false)}
                        />
                        <span>No</span>
                      </label>

                      <label className="radio-wrap">
                        <input
                          type="radio"
                          name="redFlag"
                          checked={isRedFlag}
                          onChange={() => setIsRedFlag(true)}
                        />
                        <span>Yes</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="symptom-form-actions">
                  <button
                    type="button"
                    className="save-symptom-btn"
                    onClick={handleSaveSymptom}
                  >
                    {editingId !== null ? "Update Symptom" : "Save Symptom"}
                  </button>

                  <button
                    type="button"
                    className="cancel-symptom-btn"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>

            <section className="symptom-list-card">
              <div className="symptom-list-top">
                <div>
                  <h3>Symptoms List</h3>
                  <p>
                    Showing {filteredSymptoms.length} of {symptoms.length} symptoms
                  </p>
                </div>

                <div className="symptom-list-controls">
                  <label className="symptom-list-control">
                    <span>Category</span>
                    <select
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                    >
                      <option value="all">All categories</option>
                      {categoryOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="symptom-list-control">
                    <span>Body system</span>
                    <select
                      value={bodySystemFilter}
                      onChange={(event) => setBodySystemFilter(event.target.value)}
                    >
                      <option value="all">All body systems</option>
                      {bodySystems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="symptom-list-control">
                    <span>Red flag</span>
                    <select
                      value={redFlagFilter}
                      onChange={(event) => setRedFlagFilter(event.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="yes">Red flags only</option>
                      <option value="no">Not red flag</option>
                    </select>
                  </label>

                  <label className="symptom-list-control">
                    <span>Sort by</span>
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value as SortKey)}
                    >
                      <option value="symptom">Symptom name</option>
                      <option value="category">Category</option>
                      <option value="bodySystem">Body system</option>
                      <option value="redFlag">Red flag</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    className="sort-direction-btn"
                    onClick={() =>
                      setSortDirection((current) =>
                        current === "asc" ? "desc" : "asc"
                      )
                    }
                  >
                    {sortDirection === "asc" ? "Ascending" : "Descending"}
                  </button>
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table symptoms-table">
                  <thead>
                    <tr>
                      <th>Symptom</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Body System</th>
                      <th>Red Flag</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="empty-cell">
                          Loading...
                        </td>
                      </tr>
                    ) : filteredSymptoms.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-cell">
                          No symptoms found.
                        </td>
                      </tr>
                    ) : (
                      filteredSymptoms.map((item) => (
                        <tr key={item.symptom_id}>
                          <td>{item.symptom_name}</td>
                          <td className="symptom-description-cell">
                            {item.description || "--"}
                          </td>
                          <td>{item.category || "--"}</td>
                          <td>{item.body_system_name || "--"}</td>
                          <td>
                            <span
                              className={
                                item.is_red_flag
                                  ? "status-badge red-yes"
                                  : "status-badge red-no"
                              }
                            >
                              {item.is_red_flag ? "Yes" : "No"}
                            </span>
                          </td>
                          <td>
                            <div className="symptom-actions">
                              <button
                                type="button"
                                className="action-link edit"
                                onClick={() => handleEdit(item)}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="action-link delete"
                               onClick={() => setDeleteId(item.symptom_id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </main>
       





        {deleteId && (
  <div
    className="delete-modal-overlay"
    onClick={() => setDeleteId(null)}
  >
    <div
      className="delete-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="delete-modal-content">
        <h3>Delete Symptom</h3>

        <p>Are you sure you want to delete this symptom?</p>

        <div className="delete-modal-actions">
          <button
            className="btn-cancel"
            onClick={() => setDeleteId(null)}
          >
            Cancel
          </button>

          <button
            className="btn-delete"
            onClick={confirmDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    






              {toast && (
  <div className={`symptom-toast ${toast.type}`}>
    <div className="symptom-toast-content">
     <span className="toast-icon">
  {toast.type === "success"
    ? "✔"
    : toast.type === "error"
    ? "✖"
    : "⚠"}
</span>
      <span>{toast.message}</span>
    </div>
  </div>
)}


    </div>
  );
}
