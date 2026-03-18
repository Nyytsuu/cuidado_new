import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AdminSymptomsManagement.css";
import Sidebar from "./SidebarAdmin";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

type SymptomItem = {
  symptom_id: number;
  symptom_name: string;
  category: string;
  is_red_flag: boolean;
};

const API_BASE = "http://localhost:5000/api/admin/symptoms";

export default function AdminSymptomsManagement() {
  const navigate = useNavigate();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [q, setQ] = useState("");

  const [symptoms, setSymptoms] = useState<SymptomItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [symptomName, setSymptomName] = useState("");
  const [category, setCategory] = useState("");
  const [isRedFlag, setIsRedFlag] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/signin");
  };

  const fetchSymptoms = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_BASE);
      const data = await res.json();
      setSymptoms(data);
    } catch (err) {
      console.error("Failed to fetch symptoms:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSymptoms();
  }, []);

  const filteredSymptoms = useMemo(() => {
    return symptoms.filter((item) => {
      const term = q.toLowerCase();
      return (
        item.symptom_name.toLowerCase().includes(term) ||
        (item.category || "").toLowerCase().includes(term)
      );
    });
  }, [symptoms, q]);

  const resetForm = () => {
    setSymptomName("");
    setCategory("");
    setIsRedFlag(false);
    setEditingId(null);
  };

  const handleSaveSymptom = async () => {
    try {
      if (!symptomName.trim()) {
        alert("Please enter symptom name.");
        return;
      }

      const payload = {
        symptom_name: symptomName,
        category,
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
        alert(data.message || "Failed to save symptom.");
        return;
      }

      resetForm();
      fetchSymptoms();
    } catch (err) {
      console.error("Save symptom error:", err);
      alert("Something went wrong while saving.");
    }
  };

  const handleEdit = (item: SymptomItem) => {
    setEditingId(item.symptom_id);
    setSymptomName(item.symptom_name);
    setCategory(item.category || "");
    setIsRedFlag(!!item.is_red_flag);
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this symptom?");
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to delete symptom.");
        return;
      }

      fetchSymptoms();
    } catch (err) {
      console.error("Delete symptom error:", err);
      alert("Something went wrong while deleting.");
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
                    Save Symptom
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
                <h3>Symptoms List</h3>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table symptoms-table">
                  <thead>
                    <tr>
                      <th>Symptom</th>
                      <th>Category</th>
                      <th>Red Flag</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="empty-cell">
                          Loading...
                        </td>
                      </tr>
                    ) : filteredSymptoms.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="empty-cell">
                          No symptoms found.
                        </td>
                      </tr>
                    ) : (
                      filteredSymptoms.map((item) => (
                        <tr key={item.symptom_id}>
                          <td>{item.symptom_name}</td>
                          <td>{item.category || "--"}</td>
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
                                onClick={() => handleDelete(item.symptom_id)}
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
    </div>
  );
}