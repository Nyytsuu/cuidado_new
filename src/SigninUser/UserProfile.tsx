import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import "./UserProfile.css";
import UserSidebar from "../Categories/UserSidebar";
import { FiEye, FiEyeOff } from "react-icons/fi";
import micIcon from "../img/mic.png";
import avatarMale from "../img/avatar-male.svg";
import avatarFemale from "../img/avatar-female.svg";
import avatarNeutral from "../img/avatar-neutral.svg";
import { analyzeVoiceTranscript, type SymptomResult } from "./voiceAssistantApi";
import VoiceAssistantResult from "./VoiceAssistantResult";
import { apiUrl, getConfiguredBackendUrl } from "../sharedBackendFetch";
import { useNavigate } from "react-router-dom";
import { clearStoredAuth } from "../authSession";

const menuItems = [
  { label: "Home",         icon: "⌂",  path: "/homepage"     },
  { label: "Health Topics",icon: "♡",  path: "/browse-health"},
  { label: "My Profile",   icon: "👨‍⚕️", path: "/profile",  active: true },
  { label: "Find Clinics", icon: "📍", path: "/find-clinic"  },
];

const generalItems = [
  { label: "Emergency Guide", icon: "🚑", path: "/emergency" },
  { label: "Log Out",          icon: "⏻", path: "__logout__" },
];

type VoiceStep =
  | "idle"
  | "listening"
  | "result"
  | "processing"
  | "retry"
  | "unsupported";

type ProfileData = {
  id: number;
  full_name: string | null;
  email: string | null;
  profile_picture: string | null;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  province_id: number | null;
  municipality_id: number | null;
  barangay_id: number | null;
  address: string | null;
  consent: number | null;
  status: "active" | "disabled";
  province_name?: string | null;
  municipality_name?: string | null;
  barangay_name?: string | null;
};

type ProfileResponse = ProfileData & {
  message?: string;
};

type Province = {
  id: number;
  name: string;
};

type Municipality = {
  id: number;
  province_id: number;
  name: string;
};

type Barangay = {
  id: number;
  municipality_id: number;
  name: string;
};

const ACCEPTED_PROFILE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const toUploadUrl = (value?: string | null) => {
  const path = String(value || "").trim();
  if (!path) return "";

  const backendUrl = getConfiguredBackendUrl();

  if (/^https?:\/\//i.test(path)) {
    return path.replace("http://localhost:5000", backendUrl);
  }

  return `${backendUrl}/${path.replace(/^\/+/, "")}`;
};

type SpeechRecognitionEventLike = Event & {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
      isFinal: boolean;
      length: number;
    };
    length: number;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

export default function UserProfile() {
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const userId = currentUser?.id;

  const navigate = useNavigate();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // deactivate account flow
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateStep, setDeactivateStep] = useState<1 | 2>(1);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState("");

  const [verifyEmailModalOpen, setVerifyEmailModalOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySent, setVerifySent] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);

  const [voicePopupOpen, setVoicePopupOpen] = useState(false);
  const [voiceStep, setVoiceStep] = useState<VoiceStep>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [symptomResult, setSymptomResult] = useState<SymptomResult | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [municipalityId, setMunicipalityId] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [address, setAddress] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"active" | "disabled">("active");
  const [profilePicture, setProfilePicture] = useState("");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState("");

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profilePictureSaving, setProfilePictureSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const defaultAvatar = (() => {
    const g = (gender || "").toLowerCase();
    if (g === "male") return avatarMale;
    if (g === "female") return avatarFemale;
    return avatarNeutral;
  })();

  const displayProfilePicture =
    profilePicturePreview || toUploadUrl(profilePicture) || defaultAvatar;

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (profilePicturePreview) {
        URL.revokeObjectURL(profilePicturePreview);
      }
    };
  }, [profilePicturePreview]);

  const analyzeVoiceSymptoms = async (transcript: string) => {
    try {
      setVoiceStep("processing");
      setVoiceError("");
      setSymptomResult(null);
      setVoiceTranscript(transcript);

      const result = await analyzeVoiceTranscript(transcript, userId || null);

      setSymptomResult(result);
      setVoiceStep("result");
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Failed to analyze symptoms.");
      setVoiceStep("retry");
    }
  };

  const getVoiceContent = () => {
    switch (voiceStep) {
      case "idle":
        return {
          title: "Voice Assistant",
          subtitle: "Tap the microphone to begin.",
          micClass: "",
        };
      case "listening":
        return {
          title: "Listening...",
          subtitle: "Please describe your symptoms clearly.",
          micClass: "listening",
        };
      case "processing":
        return {
          title: "Analyzing symptoms...",
          subtitle: "Checking possible conditions based on your symptoms.",
          micClass: "processing",
        };
      case "result":
        return {
          title: "Analysis complete",
          subtitle: "Here are the ranked possible conditions.",
          micClass: "result",
        };
      case "retry":
        return {
          title: "Could not process",
          subtitle: voiceError || "Please try again.",
          micClass: "error",
        };
      case "unsupported":
        return {
          title: "Voice not supported",
          subtitle: "Your browser does not support speech recognition.",
          micClass: "error",
        };
      default:
        return {
          title: "Voice Assistant",
          subtitle: "Tap the microphone to begin.",
          micClass: "",
        };
    }
  };

  const closeVoicePopup = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setVoicePopupOpen(false);
    setVoiceStep("idle");
    setVoiceTranscript("");
    setVoiceError("");
    setSymptomResult(null);
  };

  const startVoiceAssistant = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    setVoicePopupOpen(true);
    setVoiceTranscript("");
    setVoiceError("");
    setSymptomResult(null);

    if (!SpeechRecognitionAPI) {
      setVoiceStep("unsupported");
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.lang = "en-PH";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setVoiceStep("listening");
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setVoiceTranscript(transcript);

      const lastResult = event.results[event.results.length - 1];
      if (lastResult?.isFinal) {
        analyzeVoiceSymptoms(transcript.trim());
      }
    };

    recognition.onerror = (event) => {
      const errorMessage =
        event.error === "network"
          ? "Speech recognition could not connect. Please try again, or use the full Voice Assistant page."
          : event.error || "Speech recognition failed.";

      setVoiceError(errorMessage);
      setVoiceStep("retry");
    };

    recognition.start();
  };

  const voiceContent = getVoiceContent();

  const loadProvinces = useCallback(async () => {
    const res = await fetch(apiUrl("/api/users/meta/provinces"));
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load provinces.");
    setProvinces(Array.isArray(data) ? data : []);
  }, []);

  const loadMunicipalities = useCallback(async (selectedProvinceId: string | number) => {
  if (!selectedProvinceId) {
    setMunicipalities([]);
    return;
  }

  const res = await fetch(
    apiUrl(`/api/users/meta/municipalities?province_id=${selectedProvinceId}`)
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load municipalities.");
  setMunicipalities(Array.isArray(data) ? data : []);
}, []);

  const loadBarangays = useCallback(async (selectedMunicipalityId: string | number) => {
  if (!selectedMunicipalityId) {
    setBarangays([]);
    return;
  }

  const res = await fetch(
    apiUrl(`/api/users/meta/barangays?municipality_id=${selectedMunicipalityId}`)
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load barangays.");
  setBarangays(Array.isArray(data) ? data : []);
}, []);

  const loadProfile = useCallback(async () => {
    try {
      if (!userId) {
        setError("No logged-in user found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setMessage("");

      await loadProvinces();

      const res = await fetch(apiUrl(`/api/users/${userId}/profile`));
      const data: ProfileResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load profile.");
      }

      setFullName(data.full_name || "");
      setEmail(data.email || "");
      setProfilePicture(data.profile_picture || "");
      setPhone(data.phone || "");
      setGender(data.gender || "");
      setDateOfBirth(data.date_of_birth ? data.date_of_birth.slice(0, 10) : "");
      setProvinceId(data.province_id ? String(data.province_id) : "");
      setMunicipalityId(data.municipality_id ? String(data.municipality_id) : "");
      setBarangayId(data.barangay_id ? String(data.barangay_id) : "");
      setAddress(data.address || "");
      setConsent(Boolean(data.consent));
      setStatus(data.status || "active");

      if (data.province_id) {
        await loadMunicipalities(data.province_id);
      }
      if (data.municipality_id) {
        await loadBarangays(data.municipality_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [loadBarangays, loadMunicipalities, loadProvinces, userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleProvinceChange = async (value: string) => {
    setProvinceId(value);
    setMunicipalityId("");
    setBarangayId("");
    setMunicipalities([]);
    setBarangays([]);

    if (value) {
      try {
        await loadMunicipalities(value);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load municipalities.");
      }
    }
  };

  const handleMunicipalityChange = async (value: string) => {
    setMunicipalityId(value);
    setBarangayId("");
    setBarangays([]);

    if (value) {
      try {
        await loadBarangays(value);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load barangays.");
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!userId) {
        throw new Error("No logged-in user found.");
      }

      setProfileSaving(true);
      setError("");
      setMessage("");

      const res = await fetch(apiUrl(`/api/users/${userId}/profile`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          gender,
          date_of_birth: dateOfBirth || null,
          province_id: provinceId ? Number(provinceId) : null,
          municipality_id: municipalityId ? Number(municipalityId) : null,
          barangay_id: barangayId ? Number(barangayId) : null,
          address,
          consent,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update profile.");
      }

      setMessage("Profile updated successfully.");
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setProfileSaving(false);
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

  const handleSaveProfilePicture = async () => {
    try {
      if (!userId) {
        throw new Error("No logged-in user found.");
      }

      if (!profilePictureFile) {
        throw new Error("Please choose a profile picture first.");
      }

      setProfilePictureSaving(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append("profile_picture", profilePictureFile);

      const res = await fetch(apiUrl(`/api/users/${userId}/profile-picture`), {
        method: "PUT",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to update profile picture.");
      }

      setProfilePicture(data.profile_picture || "");
      setProfilePictureFile(null);
      setProfilePicturePreview("");

      try {
        if (currentUser) {
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...currentUser,
              profile_picture: data.profile_picture || "",
            })
          );
          window.dispatchEvent(new Event("user-profile-updated"));
        }
      } catch (storageError) {
        console.error("Profile picture storage update error:", storageError);
      }

      setMessage("Profile picture updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile picture.");
    } finally {
      setProfilePictureSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      if (!userId) {
        throw new Error("No logged-in user found.");
      }

      setPasswordSaving(true);
      setError("");
      setMessage("");

      if (!currentPassword || !newPassword || !confirmNewPassword) {
        throw new Error("Please fill in all password fields.");
      }

      if (newPassword !== confirmNewPassword) {
        throw new Error("New password and confirm password do not match.");
      }

      const res = await fetch(apiUrl(`/api/users/${userId}/password`), { 
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setMessage("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSendVerifyCode = async () => {
    try {
      setVerifyLoading(true);
      setVerifyError("");
      const res = await fetch(apiUrl(`/api/users/${userId}/send-verify-email`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send verification code.");
      setVerifySent(true);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Failed to send verification code.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    try {
      setVerifyLoading(true);
      setVerifyError("");
      const res = await fetch(apiUrl(`/api/users/${userId}/verify-email-code`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid or expired verification code.");
      setPasswordVerified(true);
      setShowCurrentPassword(true);
      setVerifyEmailModalOpen(false);
      setVerifyCode("");
      setVerifyError("");
      setVerifySent(false);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Invalid or expired code.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    try {
      if (!userId) throw new Error("No logged-in user found.");
      setDeactivating(true);
      setDeactivateError("");

      const res = await fetch(apiUrl(`/api/users/${userId}/deactivate`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "disabled" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to deactivate account.");

      clearStoredAuth();
      navigate("/signin");
    } catch (err) {
      setDeactivateError(err instanceof Error ? err.message : "Failed to deactivate account.");
      setDeactivating(false);
    }
  };

  const openDeactivateModal = () => {
    setDeactivateStep(1);
    setDeactivateReason("");
    setDeactivateError("");
    setShowDeactivateModal(true);
  };

  const closeDeactivateModal = () => {
    if (deactivating) return;
    setShowDeactivateModal(false);
    setDeactivateStep(1);
    setDeactivateReason("");
    setDeactivateError("");
  };

  return (
    <div className={`profile-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <div className="health-app">
        <main className="main-content">
          <aside className="profilenav">
            <div className="profile-mini">
              <div className="avatar profile-mini-avatar">
                <img src={displayProfilePicture} alt="Profile" className="profile-mini-img" />
              </div>
              <div>
                <h3>{fullName || "Loading..."}</h3>
                <p>{email || "Loading..."}</p>
              </div>
            </div>

            <nav className="nav-section">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  className={`nav-item ${item.active ? "active" : ""}`}
                  type="button"
                  onClick={() => navigate(item.path)}
                >
                  <span className="nav-left">
                    <span className="icon">{item.icon}</span>
                    {item.label}
                  </span>
                  {(item.label === "Health Topics" ||
                    item.label === "My Profile" ||
                    item.label === "Find Clinics") && <span>›</span>}
                </button>
              ))}
            </nav>

            <div className="section-label">General</div>

            <nav className="nav-section">
              {generalItems.map((item) => (
                <button
                  key={item.label}
                  className="nav-item"
                  type="button"
                  onClick={() => {
                    if (item.path === "__logout__") {
                      setShowLogoutConfirm(true);
                    } else {
                      navigate(item.path);
                    }
                  }}
                >
                  <span className="nav-left">
                    <span className="icon">{item.icon}</span>
                    {item.label}
                  </span>
                  {item.label === "Emergency Guide" && <span>›</span>}
                </button>
              ))}
            </nav>

            <div className="sidebar-card">
              <div className="sidebar-card-title">💡 Did You Know?</div>
              <p>
                Keeping your profile updated helps clinics confirm appointments
                and reach you with accurate health reminders.
              </p>
            </div>

          </aside>

          <header className="topbar">
            <div className="topbar-left">
              <div className="page-path">
                <span className="path-active">My Profile</span>
              </div>
            </div>
          </header>

          <div className="content-grid">
            <section className="main-panel">
              {loading && <p>Loading profile...</p>}
              {error && <div className="booking-error">{error}</div>}
              {message && <div className="booking-success">{message}</div>}

              <div className="profile-summary-top">
                <div className="profile-summary-avatar">
                  <img src={displayProfilePicture} alt="Profile" />
                </div>
                <div className="profile-summary-body">
                  <p className="profile-summary-heading">Profile Summary</p>
                  <div className="profile-summary-fields">
                    <span><strong>Name</strong>{fullName || "--"}</span>
                    <span><strong>Email</strong>{email || "--"}</span>
                    <span><strong>Phone</strong>{phone || "--"}</span>
                    <span className={`profile-summary-status ${status}`}>{status}</span>
                  </div>
                </div>
              </div>

              <h2>Account</h2>

              <div className="account-card">
                <div className="account-top">
                  <div className="account-user">
                    <div className="avatar large profile-mini-avatar">
                      <img src={displayProfilePicture} alt="Profile" className="profile-mini-img" />
                    </div>
                    <div>
                      <h3>{fullName || "No name"}</h3>
                      <p>{email || "No email"}</p>
                    </div>
                  </div>
                  <div className="profile-picture-actions">
                    <input
                      id="user-profile-picture"
                      className="profile-picture-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleProfilePictureChange}
                    />
                    <label className="profile-picture-upload" htmlFor="user-profile-picture">
                      Choose Photo
                    </label>
                    <button
                      className="profile-picture-save"
                      type="button"
                      onClick={handleSaveProfilePicture}
                      disabled={!profilePictureFile || profilePictureSaving}
                    >
                      {profilePictureSaving ? "Saving..." : "Save Photo"}
                    </button>
                    <span className="profile-picture-hint">
                      {profilePictureFile?.name || "JPG, PNG, or WEBP"}
                    </span>
                  </div>
                </div>

                <div className="account-divider" />

                <div className="account-details">
                  <div>
                    <label>Full Name:</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Email:</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Phone:</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Gender:</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label>Date of Birth:</label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Province:</label>
                    <select
                      value={provinceId}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                    >
                      <option value="">Select province</option>
                      {provinces.map((province) => (
                        <option key={province.id} value={province.id}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Municipality:</label>
                    <select
                      value={municipalityId}
                      onChange={(e) => handleMunicipalityChange(e.target.value)}
                      disabled={!provinceId}
                    >
                      <option value="">Select municipality</option>
                      {municipalities.map((municipality) => (
                        <option key={municipality.id} value={municipality.id}>
                          {municipality.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Barangay:</label>
                    <select
                      value={barangayId}
                      onChange={(e) => setBarangayId(e.target.value)}
                      disabled={!municipalityId}
                    >
                      <option value="">Select barangay</option>
                      {barangays.map((barangay) => (
                        <option key={barangay.id} value={barangay.id}>
                          {barangay.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="full-width-field">
                    <label>Address:</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="full-width-field">
                    <label className="consent-row">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span>I agree to the consent/privacy terms.</span>
                    </label>
                  </div>

                  <div className="account-action">
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={() => setShowSaveConfirm(true)}
                      disabled={profileSaving}
                    >
                      {profileSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>

              <h2 style={{ marginTop: 28 }}>Security</h2>

              <div className="security-card">
                <div className="security-row1">
                  <span>Current Password</span>
                  <div className="password-box">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={passwordVerified ? "Type your password — it's now visible" : "Enter current password"}
                    />
                    <button
                      type="button"
                      className={`current-btn${passwordVerified ? " verified" : ""}`}
                      title={passwordVerified ? "Toggle password visibility" : "Verify email to reveal password"}
                      onClick={() => {
                        if (!passwordVerified) {
                          setVerifyEmailModalOpen(true);
                          handleSendVerifyCode();
                        } else {
                          setShowCurrentPassword((prev) => !prev);
                        }
                      }}
                    >
                      {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  {passwordVerified && (
                    <p className="verify-success-hint">
                      ✓ Identity verified — your password is now visible as you type.
                    </p>
                  )}
                </div>

                <div className="security-row2">
                  <span>New Password</span>
                  <div className="password-box">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      className="new-btn"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                    >
                      {showNewPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="security-row3">
                  <span>Confirm New Password</span>
                  <div className="password-box">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      className="confirm-btn"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="security-actions">
                  <button
                    className="update-btn"
                    type="button"
                    onClick={() => setShowPasswordConfirm(true)}
                    disabled={passwordSaving}
                  >
                    {passwordSaving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>

              <h2 className="profile-section-heading">Notification Preferences</h2>

              <div className="preference-card">
                <div className="preference-card-copy">
                  <h3>Manage how you receive notifications</h3>
                  <p>
                    Choose how Cuidado updates you about appointments, clinic replies,
                    support messages, and reminders.
                  </p>
                </div>
                <button
                  className="preference-manage-btn"
                  type="button"
                  onClick={() =>
                    navigate("/notifications", { state: { focusPreferences: true } })
                  }
                >
                  Manage Preferences
                </button>
              </div>

              {/* ── Deactivate Account ── */}
              <h2 style={{ marginTop: 28 }}>Account Management</h2>

              <div className="deactivate-card">
                <div className="deactivate-card-left">
                  <div className="deactivate-card-icon">⚠️</div>
                  <div>
                    <h3 className="deactivate-card-title">Deactivate Account</h3>
                    <p className="deactivate-card-desc">
                      Temporarily deactivate your account. Your profile will be hidden and your appointments paused.
                      You can reactivate at any time by simply logging back in.
                    </p>
                  </div>
                </div>
                <button
                  className="deactivate-open-btn"
                  type="button"
                  onClick={openDeactivateModal}
                >
                  Deactivate
                </button>
              </div>

            </section>

          </div>
        </main>

        <button className="floating-mic" type="button" onClick={startVoiceAssistant}>
          <img src={micIcon} alt="Voice Assistant" className="floating-mic-icon" />
        </button>

        {voicePopupOpen && (
          <div className="voice-popup-overlay" onClick={closeVoicePopup}>
            <div
              className={`voice-popup-card ${voiceStep === "result" ? "has-result" : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="voice-popup-close" type="button" onClick={closeVoicePopup}>
                ×
              </button>

              <div className={`voice-popup-mic ${voiceContent.micClass}`}>
                <img src={micIcon} alt="Mic" />
              </div>

              <div className="voice-popup-text">
                <h3>{voiceContent.title}</h3>
                <p>{voiceContent.subtitle}</p>
              </div>

              {voiceTranscript && (
                <div className="voice-transcript-preview">
                  <strong>Heard:</strong> {voiceTranscript}
                </div>
              )}

              {voiceError && voiceStep === "retry" && (
                <div className="voice-error-text">{voiceError}</div>
              )}

              {voiceStep === "result" && symptomResult && (
                <VoiceAssistantResult result={symptomResult} compact />
              )}

              {voiceStep === "result" && symptomResult && (
                <div className="voice-result-card">
                  <div className="voice-result-section">
                    <strong>Detected symptoms:</strong>
                    {symptomResult.symptoms.length > 0 ? (
                      <ul>
                        {symptomResult.symptoms.map((symptom, index) => (
                          <li key={`${symptom}-${index}`}>{symptom}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No symptoms detected.</p>
                    )}
                  </div>

                  {symptomResult.recognized_conditions.length > 0 && (
                    <div className="voice-result-section">
                      <strong>Recognized condition:</strong>
                      <ul>
                        {symptomResult.recognized_conditions.map((condition) => (
                          <li key={condition}>{condition}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="voice-result-section">
                    <strong>Possible conditions (ranked):</strong>
                    {symptomResult.possible_conditions.length > 0 ? (
                      <ol>
                        {symptomResult.possible_conditions.map((condition, index) => (
                          <li className="voice-condition-match" key={`${condition.name}-${index}`}>
                            {condition.name} — {(condition.score * 100).toFixed(0)}% match
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p>No likely conditions found.</p>
                    )}
                  </div>

                  <div className="voice-result-section">
                    <p>
                      <strong>Urgency:</strong> {symptomResult.urgency}
                    </p>
                    <p>
                      <strong>Advice:</strong> {symptomResult.advice}
                    </p>
                    {symptomResult.emergency && (
                      <p className="voice-emergency-text">
                        This may require urgent medical attention.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {voiceStep === "retry" && (
                <button
                  type="button"
                  className="voice-popup-retry"
                  onClick={startVoiceAssistant}
                >
                  Try again
                </button>
              )}

              <div className="voice-popup-language">English (Philippines)</div>
            </div>
          </div>
        )}
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm-modal">
            <h3>Log out?</h3>
            <p>Are you sure you want to log out of your account?</p>
            <div className="logout-actions">
              <button className="btn-cancel" onClick={() => setShowLogoutConfirm(false)}>
                No
              </button>
              <button
                className="btn-confirm"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  clearStoredAuth();
                  setShowLogoutSuccess(true);
                  setTimeout(() => navigate("/signin"), 1500);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutSuccess && (
        <div className="logout-popup-overlay">
          <div className="logout-popup">
            <div className="logout-icon">✓</div>
            <p>Logged out successfully</p>
          </div>
        </div>
      )}

      {/* Save profile confirmation */}
      {showSaveConfirm && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm-modal">
            <h3>Save changes?</h3>
            <p>Are you sure you want to update your profile information?</p>
            <div className="logout-actions">
              <button className="btn-cancel" onClick={() => setShowSaveConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={() => { setShowSaveConfirm(false); handleSaveProfile(); }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update password confirmation */}
      {showPasswordConfirm && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm-modal">
            <h3>Update password?</h3>
            <p>Are you sure you want to change your password?</p>
            <div className="logout-actions">
              <button className="btn-cancel" onClick={() => setShowPasswordConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={() => { setShowPasswordConfirm(false); handleUpdatePassword(); }}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivate Account modal ── */}
      {showDeactivateModal && (
        <div className="logout-confirm-overlay" onClick={closeDeactivateModal}>
          <div className="deactivate-modal" onClick={(e) => e.stopPropagation()}>
            {!deactivating && (
              <button
                className="deactivate-modal-close"
                type="button"
                onClick={closeDeactivateModal}
              >
                ×
              </button>
            )}

            {/* Step 1: choose reason */}
            {deactivateStep === 1 && (
              <>
                <div className="deactivate-modal-icon">😔</div>
                <h3 className="deactivate-modal-title">We're sorry to see you go</h3>
                <p className="deactivate-modal-subtitle">
                  Please tell us why you want to deactivate your account:
                </p>

                <div className="deactivate-reasons">
                  {[
                    "I need a break",
                    "Privacy concerns",
                    "Too many notifications",
                    "I have another account",
                    "Other reason",
                  ].map((reason) => (
                    <label
                      key={reason}
                      className={`deactivate-reason-row ${deactivateReason === reason ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="deactivate-reason"
                        value={reason}
                        checked={deactivateReason === reason}
                        onChange={() => setDeactivateReason(reason)}
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>

                <div className="deactivate-modal-actions">
                  <button
                    className="btn-cancel"
                    type="button"
                    onClick={closeDeactivateModal}
                  >
                    Cancel
                  </button>
                  <button
                    className="deactivate-next-btn"
                    type="button"
                    disabled={!deactivateReason}
                    onClick={() => setDeactivateStep(2)}
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 2: final confirmation */}
            {deactivateStep === 2 && (
              <>
                <div className="deactivate-modal-icon">⚠️</div>
                <h3 className="deactivate-modal-title">Deactivate your account?</h3>

                <div className="deactivate-warning-box">
                  <ul>
                    <li>Your profile will be <strong>hidden</strong> from other users</li>
                    <li>Your upcoming appointments will be <strong>paused</strong></li>
                    <li>You will be <strong>logged out</strong> immediately</li>
                    <li>You can <strong>reactivate</strong> anytime by logging back in</li>
                  </ul>
                </div>

                {deactivateError && (
                  <p className="deactivate-error">{deactivateError}</p>
                )}

                <div className="deactivate-modal-actions">
                  <button
                    className="btn-cancel"
                    type="button"
                    onClick={() => setDeactivateStep(1)}
                    disabled={deactivating}
                  >
                    Go Back
                  </button>
                  <button
                    className="deactivate-confirm-btn"
                    type="button"
                    onClick={handleDeactivateAccount}
                    disabled={deactivating}
                  >
                    {deactivating ? "Deactivating…" : "Deactivate Account"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Email verification modal — reveals current password */}
      {verifyEmailModalOpen && (
        <div className="logout-confirm-overlay">
          <div className="verify-email-modal">
            <button
              className="verify-modal-close"
              type="button"
              onClick={() => {
                setVerifyEmailModalOpen(false);
                setVerifyCode("");
                setVerifyError("");
                setVerifySent(false);
              }}
            >
              ×
            </button>

            <div className="verify-modal-icon">✉️</div>
            <h3 className="verify-modal-title">Verify Your Email</h3>
            <p className="verify-modal-desc">
              {verifyLoading && !verifySent
                ? "Sending code…"
                : <>A 6-digit code has been sent to<br /><strong>{email}</strong></>}
            </p>

            {verifyError && <div className="verify-error">{verifyError}</div>}

            <input
              className="verify-code-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="• • • • • •"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />

            <div className="verify-modal-actions">
              <button
                className="btn-cancel"
                type="button"
                onClick={() => {
                  setVerifyEmailModalOpen(false);
                  setVerifyCode("");
                  setVerifyError("");
                  setVerifySent(false);
                }}
              >
                Cancel
              </button>
              <button
                className="btn-confirm"
                type="button"
                onClick={handleVerifyEmailCode}
                disabled={verifyLoading || verifyCode.length < 6}
              >
                {verifyLoading && verifyCode.length >= 6 ? "Verifying…" : "Verify"}
              </button>
            </div>

            <button
              className="verify-resend-btn"
              type="button"
              onClick={() => { setVerifyCode(""); setVerifySent(false); handleSendVerifyCode(); }}
              disabled={verifyLoading}
            >
              {verifyLoading && !verifySent ? "Sending…" : "Resend Code"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
