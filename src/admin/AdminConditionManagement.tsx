import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AdminConditional.css";
import Sidebar from "./SidebarAdmin";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

type AdviceLevel = "self-care" | "consult" | "urgent";

type ConditionItem = {
  condition_id: number;
  condition_name: string;
  description: string;
  advice_level: AdviceLevel;
  when_to_seek_help: string;
  disclaimer: string;
  symptoms_count: number;
};


const API_BASE = "http://localhost:5000/api/admin/conditions";

export default function AdminConditionalManagement() {
  const navigate = useNavigate();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [q, setQ] = useState("");

  const [conditions, setConditions] = useState<ConditionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [conditionName, setConditionName] = useState("");
  const [description, setDescription] = useState("");
  const [adviceLevel, setAdviceLevel] = useState<AdviceLevel | "">("");
  const [whenToSeekHelp, setWhenToSeekHelp] = useState("");
  const [disclaimer, setDisclaimer] = useState("For informational purposes only.");

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

  const badgeClass = (level: AdviceLevel) => {
    if (level === "self-care") return "badge self-care";
    if (level === "consult") return "badge consult";
    return "badge urgent";
  };

  const adviceLabel = (level: AdviceLevel) => {
    if (level === "self-care") return "Self-Care";
    if (level === "consult") return "Consult";
    return "Urgent";
  };

  const fetchConditions = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_BASE);
      const data = await res.json();
      setConditions(data);
    } catch (err) {
      console.error("Failed to fetch conditions:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredConditions = useMemo(() => {
    return conditions.filter((item) =>
      item.condition_name.toLowerCase().includes(q.toLowerCase())
    );
  }, [conditions, q]);

  useEffect(() => {
    fetchConditions();
  }, []);

  const resetForm = () => {
    setConditionName("");
    setDescription("");
    setAdviceLevel("");
    setWhenToSeekHelp("");
    setDisclaimer("For informational purposes only.");
    setEditingId(null);
  };

  const handleSaveCondition = async () => {
    try {
      if (!conditionName.trim() || !description.trim() || !adviceLevel) {
        setToast({
  type: "warning",
  message: "Please fill in condition name, description, and advice level.",
});

setTimeout(() => setToast(null), 2500);
return;
        return;
      }

      const payload = {
        condition_name: conditionName,
        description,
        advice_level: adviceLevel,
        when_to_seek_help: whenToSeekHelp,
        disclaimer,
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
  message: data.message || "Failed to save condition",
});

setTimeout(() => setToast(null), 2500);
        return;
      }

      resetForm();
fetchConditions();

setToast({
  type: "success",
  message: editingId !== null
    ? "Condition updated successfully"
    : "Condition added successfully",
});

setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error("Save condition error:", err);
      setToast({
  type: "error",
  message: "Something went wrong while saving",
});

setTimeout(() => setToast(null), 2500);
    }
  };

  const handleEdit = (item: ConditionItem) => {
    setEditingId(item.condition_id);
    setConditionName(item.condition_name);
    setDescription(item.description || "");
    setAdviceLevel(item.advice_level);
    setWhenToSeekHelp(item.when_to_seek_help || "");
    setDisclaimer(item.disclaimer || "For informational purposes only.");
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
        message: data.message || "Failed to delete condition",
      });
      setTimeout(() => setToast(null), 2500);
      return;
    }

    setDeleteId(null);
    fetchConditions();

    setToast({
      type: "success",
      message: "Condition deleted successfully",
    });

    setTimeout(() => setToast(null), 2500);
  } catch (err) {
    console.error("Delete error:", err);

    setToast({
      type: "error",
      message: "Something went wrong while deleting",
    });

    setTimeout(() => setToast(null), 2500);
  }
};

  return (
    <div className="admin-UserClinics with-sidebar">
      <Sidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
      />

      <main className="preview-canvas">
        <header className="app-header">
          <div className="header-left">
            <img src={logo} alt="CUIDADO logo" className="brand-logo" />

            <div className="header-search">
              <input
                type="text"
                placeholder="Search keywords..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button aria-label="Search" type="button" className="search-btn">
                <img src={searchIcon} alt="Search" />
              </button>
            </div>
          </div>

          <nav className="header-nav">
            <Link className="nav-link" to="/admin/dashboard">
              Home
            </Link>
            <Link className="nav-link" to="/admin/appointments">
              Appointments
            </Link>

            <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
              <button
                type="button"
                className="nav-link profile-btn"
                onClick={() => setHeaderProfileOpen((v) => !v)}
              >
                Profile <span className="caret">▾</span>
              </button>

              <div className="profile-dropdown">
                <Link to="/admin/profile">My Profile</Link>
                <Link to="/admin/settings">Settings</Link>
                <button
                  type="button"
                  className="dropdown-logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </nav>
        </header>

        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="condition-page-head">
              <div className="admin-title">
                <h2>Condition Management</h2>
                <p className="admin-breadcrumb">Admin / Conditions</p>
              </div>

              <button
                type="button"
                className="add-condition-btn"
                onClick={resetForm}
              >
                + Add New Condition
              </button>
            </div>

            <section className="condition-form-card">
              <div className="condition-form-header">Add / Edit Condition</div>

              <div className="condition-form-body">
                <div className="condition-form-grid">
                  <div className="form-group">
                    <label>Condition Name</label>
                    <input
                      type="text"
                      value={conditionName}
                      onChange={(e) => setConditionName(e.target.value)}
                      placeholder="Enter condition name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Advice Level</label>
                    <select
                      value={adviceLevel}
                      onChange={(e) =>
                        setAdviceLevel(e.target.value as AdviceLevel | "")
                      }
                    >
                      <option value="">Select Level</option>
                      <option value="self-care">Self-Care</option>
                      <option value="consult">Consult</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter description"
                    />
                  </div>

                  <div className="form-group">
                    <label>When to Seek Help</label>
                    <textarea
                      rows={3}
                      value={whenToSeekHelp}
                      onChange={(e) => setWhenToSeekHelp(e.target.value)}
                      placeholder="Enter advice"
                    />
                  </div>

                  <div className="form-group form-group-full">
                    <label>Disclaimer</label>
                    <input
                      type="text"
                      value={disclaimer}
                      onChange={(e) => setDisclaimer(e.target.value)}
                      placeholder="For informational purposes only..."
                    />
                  </div>
                </div>

                <div className="condition-form-actions">
                  <button
                    type="button"
                    className="save-condition-btn"
                    onClick={handleSaveCondition}
                  >
                    Save Condition
                  </button>
                  <button
                    type="button"
                    className="cancel-condition-btn"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>

            <section className="condition-list-card">
              <div className="condition-list-top">
                <h3>Conditions List</h3>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table clinics-table">
                  <thead>
                    <tr>
                      <th>Condition</th>
                      <th>Advice Level</th>
                      <th>Symptoms</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="empty-cell">Loading...</td>
                      </tr>
                    ) : filteredConditions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="empty-cell">No conditions found.</td>
                      </tr>
                    ) : (
                     filteredConditions.map((item) => (
  <tr key={item.condition_id}>
    <td>{item.condition_name}</td>
    <td>
      <span className={badgeClass(item.advice_level)}>
        {adviceLabel(item.advice_level)}
      </span>
    </td>
    <td>{item.symptoms_count} Symptoms</td>
    <td>
      <div className="condition-actions">
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
          onClick={() => setDeleteId(item.condition_id)}
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
   
    {toast && (
  <div className={`condition-toast ${toast.type}`}>
    <div className="condition-toast-content">
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
        <h3>Delete Condition</h3>

        <p>
          Are you sure you want to delete this condition?
        </p>

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

    </div>
  );
}