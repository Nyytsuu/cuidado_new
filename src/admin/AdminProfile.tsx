import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

const PERMISSIONS = [
  "Clinic Management",
  "Appointment Oversight",
  "User Management",
  "Health Content",
  "Reports & Analytics",
  "Services Management",
];

const TOOL_LINKS: { label: string; to: string }[] = [
  { label: "Clinics", to: "/admin/clinics" },
  { label: "Appointments", to: "/admin/appointments" },
  { label: "Users", to: "/admin/users" },
  { label: "Health Content", to: "/admin/conditions" },
  { label: "Reports", to: "/admin/reports" },
  { label: "Services", to: "/admin/services" },
];

export default function AdminProfile() {
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
  const adminId = storedUser.id ? `#${storedUser.id}` : "—";
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
    localStorage.setItem(
      "user",
      JSON.stringify({ ...storedUser, name: nextName, full_name: nextName, email: nextEmail, role })
    );
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

      <main className="admin-main ap-main">
        <AdminHeader searchValue={q} onSearchChange={setQ} searchPlaceholder="Search profile..." />

        {/* ── Cover card ── */}
        <div className="ap-cover">
          <div className="ap-banner" />
          <div className="ap-cover-body">
            <div className="ap-avatar" aria-hidden="true">{initials}</div>

            <div className="ap-identity">
              <h1>{displayName}</h1>
              <p>{email}</p>
              <span className="ap-role-badge">
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
            </div>

            <div className="ap-cover-actions">
              {isEditing ? (
                <>
                  <button type="button" className="ap-btn ap-ghost" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="button" className="ap-btn ap-solid" onClick={handleSave}>
                    Save Changes
                  </button>
                </>
              ) : (
                <button type="button" className="ap-btn ap-solid" onClick={handleEdit}>
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="ap-stats">
          <div className="ap-stat">
            <span>Status</span>
            <strong className="ap-stat-active">Active</strong>
          </div>
          <div className="ap-stat">
            <span>Role</span>
            <strong>{role.charAt(0).toUpperCase() + role.slice(1)}</strong>
          </div>
          <div className="ap-stat">
            <span>Admin ID</span>
            <strong>{adminId}</strong>
          </div>
          <div className="ap-stat">
            <span>Access Level</span>
            <strong>Full Access</strong>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="ap-grid">

          {/* Left column */}
          <div className="ap-col-main">

            {/* Account details */}
            <article className="ap-card">
              <div className="ap-card-head">
                <h2>Account Details</h2>
                <span className="ap-status-pill">Active</span>
              </div>
              <div className="ap-fields">
                <label className="ap-field">
                  <span>Display name</span>
                  {isEditing ? (
                    <input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="Admin name"
                    />
                  ) : (
                    <strong>{displayName}</strong>
                  )}
                </label>

                <label className="ap-field">
                  <span>Email address</span>
                  {isEditing ? (
                    <input
                      type="email"
                      value={draftEmail}
                      onChange={(e) => setDraftEmail(e.target.value)}
                      placeholder="admin@email.com"
                    />
                  ) : (
                    <strong>{email}</strong>
                  )}
                </label>

                <div className="ap-field">
                  <span>Role</span>
                  <strong>{role.charAt(0).toUpperCase() + role.slice(1)}</strong>
                </div>

                <div className="ap-field">
                  <span>Admin ID</span>
                  <strong>{adminId}</strong>
                </div>
              </div>
            </article>

            {/* Security */}
            <article className="ap-card">
              <div className="ap-card-head">
                <h2>Security</h2>
              </div>
              <div className="ap-security-list">
                <div className="ap-security-item">
                  <div className="ap-security-icon">🔒</div>
                  <div className="ap-security-text">
                    <strong>Password</strong>
                    <span>Managed from your login credentials</span>
                  </div>
                </div>
                <div className="ap-security-item">
                  <div className="ap-security-icon">💻</div>
                  <div className="ap-security-text">
                    <strong>Active Session</strong>
                    <span>Currently signed in on this browser</span>
                  </div>
                </div>
                <div className="ap-security-item">
                  <div className="ap-security-icon">🛡️</div>
                  <div className="ap-security-text">
                    <strong>Two-Factor Auth</strong>
                    <span>Not configured for this account</span>
                  </div>
                </div>
              </div>
            </article>
          </div>

          {/* Right column */}
          <div className="ap-col-side">

            {/* Permissions */}
            <article className="ap-card">
              <div className="ap-card-head">
                <h2>Permissions</h2>
                <span className="ap-badge-full">Full Admin</span>
              </div>
              <ul className="ap-perm-list">
                {PERMISSIONS.map((perm) => (
                  <li key={perm} className="ap-perm-item">
                    <span className="ap-check">✓</span>
                    {perm}
                  </li>
                ))}
              </ul>
            </article>

            {/* Quick links */}
            <article className="ap-card">
              <div className="ap-card-head">
                <h2>Admin Tools</h2>
              </div>
              <div className="ap-tools">
                {TOOL_LINKS.map(({ label, to }) => (
                  <Link key={label} to={to} className="ap-tool-chip">
                    {label}
                  </Link>
                ))}
              </div>
            </article>

          </div>
        </div>
      </main>
    </div>
  );
}
