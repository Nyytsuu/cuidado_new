import { useEffect, useMemo, useState } from "react";
import "./AdminConditionSymptomMapping.css";
import "./AdminHeader.css";
import Sidebar from "./SidebarAdmin";
import AdminHeader from "./AdminHeader";

type ConditionItem = {
  condition_id: number;
  condition_name: string;
  body_system_id?: number | null;
  body_system_name?: string | null;
};

type SymptomItem = {
  symptom_id: number;
  symptom_name: string;
  description?: string | null;
  category: string;
  body_system_id?: number | null;
  body_system_name?: string | null;
  is_red_flag: boolean;
};

type SelectedSymptom = {
  symptom_id: number;
  weight: number;
  required_symptom: boolean;
};

const API_BASE = "http://localhost:5000/api/admin/condition-symptoms";

export default function AdminConditionSymptomMapping() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [q, setQ] = useState("");
  const [conditions, setConditions] = useState<ConditionItem[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomItem[]>([]);
  const [selectedConditionId, setSelectedConditionId] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<SelectedSymptom[]>([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
  type: "success" | "error" | "warning";
  message: string;
} | null>(null);




  const fetchConditions = async () => {
    try {
      const res = await fetch(`${API_BASE}/conditions`);
      if (!res.ok) {
        throw new Error(`Failed to fetch conditions (${res.status})`);
      }
      const data = await res.json();
      setConditions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch conditions:", err);
      setConditions([]);
      setToast({
        type: "error",
        message: "Failed to load conditions.",
      });
      setTimeout(() => setToast(null), 2500);
    }
  };

  const fetchSymptoms = async () => {
    try {
      const res = await fetch(`${API_BASE}/symptoms`);
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
    }
  };

  const fetchMappedSymptoms = async (conditionId: string) => {
    if (!conditionId) {
      setSelectedSymptoms([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/${conditionId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch mapped symptoms (${res.status})`);
      }
      const data = await res.json();
      setSelectedSymptoms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch mapped symptoms:", err);
      setSelectedSymptoms([]);
      setToast({
        type: "error",
        message: "Failed to load mapped symptoms.",
      });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConditions();
    fetchSymptoms();
  }, []);

  useEffect(() => {
    fetchMappedSymptoms(selectedConditionId);
  }, [selectedConditionId]);

  const filteredSymptoms = useMemo(() => {
    const term = q.toLowerCase();
    return symptoms.filter(
      (item) =>
        item.symptom_name.toLowerCase().includes(term) ||
        (item.description || "").toLowerCase().includes(term) ||
        (item.category || "").toLowerCase().includes(term) ||
        (item.body_system_name || "").toLowerCase().includes(term)
    );
  }, [symptoms, q]);

  const selectedCondition = useMemo(
    () =>
      conditions.find(
        (condition) => String(condition.condition_id) === String(selectedConditionId)
      ),
    [conditions, selectedConditionId]
  );

  const selectedSymptomIds = useMemo(
    () => new Set(selectedSymptoms.map((item) => item.symptom_id)),
    [selectedSymptoms]
  );

  const visibleSymptoms = useMemo(() => {
    if (!showSelectedOnly) return filteredSymptoms;

    return filteredSymptoms.filter((symptom) =>
      selectedSymptomIds.has(symptom.symptom_id)
    );
  }, [filteredSymptoms, selectedSymptomIds, showSelectedOnly]);

  const toggleSymptom = (symptomId: number) => {
    setSelectedSymptoms((prev) => {
      const exists = prev.find((item) => item.symptom_id === symptomId);

      if (exists) {
        return prev.filter((item) => item.symptom_id !== symptomId);
      }

      return [
        ...prev,
        {
          symptom_id: symptomId,
          weight: 1,
          required_symptom: false,
        },
      ];
    });
  };

  const updateWeight = (symptomId: number, weight: number) => {
    const safeImportance = Number.isFinite(weight)
      ? Math.min(5, Math.max(1, weight))
      : 1;

    setSelectedSymptoms((prev) =>
      prev.map((item) =>
        item.symptom_id === symptomId
          ? { ...item, weight: safeImportance }
          : item
      )
    );
  };

  const updateRequired = (symptomId: number, required: boolean) => {
    setSelectedSymptoms((prev) =>
      prev.map((item) =>
        item.symptom_id === symptomId
          ? { ...item, required_symptom: required }
          : item
      )
    );
  };

  const handleSave = async () => {
    if (!selectedConditionId) {
     setToast({
  type: "warning",
  message: "Please select a condition first.",
});

setTimeout(() => setToast(null), 2500);
return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE}/${selectedConditionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: selectedSymptoms }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to save mapping.");
        return;
      }

     setToast({
  type: "success",
  message: "Condition-symptom mapping saved successfully.",
});

setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error("Save mapping error:", err);
      alert("Something went wrong while saving mapping.");
    } finally {
      setSaving(false);
    }
  };

  const clearAll = () => {
    setSelectedSymptoms([]);
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
        <AdminHeader searchValue={q} onSearchChange={setQ} searchPlaceholder="Search symptoms..." />

        <section className="admin-content">
          <div className="admin-content-inner">
            <div className="mapping-page-head">
              <div className="admin-title">
                <h2>Condition–Symptom Mapping</h2>
                <p className="admin-breadcrumb">Admin / Condition Symptom Mapping</p>
              </div>
            </div>

            <section className="mapping-form-card">
              <div className="mapping-form-header">Assign Symptoms to Condition</div>

              <div className="mapping-form-body">
                <div className="mapping-top-controls">
                  <div className="form-group condition-select-group">
                    <label>Select Condition</label>
                    <select
                      value={selectedConditionId}
                      onChange={(e) => {
                        setSelectedConditionId(e.target.value);
                        setShowSelectedOnly(false);
                      }}
                    >
                      <option value="">Choose condition</option>
                      {conditions.map((condition) => (
                        <option
                          key={condition.condition_id}
                          value={condition.condition_id}
                        >
                          {condition.condition_name}
                          {condition.body_system_name ? ` (${condition.body_system_name})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mapping-summary">
                    <button
                      type="button"
                      className={`summary-card summary-card-button ${
                        showSelectedOnly ? "is-active" : ""
                      }`}
                      onClick={() => setShowSelectedOnly((current) => !current)}
                      aria-pressed={showSelectedOnly}
                    >
                      <span>Selected Symptoms</span>
                      <strong>{selectedSymptoms.length}</strong>
                      <small>
                        {showSelectedOnly ? "Showing selected" : "Click to view"}
                      </small>
                    </button>
                    <div className="summary-card">
                      <span>Body System</span>
                      <strong className="summary-card-text">
                        {selectedCondition?.body_system_name || "Not linked"}
                      </strong>
                    </div>
                  </div>
                </div>

                {!selectedConditionId ? (
                  <div className="mapping-empty-state">
                    Select a condition to start assigning symptoms.
                  </div>
                ) : loading ? (
                  <div className="mapping-empty-state">Loading mapped symptoms...</div>
                ) : (
                  <div className="mapping-table-wrap">
                    <table className="mapping-table">
                      <thead>
                        <tr>
                          <th>Select</th>
                          <th>Symptom</th>
                          <th>Description</th>
                          <th>Category</th>
                          <th>Body System</th>
                          <th>Red Flag</th>
                          <th>
                            Importance
                            <span className="mapping-column-hint">1 low - 5 high</span>
                          </th>
                          <th>Required Symptom</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleSymptoms.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="empty-cell">
                              {showSelectedOnly
                                ? "No selected symptoms to show."
                                : "No symptoms found."}
                            </td>
                          </tr>
                        ) : (
                          visibleSymptoms.map((symptom) => {
                            const selected = selectedSymptoms.find(
                              (item) => item.symptom_id === symptom.symptom_id
                            );

                            return (
                              <tr key={symptom.symptom_id}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={!!selected}
                                    onChange={() => toggleSymptom(symptom.symptom_id)}
                                  />
                                </td>
                                <td>{symptom.symptom_name}</td>
                                <td className="mapping-description-cell">
                                  {symptom.description || "--"}
                                </td>
                                <td>{symptom.category || "--"}</td>
                                <td>{symptom.body_system_name || "--"}</td>
                                <td>
                                  <span
                                    className={
                                      symptom.is_red_flag
                                        ? "status-badge red-yes"
                                        : "status-badge red-no"
                                    }
                                  >
                                    {symptom.is_red_flag ? "Yes" : "No"}
                                  </span>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    className="weight-input"
                                    disabled={!selected}
                                    value={selected ? selected.weight : 1}
                                    onChange={(e) =>
                                      updateWeight(
                                        symptom.symptom_id,
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="checkbox"
                                    disabled={!selected}
                                    checked={selected ? selected.required_symptom : false}
                                    onChange={(e) =>
                                      updateRequired(
                                        symptom.symptom_id,
                                        e.target.checked
                                      )
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mapping-actions">
                  <button
                    type="button"
                    className="save-mapping-btn"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Mapping"}
                  </button>

                  <button
                    type="button"
                    className="clear-mapping-btn"
                    onClick={clearAll}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
      

      {toast && (
  <div className={`mapping-toast ${toast.type}`}>
    <div className="mapping-toast-content">
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
