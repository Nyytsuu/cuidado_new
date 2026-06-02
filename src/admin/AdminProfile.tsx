import { useMemo, useState } from "react";
import "./AdminDashboard.css";
import "./AdminHeader.css";
import "./AdminProfile.css";
import SidebarAdmin from "./SidebarAdmin";
import AdminHeader from "./AdminHeader";

type StoredUser = {
  id?: number | string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
};

const readStoredUser = (): StoredUser => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}") as StoredUser;
  } catch {
    return {};
  }
};

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AD";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

function AdminProfile() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [q, setQ] = useState("");
  const storedUser = useMemo(readStoredUser, []);

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(
    storedUser.full_name || storedUser.name || "Cuidado Admin"
  );
  const [email, setEmail] = useState(storedUser.email || "admin@cuidado.local");
  const [draftName, setDraftName] = useState(displayName);
  const [draftEmail, setDraftEmail] = useState(email);

  const role = String(storedUser.role || localStorage.getItem("role") || "admin");
  const adminId = storedUser.id ? `#${storedUser.id}` : "Not available";
  const initials = getInitials(displayName);

  const handleEdit = () => {
    setDraftName(displayName);
    setDraftEmail(email);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraftName(displayName);
    setDraftEmail(email);
    setIsEditing(false);
  };

  const handleSave = () => {
    const nextName = draftName.trim() || "Cuidado Admin";
    const nextEmail = draftEmail.trim() || email;

    setDisplayName(nextName);
    setEmail(nextEmail);
    setIsEditing(false);

    const nextUser = {
      ...storedUser,
      name: nextName,
      full_name: nextName,
      email: nextEmail,
      role,
    };

    localStorage.setItem("user", JSON.stringify(nextUser));
  };

  return (
    <div
      className={`admin-dashboard-page admin-profile-page ${
        sidebarExpanded ? "sidebar-expanded" : ""
      }`}
    >
      <SidebarAdmin
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
      />

      <main className="admin-main admin-profile-main">
        <AdminHeader
          searchValue={q}
          onSearchChange={setQ}
          searchPlaceholder="Search profile..."
        />

        <section className="admin-profile-hero">
          <div className="admin-profile-avatar" aria-hidden="true">
            {initials}
          </div>

          <div className="admin-profile-heading">
            <p className="admin-profile-kicker">My Admin Profile</p>
            <h1>{displayName}</h1>
            <span>{email}</span>
          </div>

          <div className="admin-profile-actions">
            {isEditing ? (
              <>
                <button type="button" className="profile-btn secondary" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="button" className="profile-btn primary" onClick={handleSave}>
                  Save
                </button>
              </>
            ) : (
              <button type="button" className="profile-btn primary" onClick={handleEdit}>
                Edit Profile
              </button>
            )}
          </div>
        </section>

        <section className="admin-profile-grid">
          <article className="admin-profile-panel account-panel">
            <div className="panel-heading">
              <h2>Account Details</h2>
              <span className="status-pill">Active</span>
            </div>

            <div className="profile-field-grid">
              <label className="profile-field">
                <span>Display name</span>
                {isEditing ? (
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder="Admin name"
                  />
                ) : (
                  <strong>{displayName}</strong>
                )}
              </label>

              <label className="profile-field">
                <span>Email address</span>
                {isEditing ? (
                  <input
                    type="email"
                    value={draftEmail}
                    onChange={(event) => setDraftEmail(event.target.value)}
                    placeholder="admin@email.com"
                  />
                ) : (
                  <strong>{email}</strong>
                )}
              </label>

              <div className="profile-field">
                <span>Role</span>
                <strong>{role.charAt(0).toUpperCase() + role.slice(1)}</strong>
              </div>

              <div className="profile-field">
                <span>Admin ID</span>
                <strong>{adminId}</strong>
              </div>
            </div>
          </article>

          <article className="admin-profile-panel compact-panel">
            <h2>Access</h2>
            <div className="profile-info-list">
              <div>
                <span>Permissions</span>
                <strong>Full admin access</strong>
              </div>
              <div>
                <span>Session</span>
                <strong>Signed in on this browser</strong>
              </div>
              <div>
                <span>Password</span>
                <strong>Managed from login credentials</strong>
              </div>
            </div>
          </article>

          <article className="admin-profile-panel compact-panel">
            <h2>Admin Tools</h2>
            <div className="tool-list">
              <span>Clinics</span>
              <span>Appointments</span>
              <span>Users</span>
              <span>Health content</span>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default AdminProfile;
