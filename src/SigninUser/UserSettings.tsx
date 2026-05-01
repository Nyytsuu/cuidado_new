import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import UserSidebar from "../Categories/UserSidebar";
import "./Settings.css";

type UserProfile = {
  id: number;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  province_id: number | null;
  municipality_id: number | null;
  barangay_id: number | null;
  address: string | null;
  consent: number | boolean | null;
  status: "active" | "disabled";
};

type UserSettingsForm = {
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  address: string;
  consent: boolean;
};

const API = "http://localhost:5000/api";

const emptyForm: UserSettingsForm = {
  full_name: "",
  email: "",
  phone: "",
  gender: "",
  date_of_birth: "",
  address: "",
  consent: false,
};

function getStoredUserId(): number | null {
  try {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    return user?.id ? Number(user.id) : null;
  } catch {
    return null;
  }
}

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function toForm(profile: UserProfile): UserSettingsForm {
  return {
    full_name: profile.full_name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    gender: profile.gender || "",
    date_of_birth: toDateInput(profile.date_of_birth),
    address: profile.address || "",
    consent: Boolean(profile.consent),
  };
}

export default function UserSettings() {
  const userId = getStoredUserId();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<UserSettingsForm>(emptyForm);
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
      if (!userId) {
        throw new Error("No logged-in user found.");
      }

      setLoading(true);
      setError("");
      setMessage("");

      const res = await fetch(`${API}/users/${userId}/profile`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load user settings.");
      }

      const loadedProfile = data as UserProfile;
      setProfile(loadedProfile);
      setForm(toForm(loadedProfile));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const updateForm = (
    field: keyof UserSettingsForm,
    value: string | boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveProfile = async () => {
    try {
      if (!userId || !profile) {
        throw new Error("No logged-in user found.");
      }

      setSavingProfile(true);
      setError("");
      setMessage("");

      const res = await fetch(`${API}/users/${userId}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          province_id: profile.province_id,
          municipality_id: profile.municipality_id,
          barangay_id: profile.barangay_id,
          status: profile.status,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save user settings.");
      }

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...user,
            full_name: form.full_name,
            name: form.full_name,
            email: form.email,
            phone: form.phone,
          })
        );
      }

      setMessage("User settings saved.");
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePassword = async () => {
    try {
      if (!userId) {
        throw new Error("No logged-in user found.");
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

      const res = await fetch(`${API}/users/${userId}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
    <div className={`settings-page user-settings-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
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
            <h1>User Settings</h1>
            <p>Manage account details, contact information, and security.</p>
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
          <div className="settings-empty">Loading settings...</div>
        ) : (
          <div className="settings-layout">
            <section className="settings-panel">
              <div className="settings-panel-head">
                <User size={20} />
                <h2>Account Information</h2>
              </div>

              <div className="settings-grid">
                <label>
                  Full Name
                  <input
                    value={form.full_name}
                    onChange={(event) => updateForm("full_name", event.target.value)}
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                  />
                </label>

                <label>
                  Phone
                  <input
                    value={form.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                    placeholder="09XXXXXXXXX"
                  />
                </label>

                <label>
                  Gender
                  <select
                    value={form.gender}
                    onChange={(event) => updateForm("gender", event.target.value)}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label>
                  Date of Birth
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(event) => updateForm("date_of_birth", event.target.value)}
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
                  {(form.full_name || "U").slice(0, 2).toUpperCase()}
                </div>
                <h3>{form.full_name || "User"}</h3>
                <p>{form.email || "No email"}</p>
                <span className={`settings-status ${profile?.status || "active"}`}>
                  {profile?.status || "active"}
                </span>
              </div>

              <div className="settings-summary-list">
                <div>
                  <Mail size={16} />
                  <span>{form.email || "No email"}</span>
                </div>
                <div>
                  <Phone size={16} />
                  <span>{form.phone || "No phone"}</span>
                </div>
                <div>
                  <MapPin size={16} />
                  <span>{form.address || "No address"}</span>
                </div>
              </div>

              <label className="settings-toggle-row">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(event) => updateForm("consent", event.target.checked)}
                />
                <span>
                  <Bell size={16} />
                  Allow account notices and care reminders.
                </span>
              </label>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
