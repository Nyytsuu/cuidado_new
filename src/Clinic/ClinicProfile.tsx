import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import "./ClinicProfile.css";
import SidebarClinic from "./SidebarClinic";

import {
  FaPhoneAlt,
  FaClipboardList,
  FaClock,
  FaUserMd,
  FaMapMarkerAlt,
  FaRegClock,
  FaStethoscope,
  FaPlus,
  FaEnvelope,
} from "react-icons/fa";

type ClinicService = {
  id: number;
  name: string;
  description?: string | null;
  price?: number | null;
  duration_minutes?: number | null;
  is_active: number;
};

type ClinicProfileResponse = {
  id: number;
  clinic_name: string;
  email: string;
  profile_picture: string | null;
  phone: string | null;
  province_id: number | null;
  municipality_id: number | null;
  barangay_id: number | null;
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
  created_at: string | null;
  province_name: string | null;
  municipality_name: string | null;
  barangay_name: string | null;
  location_text: string | null;
  services: ClinicService[];
};

type ProfileForm = {
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
const API_BASE = "http://localhost:5000";
const ACCEPTED_PROFILE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const toUploadUrl = (value?: string | null) => {
  const path = String(value || "").trim();
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}/${path.replace(/^\/+/, "")}`;
};

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

const emptyForm: ProfileForm = {
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

const getStoredClinicId = () => {
  try {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      const user = JSON.parse(storedUser);

      if (user?.id) {
        return Number(user.id);
      }

      if (user?.clinic_id) {
        return Number(user.clinic_id);
      }
    }

    const userId = localStorage.getItem("userId");
    if (userId) {
      return Number(userId);
    }

  } catch (err) {
    console.error("Clinic ID parse error:", err);
  }

  return null; // ❗ no default clinic
};

const toTimeInput = (value?: string | null, fallback = "08:00") => {
  const match = String(value || "").match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : fallback;
};

const toTitle = (value?: string | null) => {
  const text = String(value || "").trim();
  if (!text) return "Not provided";

  return text
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const splitList = (value?: string | null) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const formatDate = (value?: string | null) => {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getInitials = (name?: string | null) => {
  const parts = String(name || "Clinic")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

const toForm = (profile: ClinicProfileResponse): ProfileForm => ({
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
});

export default function ClinicProfile() {
  const clinicId = useMemo(() => getStoredClinicId(), []);

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [profile, setProfile] = useState<ClinicProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profilePictureSaving, setProfilePictureSaving] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const displayProfilePicture =
    profilePicturePreview || toUploadUrl(profile?.profile_picture);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API}/clinic/profile?clinic_id=${clinicId}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load clinic profile.");
      }

      setProfile(data as ClinicProfileResponse);
      setForm(toForm(data as ClinicProfileResponse));
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : "Failed to load clinic profile.");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    return () => {
      if (profilePicturePreview) {
        URL.revokeObjectURL(profilePicturePreview);
      }
    };
  }, [profilePicturePreview]);

  const serviceNames = useMemo(() => {
    const activeServiceNames =
      profile?.services
        ?.filter((service) => Number(service.is_active) === 1)
        .map((service) => service.name)
        .filter(Boolean) || [];

    return activeServiceNames.length > 0
      ? activeServiceNames
      : splitList(profile?.services_offered).map(toTitle);
  }, [profile]);

  const addressLines = useMemo(() => {
    if (!profile) return [];

    return [
      profile.address,
      profile.barangay_name,
      profile.municipality_name,
      profile.province_name,
    ].filter(Boolean) as string[];
  }, [profile]);

  const profileQuery = searchTerm.trim().toLowerCase();
  const visibleServiceNames = useMemo(
    () => serviceNames.filter((service) => matchesSearch(profileQuery, service)),
    [serviceNames, profileQuery]
  );
  const visibleAddressLines = useMemo(
    () => addressLines.filter((line) => matchesSearch(profileQuery, line)),
    [addressLines, profileQuery]
  );

  const runPageSearch = (value: string) => {
    const keyword = value.trim();
    const browserFind = (window as Window & { find?: (query: string) => boolean }).find;

    if (keyword && browserFind) {
      browserFind(keyword);
    }
  };

  const openEdit = () => {
    if (!profile) return;
    setForm(toForm(profile));
    setMessage("");
    setError("");
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (saving) return;
    setEditOpen(false);
    if (profile) setForm(toForm(profile));
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSaving(true);
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
        throw new Error(data?.message || "Failed to save clinic profile.");
      }

      await loadProfile();
      setEditOpen(false);
      setMessage("Clinic profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save clinic profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");
    setError("");

    if (!ACCEPTED_PROFILE_IMAGE_TYPES.has(file.type)) {
      setProfilePictureFile(null);
      setProfilePicturePreview("");
      setError("Profile picture must be a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfilePictureFile(null);
      setProfilePicturePreview("");
      setError("Profile picture must be 5MB or smaller.");
      return;
    }

    setProfilePictureFile(file);
    setProfilePicturePreview(URL.createObjectURL(file));
  };

  const saveProfilePicture = async () => {
    try {
      if (!clinicId) {
        throw new Error("No logged-in clinic found.");
      }

      if (!profilePictureFile) {
        throw new Error("Please choose a profile picture first.");
      }

      setProfilePictureSaving(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append("clinic_id", String(clinicId));
      formData.append("profile_picture", profilePictureFile);

      const res = await fetch(`${API}/clinic/profile-picture`, {
        method: "PUT",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to update clinic profile picture.");
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              profile_picture: data.profile_picture || null,
            }
          : prev
      );
      setProfilePictureFile(null);
      setProfilePicturePreview("");

      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...JSON.parse(storedUser),
              profile_picture: data.profile_picture || "",
            })
          );
        }
      } catch (storageError) {
        console.error("Clinic profile picture storage update error:", storageError);
      }

      setMessage("Clinic profile picture updated.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update clinic profile picture."
      );
    } finally {
      setProfilePictureSaving(false);
    }
  };

  return (
    <div
      className={`ClinicProfile with-sidebar ${
        sidebarExpanded ? "sidebar-expanded" : ""
      }`}
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
        searchPlaceholder="Search clinic profile..."
        onSearchSubmit={runPageSearch}
      />

      <main className="clinic-profile-main">
        <section className="clinic-profile-content">
          <div className="profile-title-row">
            <div>
              <h1>Clinic Profile</h1>

            </div>

            <button
              type="button"
              className="edit-btn"
              onClick={openEdit}
              disabled={!profile || loading}
            >
              Edit Clinic Profile
            </button>
          </div>

          {message && <div className="profile-alert success">{message}</div>}
          {error && <div className="profile-alert error">{error}</div>}

          {loading ? (
            <div className="profile-loading">Loading clinic profile...</div>
          ) : !profile ? (
            <div className="profile-loading">Clinic profile was not found.</div>
          ) : (
            <>
              <div className="top-grid">
                <aside className="profile-card">
                  <div className={`logo-circle ${displayProfilePicture ? "has-image" : ""}`}>
                    {displayProfilePicture ? (
                      <img src={displayProfilePicture} alt={`${profile.clinic_name} profile`} />
                    ) : (
                      <span>{getInitials(profile.clinic_name) || <FaPlus />}</span>
                    )}
                  </div>

                  <h2 className="clinic-name">{profile.clinic_name}</h2>
                  <p className="clinic-subtitle">{toTitle(profile.specialization)}</p>
                  <p className="clinic-email">{profile.email}</p>

                  <div className="profile-picture-actions">
                    <input
                      id="clinic-profile-picture"
                      className="profile-picture-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleProfilePictureChange}
                    />
                    <label className="profile-picture-upload" htmlFor="clinic-profile-picture">
                      Choose Photo
                    </label>
                    <button
                      className="profile-picture-save"
                      type="button"
                      onClick={saveProfilePicture}
                      disabled={!profilePictureFile || profilePictureSaving}
                    >
                      {profilePictureSaving ? "Saving..." : "Save Photo"}
                    </button>
                    <span className="profile-picture-hint">
                      {profilePictureFile?.name || "JPG, PNG, or WEBP"}
                    </span>
                  </div>

                  <div className="clinic-type">
                    <FaStethoscope />
                    <span>{toTitle(profile.specialization)}</span>
                  </div>

                  <div className={`status-pill status-${profile.status || "pending"}`}>
                    <span className="status-dot" />
                    <span>{toTitle(profile.status || "pending")}</span>
                  </div>
                </aside>

                <div className="right-column">
                  <section className="profile-panel info-card">
                    <h3 className="section-title">Clinic Information</h3>

                    <div className="info-columns">
                      <div className="info-group">
                        <InfoRow icon={<FaPhoneAlt />} label="Phone" value={profile.phone} />
                        <InfoRow icon={<FaEnvelope />} label="Email" value={profile.email} />
                        <InfoRow
                          icon={<FaClipboardList />}
                          label="License No."
                          value={profile.license_number}
                        />
                        <InfoRow
                          icon={<FaClock />}
                          label="Years of Operation"
                          value={`${profile.years_operation ?? 0} years`}
                        />
                      </div>

                      <div className="clinic-divider" />

                      <div className="info-group">
                        <InfoRow
                          icon={<FaUserMd />}
                          label="Representative"
                          value={profile.rep_full_name}
                          subValue={profile.rep_position}
                        />
                        <InfoRow
                          icon={<FaPhoneAlt />}
                          label="Representative Phone"
                          value={profile.rep_phone}
                        />
                        <InfoRow
                          icon={<FaRegClock />}
                          label="Account Status"
                          value={toTitle(profile.account_status || "active")}
                        />
                        <InfoRow
                          icon={<FaMapMarkerAlt />}
                          label="Location"
                          value={profile.location_text || profile.address}
                        />
                      </div>
                    </div>
                  </section>

                  <div className="middle-grid">
                    <section className="profile-panel small-card">
                      <h3 className="section-title">Services Offered</h3>
                      {serviceNames.length === 0 ? (
                        <p className="empty-text">No services listed yet.</p>
                      ) : visibleServiceNames.length === 0 ? (
                        <p className="empty-text">No matching services.</p>
                      ) : (
                        <ul className="bullet-list">
                          {visibleServiceNames.map((service) => (
                            <li key={service}>{service}</li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section className="profile-panel small-card">
                      <h3 className="section-title">Operating Hours</h3>
                      <div className="hours-list">
                        <p>
                          <strong>Opening:</strong> {toTimeInput(profile.opening_time)}
                        </p>
                        <p>
                          <strong>Closing:</strong> {toTimeInput(profile.closing_time, "17:00")}
                        </p>
                        <p>
                          <strong>Days:</strong> {toTitle(profile.operating_days)}
                        </p>
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              <div className="bottom-grid">
                <SummaryCard icon={<FaStethoscope />} title="Services Offered">
                  {serviceNames.length === 0 ? (
                    <p className="empty-text">No services listed yet.</p>
                  ) : visibleServiceNames.length === 0 ? (
                    <p className="empty-text">No matching services.</p>
                  ) : (
                    <ul className="bullet-list compact">
                      {visibleServiceNames.slice(0, 5).map((service) => (
                        <li key={service}>{service}</li>
                      ))}
                    </ul>
                  )}
                </SummaryCard>

                <SummaryCard icon={<FaClock />} title="Operating Hours">
                  <ul className="bullet-list compact">
                    <li>Opening: {toTimeInput(profile.opening_time)}</li>
                    <li>Closing: {toTimeInput(profile.closing_time, "17:00")}</li>
                    <li>Days: {toTitle(profile.operating_days)}</li>
                  </ul>
                </SummaryCard>

                <SummaryCard icon={<FaMapMarkerAlt />} title="Clinic Address">
                  <div className="address-text">
                    {addressLines.length === 0 ? (
                      <p>No address provided.</p>
                    ) : visibleAddressLines.length === 0 ? (
                      <p>No matching address details.</p>
                    ) : (
                      visibleAddressLines.map((line) => <p key={line}>{line}</p>)
                    )}
                  </div>
                </SummaryCard>

                <SummaryCard icon={<FaRegClock />} title="Account Status" accent="gold">
                  <div className={`status-pill status-${profile.status || "pending"}`}>
                    <span className="status-dot" />
                    <span>{toTitle(profile.status || "pending")}</span>
                  </div>

                  <p className="member-since">
                    Member since: {formatDate(profile.created_at)}
                  </p>
                </SummaryCard>
              </div>
            </>
          )}
        </section>
      </main>

      {editOpen && (
        <div className="profile-modal-overlay" onClick={closeEdit}>
          <form
            className="profile-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={saveProfile}
          >
            <div className="modal-head">
              <div>
                <h2>Edit Clinic Profile</h2>
                <p>Email, license number, and approval status are read-only.</p>
              </div>
              <button type="button" className="modal-close" onClick={closeEdit}>
                x
              </button>
            </div>

            <div className="modal-grid">
              <label>
                Clinic Name
                <input
                  name="clinic_name"
                  value={form.clinic_name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Clinic Phone
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+639XXXXXXXXX"
                  required
                />
              </label>

              <label>
                Clinic Type
                <select
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                  required
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
                  name="years_operation"
                  type="number"
                  min="0"
                  max="150"
                  value={form.years_operation}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Representative Name
                <input
                  name="rep_full_name"
                  value={form.rep_full_name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Representative Position
                <input
                  name="rep_position"
                  value={form.rep_position}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Representative Phone
                <input
                  name="rep_phone"
                  value={form.rep_phone}
                  onChange={handleChange}
                  placeholder="+639XXXXXXXXX"
                  required
                />
              </label>

              <label>
                Services Offered
                <input
                  name="services_offered"
                  value={form.services_offered}
                  onChange={handleChange}
                  placeholder="general, dental"
                  required
                />
              </label>

              <label>
                Opening Time
                <input
                  name="opening_time"
                  type="time"
                  value={form.opening_time}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Closing Time
                <input
                  name="closing_time"
                  type="time"
                  value={form.closing_time}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Operating Days
                <select
                  name="operating_days"
                  value={form.operating_days}
                  onChange={handleChange}
                  required
                >
                  <option value="mon-fri">Monday - Friday</option>
                  <option value="mon-sat">Monday - Saturday</option>
                  <option value="daily">Daily</option>
                </select>
              </label>

              <label className="span-2">
                Address
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={3}
                  required
                />
              </label>
            </div>

            <div className="readonly-grid">
              <div>
                <span>Email</span>
                <strong>{profile?.email}</strong>
              </div>
              <div>
                <span>License No.</span>
                <strong>{profile?.license_number || "Not provided"}</strong>
              </div>
              <div>
                <span>Approval Status</span>
                <strong>{toTitle(profile?.status || "pending")}</strong>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={closeEdit}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  subValue,
}: {
  icon: ReactNode;
  label: string;
  value?: string | number | null;
  subValue?: string | number | null;
}) {
  return (
    <div className="info-row">
      <span className="info-icon">{icon}</span>
      <div>
        <div className="info-label">{label}</div>
        <div className="info-value">{value || "Not provided"}</div>
        {subValue && <div className="info-subvalue">{subValue}</div>}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  children,
  accent = "teal",
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  accent?: "teal" | "gold";
}) {
  return (
    <section className="profile-panel summary-card">
      <div className="summary-header">
        <span className={`summary-icon ${accent}`}>{icon}</span>
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}
