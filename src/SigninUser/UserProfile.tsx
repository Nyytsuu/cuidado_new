import React, { useEffect, useRef, useState } from "react";
import "./UserProfile.css";
import micIcon from "../img/mic.png";
import profileImg from "../img/profile1.jpg";
import logo from "../img/logo.png";
import searchIcon from "../img/search.png";

const menuItems = [
  { label: "Home", icon: "⌂" },
  { label: "Health Topics", icon: "♡" },
  { label: "My Profile", icon: "👨‍⚕️", active: true },
  { label: "Find Clinics", icon: "📍" },
];

const generalItems = [
  { label: "Emergency Guide", icon: "🚑" },
  { label: "Log Out", icon: "⏻" },
];

type VoiceStep =
  | "idle"
  | "listening"
  | "result"
  | "processing"
  | "retry"
  | "unsupported";

type PossibleCondition = {
  name: string;
  score: number;
  matchedSymptoms: string[];
};

type SymptomResult = {
  transcript: string;
  symptoms: string[];
  possible_conditions: PossibleCondition[];
  urgency: "low" | "medium" | "high";
  advice: string;
  emergency: boolean;
};

type ProfileData = {
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
  consent: number | null;
  status: "active" | "disabled";
  province_name?: string | null;
  municipality_name?: string | null;
  barangay_name?: string | null;
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
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEventLike) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEventLike) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

export default function UserProfile() {
  const userId = 1; // replace with logged-in user id

  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [voicePopupOpen, setVoicePopupOpen] = useState(false);
  const [voiceStep, setVoiceStep] = useState<VoiceStep>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [symptomResult, setSymptomResult] = useState<SymptomResult | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);

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

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const CONDITION_DB = [
    {
      name: "Common Cold",
      symptoms: [
        "cough",
        "sore throat",
        "runny nose",
        "sneezing",
        "mild fever",
        "congestion",
      ],
      urgency: "low" as const,
      advice: "Rest, drink fluids, and monitor symptoms.",
    },
    {
      name: "Flu",
      symptoms: [
        "fever",
        "cough",
        "body ache",
        "fatigue",
        "headache",
        "chills",
        "sore throat",
      ],
      urgency: "medium" as const,
      advice: "Rest, hydrate, and consult a doctor if symptoms worsen.",
    },
    {
      name: "COVID-19",
      symptoms: [
        "fever",
        "cough",
        "fatigue",
        "headache",
        "sore throat",
        "loss of taste",
        "loss of smell",
        "shortness of breath",
      ],
      urgency: "medium" as const,
      advice: "Isolate if needed and seek medical advice, especially for breathing issues.",
    },
    {
      name: "Dengue",
      symptoms: ["high fever", "headache", "body ache", "joint pain", "rash", "nausea"],
      urgency: "high" as const,
      advice: "Seek medical attention promptly, especially if fever is persistent.",
    },
    {
      name: "Asthma Attack",
      symptoms: ["shortness of breath", "wheezing", "chest tightness", "cough"],
      urgency: "high" as const,
      advice: "Use prescribed medication and seek urgent care if breathing is difficult.",
    },
    {
      name: "Migraine",
      symptoms: ["headache", "nausea", "light sensitivity", "vomiting"],
      urgency: "low" as const,
      advice: "Rest in a quiet room and consult a doctor for recurring severe headaches.",
    },
    {
      name: "Food Poisoning",
      symptoms: ["vomiting", "diarrhea", "nausea", "stomach pain", "fever"],
      urgency: "medium" as const,
      advice: "Drink fluids to avoid dehydration and seek care if symptoms are severe.",
    },
  ];

  const KNOWN_SYMPTOMS = [
    "high fever",
    "mild fever",
    "fever",
    "cough",
    "sore throat",
    "runny nose",
    "sneezing",
    "congestion",
    "body ache",
    "fatigue",
    "headache",
    "chills",
    "loss of taste",
    "loss of smell",
    "shortness of breath",
    "wheezing",
    "chest tightness",
    "joint pain",
    "rash",
    "nausea",
    "vomiting",
    "diarrhea",
    "stomach pain",
    "light sensitivity",
  ];

  const extractSymptoms = (transcript: string) => {
    const lower = transcript.toLowerCase();

    return KNOWN_SYMPTOMS.filter((symptom) => lower.includes(symptom));
  };

  const analyzeSymptomsLocally = (transcript: string): SymptomResult => {
    const detectedSymptoms = extractSymptoms(transcript);

    const ranked = CONDITION_DB.map((condition) => {
      const matchedSymptoms = condition.symptoms.filter((symptom) =>
        detectedSymptoms.includes(symptom)
      );

      const score =
        condition.symptoms.length > 0
          ? matchedSymptoms.length / condition.symptoms.length
          : 0;

      return {
        name: condition.name,
        score,
        matchedSymptoms,
        urgency: condition.urgency,
        advice: condition.advice,
      };
    })
      .filter((condition) => condition.score > 0)
      .sort((a, b) => b.score - a.score);

    const top = ranked[0];

    const emergency =
      detectedSymptoms.includes("shortness of breath") ||
      detectedSymptoms.includes("chest tightness") ||
      detectedSymptoms.includes("high fever");

    const urgency: "low" | "medium" | "high" = emergency
      ? "high"
      : top?.urgency || "low";

    const advice = emergency
      ? "Seek urgent medical attention immediately."
      : top?.advice || "Please consult a healthcare professional.";

    return {
      transcript,
      symptoms: detectedSymptoms,
      possible_conditions: ranked.map((item) => ({
        name: item.name,
        score: item.score,
        matchedSymptoms: item.matchedSymptoms,
      })),
      urgency,
      advice,
      emergency,
    };
  };

  const analyzeVoiceSymptoms = async (transcript: string) => {
    try {
      setVoiceStep("processing");
      setVoiceError("");
      setSymptomResult(null);

      await new Promise((resolve) => setTimeout(resolve, 800));

      const result = analyzeSymptomsLocally(transcript);

      setSymptomResult(result);
      setVoiceStep("result");
    } catch (err) {
      setVoiceError(
        err instanceof Error ? err.message : "Failed to analyze symptoms."
      );
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
    setVoicePopupOpen(false);
    setVoiceStep("idle");
    setVoiceTranscript("");
    setVoiceError("");
    setSymptomResult(null);
  };

  const startVoiceAssistant = () => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    setVoicePopupOpen(true);
    setVoiceTranscript("");
    setVoiceError("");
    setSymptomResult(null);

    if (!SpeechRecognitionAPI) {
      setVoiceStep("unsupported");
      return;
    }

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
      setVoiceError(event.error || "Speech recognition failed.");
      setVoiceStep("retry");
    };

    recognition.onend = () => {
      if (!voiceTranscript && voiceStep === "listening") {
        setVoiceStep("retry");
      }
    };

    recognition.start();
  };

  const voiceContent = getVoiceContent();

  const loadProvinces = async () => {
    const res = await fetch("http://localhost:5000/api/users/meta/provinces");
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load provinces.");
    setProvinces(Array.isArray(data) ? data : []);
  };

  const loadMunicipalities = async (selectedProvinceId: string | number) => {
    if (!selectedProvinceId) {
      setMunicipalities([]);
      return;
    }

    const res = await fetch(
      `http://localhost:5000/api/users/meta/municipalities?province_id=${selectedProvinceId}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load municipalities.");
    setMunicipalities(Array.isArray(data) ? data : []);
  };

  const loadBarangays = async (selectedMunicipalityId: string | number) => {
    if (!selectedMunicipalityId) {
      setBarangays([]);
      return;
    }

    const res = await fetch(
      `http://localhost:5000/api/users/meta/barangays?municipality_id=${selectedMunicipalityId}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load barangays.");
    setBarangays(Array.isArray(data) ? data : []);
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      await loadProvinces();

      const res = await fetch(`http://localhost:5000/api/users/${userId}/profile`);
      const data: ProfileData = await res.json();

      if (!res.ok) {
        throw new Error((data as any).message || "Failed to load profile.");
      }

      setProfile(data);
      setFullName(data.full_name || "");
      setEmail(data.email || "");
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
  };

  useEffect(() => {
    loadProfile();
  }, []);

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
      setProfileSaving(true);
      setError("");
      setMessage("");

      const res = await fetch(`http://localhost:5000/api/users/${userId}/profile`, {
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

  const handleUpdatePassword = async () => {
    try {
      setPasswordSaving(true);
      setError("");
      setMessage("");

      if (!currentPassword || !newPassword || !confirmNewPassword) {
        throw new Error("Please fill in all password fields.");
      }

      if (newPassword !== confirmNewPassword) {
        throw new Error("New password and confirm password do not match.");
      }

      const res = await fetch(`http://localhost:5000/api/users/${userId}/password`, {
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

  return (
    <div className="profile-page">
      <div className="health-app">
        <header className="app-header">
          <div className="header-left">
            <img src={logo} alt="CUIDADO logo" className="brand-logo" />
          </div>

          <div className="header-center">
            <div className="header-search">
              <input type="text" placeholder="Search..." />
              <button aria-label="Search" type="button" className="search-btn">
                <img src={searchIcon} alt="Search" />
              </button>
            </div>
          </div>

          <div className="header-right">
            <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
              <button
                type="button"
                className="profile-avatar-btn"
                onClick={() => setHeaderProfileOpen((v) => !v)}
              >
                <img src={profileImg} alt="Profile" className="header-avatar-img" />
                <span className="caret">⌄</span>
              </button>

              <div className="profile-dropdown">
                <a href="#">My Profile</a>
                <a href="#">Settings</a>
                <a href="#">Logout</a>
              </div>
            </div>
          </div>
        </header>

        <main className="main-content">
          <aside className="icon-rail">
            <div className="icon-rail-top">
              <button className="rail-icon rail-avatar" aria-label="Profile" type="button">
                <img src={profileImg} alt="Profile" className="rail-avatar-img" />
              </button>
            </div>

            <div className="icon-rail-menu">
              <button className="rail-icon" aria-label="Home" type="button">⌂</button>
              <button className="rail-icon" aria-label="Favorites" type="button">💗</button>
              <button className="rail-icon" aria-label="Health" type="button">🫁</button>
              <button className="rail-icon" aria-label="Brain" type="button">🧠</button>
            </div>
          </aside>

          <aside className="sidebar">
            <div className="profile-mini">
              <div className="avatar">👨‍⚕️</div>
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
                <button key={item.label} className="nav-item" type="button">
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
                A healthy lifestyle, including a balanced diet and regular exercise,
                can reduce the risk of heart disease by up to 80%.
              </p>
            </div>
          </aside>

          <header className="topbar">
            <div className="topbar-left">
              <div className="page-path">
                <span className="path-active">My Profile</span>
              </div>
            </div>

            <button className="edit-button" type="button" onClick={handleSaveProfile}>
              Save Profile
            </button>
          </header>

          <div className="content-grid">
            <section className="main-panel">
              {loading && <p>Loading profile...</p>}
              {error && <div className="booking-error">{error}</div>}
              {message && <div className="booking-success">{message}</div>}

              <h2>Account</h2>

              <div className="account-card">
                <div className="account-top">
                  <div className="account-user">
                    <div className="avatar large">👨‍⚕️</div>
                    <div>
                      <h3>{fullName || "No name"}</h3>
                      <p>{email || "No email"}</p>
                    </div>
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
                    <label>Status:</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as "active" | "disabled")}
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
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
                      onClick={handleSaveProfile}
                      disabled={profileSaving}
                    >
                      {profileSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>

              <h2>Security</h2>

              <div className="security-card">
                <div className="security-row">
                  <span>Current Password</span>
                  <div className="password-box">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <span className="eye">◉</span>
                  </div>
                </div>

                <div className="security-row">
                  <span>New Password</span>
                  <div className="password-box">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <span className="eye">◉</span>
                  </div>
                </div>

                <div className="security-row">
                  <span>Confirm New Password</span>
                  <div className="password-box">
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                    <span className="eye">◉</span>
                  </div>
                </div>

                <div className="security-actions">
                  <button
                    className="update-btn"
                    type="button"
                    onClick={handleUpdatePassword}
                    disabled={passwordSaving}
                  >
                    {passwordSaving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>

              <footer className="footer-links">
                <a href="/">About Us</a>
                <a href="/">Contact</a>
                <a href="/">Privacy Policy</a>
                <a href="/">Terms of Service</a>
              </footer>
            </section>

            <aside className="right-panel">
              <div className="side-widget info-widget">
                <h3>Profile Summary</h3>
                <p><strong>Name:</strong> {fullName || "--"}</p>
                <p><strong>Email:</strong> {email || "--"}</p>
                <p><strong>Phone:</strong> {phone || "--"}</p>
                <p><strong>Province:</strong> {profile?.province_name || "--"}</p>
                <p><strong>Municipality:</strong> {profile?.municipality_name || "--"}</p>
                <p><strong>Barangay:</strong> {profile?.barangay_name || "--"}</p>
                <p><strong>Status:</strong> {status}</p>
              </div>

              <div className="side-widget info-widget">
                <h3>💡 Did You Know?</h3>
                <p>
                  Keep your account details updated so clinics can reach you
                  correctly for appointment confirmations and reminders.
                </p>
              </div>
            </aside>
          </div>

          <button
            className="floating-mic"
            type="button"
            onClick={startVoiceAssistant}
            aria-label="Open voice assistant"
          >
            <img src={micIcon} alt="Microphone" className="floating-mic-icon" />
          </button>

          {voicePopupOpen && (
            <div className="voice-popup-overlay" onClick={closeVoicePopup}>
              <div className="voice-popup-card" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="voice-popup-close"
                  onClick={closeVoicePopup}
                  aria-label="Close popup"
                >
                  ×
                </button>

                <img src={logo} alt="CUIDADO logo" className="voice-popup-logo" />

                <div className={`voice-popup-mic ${voiceContent.micClass}`}>
                  <img src={micIcon} alt="Microphone" />
                </div>

                <div className="voice-popup-text">
                  <h3>
                    {voiceContent.title.split("\n").map((line, index) => (
                      <React.Fragment key={index}>
                        {line}
                        {index !== voiceContent.title.split("\n").length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </h3>

                  <p>{voiceContent.subtitle}</p>

                  {voiceTranscript && (
                    <div className="voice-transcript-preview">
                      <strong>Heard:</strong> {voiceTranscript}
                    </div>
                  )}

                  {voiceError && voiceStep === "retry" && (
                    <div className="voice-error-text">{voiceError}</div>
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

                      <div className="voice-result-section">
                        <strong>Possible conditions (ranked):</strong>
                        {symptomResult.possible_conditions.length > 0 ? (
                          <ol>
                            {symptomResult.possible_conditions.map((condition, index) => (
                              <li key={`${condition.name}-${index}`}>
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
                </div>

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
        </main>
      </div>
    </div>
  );
}