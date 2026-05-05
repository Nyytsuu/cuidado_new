import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Clock,
  Lock,
  MapPin,
  Save,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import SidebarClinic from "./SidebarClinic";
import "../SigninUser/Settings.css";

type ClinicProfile = {
  id: number;
  clinic_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  specialization: string | null;
  license_number: string | null;
  years_operation: number | null;
  rep_full_name: string | null;
  rep_position: string | null;
  rep_phone: string | null;
  services_offered: string | null;
  opening_time: string | null;
  closing_time: string | null;
  operating_days: string | null;
  status: string | null;
  account_status: string | null;
  location_text?: string | null;
};

type ClinicSettingsForm = {
  clinic_name: string;
  phone: string;
  address: string;
  specialization: string;
  years_operation: string;
  rep_full_name: string;
  rep_position: string;
  rep_phone: string;
  services_offered: string;
  opening_time: string;
  closing_time: string;
  operating_days: string;
};

const API = "http://localhost:5000/api";

const emptyForm: ClinicSettingsForm = {
  clinic_name: "",
  phone: "",
  address: "",
  specialization: "",
  years_operation: "",
  rep_full_name: "",
  rep_position: "",
  rep_phone: "",
  services_offered: "",
  opening_time: "08:00",
  closing_time: "17:00",
  operating_days: "mon-fri",
};

function getStoredClinicId(): number | null {
  try {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    if (user?.role === "clinic" && user?.id) return Number(user.id);
    if (user?.clinic_id) return Number(user.clinic_id);

    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("userId");
    if (role === "clinic" && userId) return Number(userId);
  } catch {
    return null;
  }

  return null;
}

function toTimeInput(value: string | null | undefined, fallback: string): string {
  const match = String(value || "").match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : fallback;
}

function toTitle(value: string | null | undefined): string {
  const text = String(value || "").trim();
  if (!text) return "Not provided";

  return text
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function toForm(profile: ClinicProfile): ClinicSettingsForm {
  return {
    clinic_name: profile.clinic_name || "",
    phone: profile.phone || "",
    address: profile.address || "",
    specialization: profile.specialization || "",
    years_operation:
      profile.years_operation !== null && profile.years_operation !== undefined
        ? String(profile.years_operation)
        : "",
    rep_full_name: profile.rep_full_name || "",
    rep_position: profile.rep_position || "",
    rep_phone: profile.rep_phone || "",
    services_offered: profile.services_offered || "",
    opening_time: toTimeInput(profile.opening_time, "08:00"),
    closing_time: toTimeInput(profile.closing_time, "17:00"),
    operating_days: profile.operating_days || "mon-fri",
  };
}

export default function ClinicSettings() {
  const clinicId = useMemo(() => getStoredClinicId(), []);

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [profile, setProfile] = useState<ClinicProfile | null>(null);
  const [form, setForm] = useState<ClinicSettingsForm>(emptyForm);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      if (!clinicId) {
        throw new Error("No logged-in clinic found.");
      }

      setLoading(true);
      setError("");
      setMessage("");

      const res = await fetch(`${API}/clinic/profile?clinic_id=${clinicId}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load clinic settings.");
      }

      const loadedProfile = data as ClinicProfile;
      setProfile(loadedProfile);
      setForm(toForm(loadedProfile));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clinic settings.");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const updateForm = (field: keyof ClinicSettingsForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveProfile = async () => {
    try {
      if (!clinicId) {
        throw new Error("No logged-in clinic found.");
      }

      setSavingProfile(true);
      setError("");
      setMessage("");

      const res = await fetch(`${API}/clinic/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinic_id: clinicId,
          ...form,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save clinic settings.");
      }

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...user,
            clinic_name: form.clinic_name,
            name: form.clinic_name,
            phone: form.phone,
          })
        );
      }

      setMessage("Clinic settings saved.");
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save clinic settings.");
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePassword = async () => {
    try {
      if (!clinicId) {
        throw new Error("No logged-in clinic found.");
      }

      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error("Please fill in all password fields.");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("New password and confirmation do not match.");
      }

      setSavingPassword(true);
      setError("");
      setMessage("");

      const res = await fetch(`${API}/clinic/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinic_id: clinicId,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to update password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className={`settings-page clinic-settings-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <SidebarClinic
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search settings..."
      />

      <main className="settings-main">
        <div className="settings-heading">
          <div>
            <h1>Clinic Settings</h1>
            <p>Manage clinic account information, operating defaults, and security.</p>
          </div>
          <button
            type="button"
            className="settings-primary-btn"
            onClick={saveProfile}
            disabled={loading || savingProfile}
          >
            <Save size={18} />
            {savingProfile ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {error && <div className="settings-alert error">{error}</div>}
        {message && <div className="settings-alert success">{message}</div>}

        {loading ? (
          <div className="settings-empty">Loading clinic settings...</div>
        ) : (
          <div className="settings-layout">
            <section className="settings-panel">
              <div className="settings-panel-head">
                <Building2 size={20} />
                <h2>Clinic Information</h2>
              </div>

              <div className="settings-grid">
                <label>
                  Clinic Name
                  <input
                    value={form.clinic_name}
                    onChange={(event) => updateForm("clinic_name", event.target.value)}
                  />
                </label>

                <label>
                  Phone
                  <input
                    value={form.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                    placeholder="+639XXXXXXXXX"
                  />
                </label>

                <label>
                  Clinic Type
                  <select
                    value={form.specialization}
                    onChange={(event) => updateForm("specialization", event.target.value)}
                  >
                    <option value="">Select type</option>
                    <option value="general">General</option>
                    <option value="dental">Dental</option>
                    <option value="pediatric">Pediatric</option>
                    <option value="laboratory">Laboratory</option>
                  </select>
                </label>

                <label>
                  Years of Operation
                  <input
                    type="number"
                    min="0"
                    max="150"
                    value={form.years_operation}
                    onChange={(event) => updateForm("years_operation", event.target.value)}
                  />
                </label>

                <label className="span-2">
                  Address
                  <textarea
                    value={form.address}
                    onChange={(event) => updateForm("address", event.target.value)}
                    rows={3}
                  />
                </label>
              </div>
            </section>

            <section className="settings-panel">
              <div className="settings-panel-head">
                <UserRound size={20} />
                <h2>Representative</h2>
              </div>

              <div className="settings-grid">
                <label>
                  Representative Name
                  <input
                    value={form.rep_full_name}
                    onChange={(event) => updateForm("rep_full_name", event.target.value)}
                  />
                </label>

                <label>
                  Position
                  <input
                    value={form.rep_position}
                    onChange={(event) => updateForm("rep_position", event.target.value)}
                  />
                </label>

                <label>
                  Representative Phone
                  <input
                    value={form.rep_phone}
                    onChange={(event) => updateForm("rep_phone", event.target.value)}
                    placeholder="+639XXXXXXXXX"
                  />
                </label>

                <label>
                  Services Offered
                  <input
                    value={form.services_offered}
                    onChange={(event) => updateForm("services_offered", event.target.value)}
                    placeholder="general, dental"
                  />
                </label>
              </div>
            </section>

            <section className="settings-panel">
              <div className="settings-panel-head">
                <Clock size={20} />
                <h2>Operating Defaults</h2>
              </div>

              <div className="settings-grid">
                <label>
                  Opening Time
                  <input
                    type="time"
                    value={form.opening_time}
                    onChange={(event) => updateForm("opening_time", event.target.value)}
                  />
                </label>

                <label>
                  Closing Time
                  <input
                    type="time"
                    value={form.closing_time}
                    onChange={(event) => updateForm("closing_time", event.target.value)}
                  />
                </label>

                <label>
                  Operating Days
                  <select
                    value={form.operating_days}
                    onChange={(event) => updateForm("operating_days", event.target.value)}
                  >
                    <option value="mon-fri">Monday - Friday</option>
                    <option value="mon-sat">Monday - Saturday</option>
                    <option value="daily">Daily</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="settings-panel">
              <div className="settings-panel-head">
                <Lock size={20} />
                <h2>Security</h2>
              </div>

              <div className="settings-grid">
                <label>
                  Current Password
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </label>

                <label>
                  New Password
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </label>

                <label>
                  Confirm New Password
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </label>
              </div>

              <button
                type="button"
                className="settings-secondary-btn"
                onClick={updatePassword}
                disabled={savingPassword}
              >
                <ShieldCheck size={18} />
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </section>

            <aside className="settings-side">
              <div className="settings-summary">
                <div className="settings-avatar">
                  {(form.clinic_name || "CL").slice(0, 2).toUpperCase()}
                </div>
                <h3>{form.clinic_name || "Clinic"}</h3>
                <p>{profile?.email || "No email"}</p>
                <span className={`settings-status ${profile?.account_status || "active"}`}>
                  {profile?.account_status || "active"}
                </span>
              </div>

              <div className="settings-summary-list">
                <div>
                  <Stethoscope size={16} />
                  <span>{toTitle(form.specialization)}</span>
                </div>
                <div>
                  <MapPin size={16} />
                  <span>{form.address || profile?.location_text || "No address"}</span>
                </div>
                <div>
                  <ShieldCheck size={16} />
                  <span>Approval: {toTitle(profile?.status)}</span>
                </div>
              </div>

              <div className="settings-note">
                Weekly schedule and blocked dates are managed from the Schedule page.
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
