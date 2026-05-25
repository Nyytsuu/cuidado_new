import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import "./UserProfile.css";
import UserSidebar from "../Categories/UserSidebar";
import { FiEye, FiEyeOff } from "react-icons/fi";
import micIcon from "../img/mic.png";
import profileImg from "../img/profile1.jpg";
import { analyzeVoiceTranscript, type SymptomResult } from "./voiceAssistantApi";
import VoiceAssistantResult from "./VoiceAssistantResult";
import { apiUrl, getConfiguredBackendUrl } from "../sharedBackendFetch";
import { useNavigate } from "react-router-dom";
import { clearStoredAuth } from "../authSession";

const menuItems = [
  { label: "Home",          icon: "⌂",  path: "/homepage"      },
  { label: "Health Topics", icon: "♡",  path: "/browse-health" },
  { label: "My Profile",    icon: "👨‍⚕️", path: "/profile", active: true },
  { label: "Find Clinics",  icon: "📍", path: "/find-clinic"   },
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

const LISTENING_TIMEOUT_MS = 12000;

type SpeechRecognitionEventLike = Event & {
  results: {
    [key: number]: {
      [key: number]: { transcript: string };
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
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

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
  const listeningTimeoutRef = useRef<number | null>(null);
  const latestTranscriptRef = useRef("");
  const heardSpeechRef = useRef(false);
  const recognitionSettledRef = useRef(false);

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

  const displayProfilePicture =
    profilePicturePreview || toUploadUrl(profilePicture) || profileImg;

  const clearListeningTimer = () => {
    if (listeningTimeoutRef.current !== null) {
      window.clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearListeningTimer();
      recognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (profilePicturePreview) URL.revokeObjectURL(profilePicturePreview);
    };
  }, [profilePicturePreview]);

  // ── Voice assistant ──────────────────────────────────────────────────────────

  const analyzeVoiceSymptoms = async (transcript: string) => {
    try {
      const cleanedTranscript = transcript.trim();
      clearListeningTimer();
      recognitionSettledRef.current = true;

      if (!cleanedTranscript) {
        setVoiceError("I did not receive microphone audio. Check the microphone, then try again.");
        setVoiceStep("retry");
        return;
      }

      setVoiceStep("processing");
      setVoiceError("");
      setSymptomResult(null);
      setVoiceTranscript(cleanedTranscript);

      const result = await analyzeVoiceTranscript(cleanedTranscript, userId || null);
      setSymptomResult(result);
      setVoiceStep("result");
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Failed to analyze symptoms.");
      setVoiceStep("retry");
    }
  };

  const getVoiceContent = () => {
    switch (voiceStep) {
      case "idle":       return { title: "Voice Assistant",      subtitle: "Tap the microphone to begin.",                               micClass: "" };
      case "listening":  return { title: "Listening...",          subtitle: "Please describe your symptoms clearly.",                     micClass: "listening" };
      case "processing": return { title: "Analyzing symptoms...", subtitle: "Checking possible conditions based on your symptoms.",       micClass: "processing" };
      case "result":     return { title: "Analysis complete",     subtitle: "Here are the ranked possible conditions.",                   micClass: "result" };
      case "retry":      return { title: "Could not process",     subtitle: voiceError || "Please try again.",                           micClass: "error" };
      case "unsupported":return { title: "Voice not supported",   subtitle: "Your browser does not support speech recognition.",         micClass: "error" };
      default:           return { title: "Voice Assistant",       subtitle: "Tap the microphone to begin.",                               micClass: "" };
    }
  };

  const closeVoicePopup = () => {
    clearListeningTimer();
    recognitionSettledRef.current = true;
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
    latestTranscriptRef.current = "";
    heardSpeechRef.current = false;
    recognitionSettledRef.current = false;

    if (!SpeechRecognitionAPI) { setVoiceStep("unsupported"); return; }

    recognitionRef.current?.abort();
    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.lang = "en-PH";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      clearListeningTimer();
      heardSpeechRef.current = false;
      latestTranscriptRef.current = "";
      recognitionSettledRef.current = false;
      setVoiceStep("listening");

      listeningTimeoutRef.current = window.setTimeout(() => {
        if (recognitionSettledRef.current) return;
        recognitionSettledRef.current = true;
        const transcript = latestTranscriptRef.current.trim();
        recognition.abort();
        if (transcript) { analyzeVoiceSymptoms(transcript); return; }
        setVoiceError("I could not hear microphone audio. Make sure the microphone is enabled, then try again.");
        setVoiceStep("retry");
      }, LISTENING_TIMEOUT_MS);
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      latestTranscriptRef.current = transcript;
      if (transcript.trim()) heardSpeechRef.current = true;
      setVoiceTranscript(transcript);
      const lastResult = event.results[event.results.length - 1];
      if (lastResult?.isFinal) {
        recognitionSettledRef.current = true;
        clearListeningTimer();
        analyzeVoiceSymptoms(transcript.trim());
      }
    };

    recognition.onerror = (event) => {
      recognitionSettledRef.current = true;
      clearListeningTimer();
      const errorMessages: Record<string, string> = {
        network:         "Speech recognition could not connect. Check your internet and try again.",
        "not-allowed":   "Microphone permission is blocked. Allow Microphone for Cuidado, then try again.",
        "no-speech":     "I did not receive microphone audio. Speak clearly and try again.",
        "not-supported": "Speech recognition is not available on this device.",
        audio:           "Could not open the microphone audio stream. Try again.",
        busy:            "The microphone is already listening. Please wait and try again.",
      };
      setVoiceError(errorMessages[event.error] || "Speech recognition failed. Please try again.");
      setVoiceStep("retry");
    };

    recognition.onend = () => {
      clearListeningTimer();
      if (recognitionSettledRef.current) return;
      recognitionSettledRef.current = true;
      const transcript = latestTranscriptRef.current.trim();
      if (transcript) { analyzeVoiceSymptoms(transcript); return; }
      setVoiceError("I could not hear microphone audio. Check the microphone and try again.");
      setVoiceStep("retry");
    };

    try { recognition.start(); } catch {
      setVoiceError("Speech recognition could not start. Please try again.");
      setVoiceStep("retry");
    }
  };

  const voiceContent = getVoiceContent();

  // ── Location loaders ─────────────────────────────────────────────────────────

  const loadProvinces = useCallback(async () => {
    const res = await fetch(apiUrl("/api/users/meta/provinces"));
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load provinces.");
    setProvinces(Array.isArray(data) ? data : []);
  }, []);

  const loadMunicipalities = useCallback(async (selectedProvinceId: string | number) => {
    if (!selectedProvinceId) { setMunicipalities([]); return; }
    const res = await fetch(apiUrl(`/api/users/meta/municipalities?province_id=${selectedProvinceId}`));
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load municipalities.");
    setMunicipalities(Array.isArray(data) ? data : []);
  }, []);

  const loadBarangays = useCallback(async (selectedMunicipalityId: string | number) => {
    if (!selectedMunicipalityId) { setBarangays([]); return; }
    const res = await fetch(apiUrl(`/api/users/meta/barangays?municipality_id=${selectedMunicipalityId}`));
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load barangays.");
    setBarangays(Array.isArray(data) ? data : []);
  }, []);

  // ── Profile loader ───────────────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    try {
      if (!userId) { setError("No logged-in user found."); setLoading(false); return; }
      setLoading(true); setError(""); setMessage("");
      await loadProvinces();
      const res = await fetch(apiUrl(`/api/users/${userId}/profile`));
      const data: ProfileResponse = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load profile.");
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
      if (data.province_id) await loadMunicipalities(data.province_id);
      if (data.municipality_id) await loadBarangays(data.municipality_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [loadBarangays, loadMunicipalities, loadProvinces, userId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ── Location change handlers ─────────────────────────────────────────────────

  const handleProvinceChange = async (value: string) => {
    setProvinceId(value); setMunicipalityId(""); setBarangayId("");
    setMunicipalities([]); setBarangays([]);
    if (value) {
      try { await loadMunicipalities(value); }
      catch (err) { setError(err instanceof Error ? err.message : "Failed to load municipalities."); }
    }
  };

  const handleMunicipalityChange = async (value: string) => {
    setMunicipalityId(value); setBarangayId(""); setBarangays([]);
    if (value) {
      try { await loadBarangays(value); }
      catch (err) { setError(err instanceof Error ? err.message : "Failed to load barangays."); }
    }
  };

  // ── Save profile ─────────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    try {
      if (!userId) throw new Error("No logged-in user found.");
      setProfileSaving(true); setError(""); setMessage("");
      const res = await fetch(apiUrl(`/api/users/${userId}/profile`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName, email, phone, gender,
          date_of_birth: dateOfBirth || null,
          province_id: provinceId ? Number(provinceId) : null,
          municipality_id: municipalityId ? Number(municipalityId) : null,
          barangay_id: barangayId ? Number(barangayId) : null,
          address, consent, status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile.");
      setMessage("Profile updated successfully.");
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Profile picture ──────────────────────────────────────────────────────────

  const handleProfilePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(""); setError("");
    if (!ACCEPTED_PROFILE_IMAGE_TYPES.has(file.type)) {
      setProfilePictureFile(null); setProfilePicturePreview("");
      setError("Profile picture must be a JPG, PNG, or WEBP image."); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfilePictureFile(null); setProfilePicturePreview("");
      setError("Profile picture must be 5MB or smaller."); return;
    }
    setProfilePictureFile(file);
    setProfilePicturePreview(URL.createObjectURL(file));
  };

  const handleSaveProfilePicture = async () => {
    try {
      if (!userId) throw new Error("No logged-in user found.");
      if (!profilePictureFile) throw new Error("Please choose a profile picture first.");
      setProfilePictureSaving(true); setError(""); setMessage("");
      const formData = new FormData();
      formData.append("profile_picture", profilePictureFile);
      const res = await fetch(apiUrl(`/api/users/${userId}/profile-picture`), {
        method: "PUT", body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update profile picture.");
      setProfilePicture(data.profile_picture || "");
      setProfilePictureFile(null); setProfilePicturePreview("");
      try {
        if (currentUser) {
          localStorage.setItem("user", JSON.stringify({ ...currentUser, profile_picture: data.profile_picture || "" }));
          window.dispatchEvent(new Event("user-profile-updated"));
        }
      } catch { /* ignore */ }
      setMessage("Profile picture updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile picture.");
    } finally {
      setProfilePictureSaving(false);
    }
  };

  // ── Password ─────────────────────────────────────────────────────────────────

  const handleUpdatePassword = async () => {
    try {
      if (!userId) throw new Error("No logged-in user found.");
      setPasswordSaving(true); setError(""); setMessage("");
      if (!currentPassword || !newPassword || !confirmNewPassword)
        throw new Error("Please fill in all password fields.");
      if (newPassword !== confirmNewPassword)
        throw new Error("New password and confirm password do not match.");
      const res = await fetch(apiUrl(`/api/users/${userId}/password`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update password.");
      setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword("");
      setMessage("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  // ── Email verification ───────────────────────────────────────────────────────

  const handleSendVerifyCode = async () => {
    try {
      setVerifyLoading(true); setVerifyError("");
      const res = await fetch(apiUrl(`/api/users/${userId}/send-verify-email`), {
        method: "POST", headers: { "Content-Type": "application/json" },
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
      setVerifyLoading(true); setVerifyError("");
      const res = await fetch(apiUrl(`/api/users/${userId}/verify-email-code`), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid or expired verification code.");
      setPasswordVerified(true); setShowCurrentPassword(true);
      setVerifyEmailModalOpen(false); setVerifyCode(""); setVerifyError(""); setVerifySent(false);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Invalid or expired code.");
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

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
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div>
                    <label>Email:</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label>Phone:</label>
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
                    <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  </div>
                  <div>
                    <label>Status:</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as "active" | "disabled")}>
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                  <div>
                    <label>Province:</label>
                    <select value={provinceId} onChange={(e) => handleProvinceChange(e.target.value)}>
                      <option value="">Select province</option>
                      {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Municipality:</label>
                    <select value={municipalityId} onChange={(e) => handleMunicipalityChange(e.target.value)} disabled={!provinceId}>
                      <option value="">Select municipality</option>
                      {municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Barangay:</label>
                    <select value={barangayId} onChange={(e) => setBarangayId(e.target.value)} disabled={!municipalityId}>
                      <option value="">Select barangay</option>
                      {barangays.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="full-width-field">
                    <label>Address:</label>
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
                  </div>
                  <div className="full-width-field">
                    <label className="consent-row">
                      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                      <span>I agree to the consent/privacy terms.</span>
                    </label>
                  </div>
                  <div className="account-action">
                    <button className="primary-btn" type="button" onClick={() => setShowSaveConfirm(true)} disabled={profileSaving}>
                      {profileSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>

              <h2>Security</h2>

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
                        if (!passwordVerified) { setVerifyEmailModalOpen(true); handleSendVerifyCode(); }
                        else setShowCurrentPassword((prev) => !prev);
                      }}
                    >
                      {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  {passwordVerified && (
                    <p className="verify-success-hint">✓ Identity verified — your password is now visible as you type.</p>
                  )}
                </div>

                <div className="security-row2">
                  <span>New Password</span>
                  <div className="password-box">
                    <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                    <button type="button" className="new-btn" onClick={() => setShowNewPassword((prev) => !prev)}>
                      {showNewPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="security-row3">
                  <span>Confirm New Password</span>
                  <div className="password-box">
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirm new password" />
                    <button type="button" className="confirm-btn" onClick={() => setShowConfirmPassword((prev) => !prev)}>
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="security-actions">
                  <button className="update-btn" type="button" onClick={() => setShowPasswordConfirm(true)} disabled={passwordSaving}>
                    {passwordSaving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>

              <div className="profile-bottom-actions">
                <button
                  className="profile-bottom-btn logout-bottom-btn"
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                >
                  ⏻&nbsp; Log Out
                </button>
                <button
                  className="profile-bottom-btn deactivate-bottom-btn"
                  type="button"
                  onClick={() => setShowDeactivateConfirm(true)}
                >
                  ⚠&nbsp; Deactivate Account
                </button>
              </div>
            </section>
          </div>
        </main>

      </div>

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm-modal">
            <h3>Log out?</h3>
            <p>Are you sure you want to log out of your account?</p>
            <div className="logout-actions">
              <button className="btn-cancel" onClick={() => setShowLogoutConfirm(false)}>No</button>
              <button className="btn-confirm" onClick={() => {
                setShowLogoutConfirm(false);
                clearStoredAuth();
                setShowLogoutSuccess(true);
                setTimeout(() => navigate("/signin"), 1500);
              }}>Yes</button>
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
              <button className="btn-cancel" onClick={() => setShowSaveConfirm(false)}>Cancel</button>
              <button className="btn-confirm" onClick={() => { setShowSaveConfirm(false); handleSaveProfile(); }}>Save</button>
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
              <button className="btn-cancel" onClick={() => setShowPasswordConfirm(false)}>Cancel</button>
              <button className="btn-confirm" onClick={() => { setShowPasswordConfirm(false); handleUpdatePassword(); }}>Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate account confirmation */}
      {showDeactivateConfirm && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm-modal">
            <h3>Deactivate Account?</h3>
            <p>Your account will be disabled. You can reactivate by contacting support.</p>
            <div className="logout-actions">
              <button className="btn-cancel" onClick={() => setShowDeactivateConfirm(false)}>Cancel</button>
              <button
                className="btn-confirm deactivate-confirm-btn"
                onClick={async () => {
                  setShowDeactivateConfirm(false);
                  try {
                    const res = await fetch(apiUrl(`/api/users/${userId}/profile`), {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "disabled" }),
                    });
                    if (!res.ok) {
                      const data = await res.json();
                      throw new Error(data.message || "Failed to deactivate account.");
                    }
                    clearStoredAuth();
                    navigate("/signin");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to deactivate account.");
                  }
                }}
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email verification modal */}
      {verifyEmailModalOpen && (
        <div className="logout-confirm-overlay">
          <div className="verify-email-modal">
            <button className="verify-modal-close" type="button" onClick={() => {
              setVerifyEmailModalOpen(false); setVerifyCode(""); setVerifyError(""); setVerifySent(false);
            }}>×</button>
            <div className="verify-modal-icon">✉️</div>
            <h3 className="verify-modal-title">Verify Your Email</h3>
            <p className="verify-modal-desc">
              {verifyLoading && !verifySent
                ? "Sending code…"
                : <>{`A 6-digit code has been sent to`}<br /><strong>{email}</strong></>}
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
              <button className="btn-cancel" type="button" onClick={() => {
                setVerifyEmailModalOpen(false); setVerifyCode(""); setVerifyError(""); setVerifySent(false);
              }}>Cancel</button>
              <button className="btn-confirm" type="button" onClick={handleVerifyEmailCode} disabled={verifyLoading || verifyCode.length < 6}>
                {verifyLoading && verifyCode.length >= 6 ? "Verifying…" : "Verify"}
              </button>
            </div>
            <button className="verify-resend-btn" type="button" onClick={() => { setVerifyCode(""); setVerifySent(false); handleSendVerifyCode(); }} disabled={verifyLoading}>
              {verifyLoading && !verifySent ? "Sending…" : "Resend Code"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
