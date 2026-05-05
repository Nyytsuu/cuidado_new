import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Ambulance,
  ClipboardCheck,
  Compass,
  Copy,
  HeartPulse,
  Hospital,
  LocateFixed,
  MapPin,
  Phone,
  ShieldAlert,
} from "lucide-react";
import UserSidebar from "../Categories/UserSidebar";
import VoiceAssistantPopup from "./VoiceAssistantPopup";
import "./UserEmergency.css";

type ClinicRow = {
  id: number;
  clinic_name: string;
  address: string;
  phone?: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  is_open_now?: number | boolean;
  status?: string;
  account_status?: string;
};

type ClinicWithDistance = ClinicRow & {
  distanceKm: number | null;
};

const API_BASE = "http://localhost:5000";

const emergencyContacts = [
  {
    name: "National Emergency Hotline",
    detail: "For urgent police, fire, rescue, or medical emergencies.",
    number: "911",
    action: "Call 911",
    tone: "critical",
  },
  {
    name: "Philippine Red Cross",
    detail: "For ambulance, rescue, blood, and disaster response support.",
    number: "143",
    action: "Call 143",
    tone: "red",
  },
  {
    name: "Find Nearby Clinics",
    detail: "Use Cuidado MediHelp clinic search for non-life-threatening care.",
    number: "",
    action: "Open Clinics",
    tone: "clinic",
  },
];

const redFlags = [
  "Chest pain, severe shortness of breath, or blue lips",
  "Signs of stroke such as face drooping, arm weakness, or sudden speech trouble",
  "Severe bleeding, serious burns, poisoning, seizure, or loss of consciousness",
  "Severe allergic reaction, swelling of the face/throat, or trouble breathing",
  "Severe injury after an accident or sudden confusion",
];

const checklist = [
  "Call emergency services first if there is immediate danger.",
  "Give your exact location, landmark, and callback number.",
  "Keep the patient still unless the place is unsafe.",
  "Prepare medicines, allergies, ID, and recent medical history.",
  "Stay on the line and follow the dispatcher instructions.",
];

const getStoredUserName = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}") as {
      full_name?: string;
      name?: string;
    };
    return user.full_name || user.name || "there";
  } catch {
    return "there";
  }
};

const isEnabledFlag = (value: number | boolean | string | null | undefined) =>
  value === true || Number(value) === 1;

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export default function UserEmergency() {
  const navigate = useNavigate();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationError, setLocationError] = useState("");
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const userName = useMemo(() => getStoredUserName(), []);

  useEffect(() => {
    const loadClinics = async () => {
      try {
        setClinicsLoading(true);
        const res = await fetch(`${API_BASE}/api/clinics`, { cache: "no-store" });
        const data = await res.json().catch(() => []);

        if (!res.ok) {
          throw new Error("Failed to load clinics.");
        }

        setClinics(Array.isArray(data) ? data : []);
      } catch {
        setClinics([]);
      } finally {
        setClinicsLoading(false);
      }
    };

    void loadClinics();
  }, []);

  const clinicsWithDistance = useMemo<ClinicWithDistance[]>(() => {
    return clinics
      .map((clinic) => {
        const hasCoords =
          clinic.latitude !== null &&
          clinic.longitude !== null &&
          !Number.isNaN(Number(clinic.latitude)) &&
          !Number.isNaN(Number(clinic.longitude));

        return {
          ...clinic,
          distanceKm:
            hasCoords && location
              ? haversineDistance(
                  location.lat,
                  location.lng,
                  Number(clinic.latitude),
                  Number(clinic.longitude)
                )
              : null,
        };
      })
      .sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, 3);
  }, [clinics, location]);

  const requestLocation = () => {
    setLocationError("");
    setLocationMessage("");

    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location services.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(coords);
        setLocationMessage("Location found. You can copy it or use it to sort nearby clinics.");
      },
      () => {
        setLocationError("Unable to access your location. Please type or share your address manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const copyLocation = async () => {
    if (!location) {
      setLocationError("Get your location first before copying it.");
      return;
    }

    const text = `My current location: https://maps.google.com/?q=${location.lat},${location.lng}`;

    try {
      await navigator.clipboard.writeText(text);
      setLocationMessage("Location link copied.");
      setLocationError("");
    } catch {
      setLocationError(text);
    }
  };

  return (
    <div className={`emergency-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
        searchPlaceholder="Search site..."
      />

      <main className="emergency-main">
        <section className="emergency-hero">
          <div>
            <span className="emergency-kicker">
              <ShieldAlert size={18} />
              Emergency support
            </span>
            <h1>Hi {userName}, get help fast.</h1>
            <p>
              If this is life-threatening, call emergency services now. Use this
              page to call, copy your location, and find nearby clinics.
            </p>
          </div>

          <div className="emergency-hero-actions">
            <a className="emergency-call-primary" href="tel:911">
              <Phone size={20} />
              Call 911
            </a>
            <button type="button" className="emergency-outline-btn" onClick={requestLocation}>
              <LocateFixed size={18} />
              Get Location
            </button>
          </div>
        </section>

        <section className="emergency-contact-grid">
          {emergencyContacts.map((contact) => (
            <article className={`emergency-contact-card ${contact.tone}`} key={contact.name}>
              <div className="emergency-contact-icon">
                {contact.number ? <Phone size={24} /> : <Hospital size={24} />}
              </div>
              <div>
                <h2>{contact.name}</h2>
                <p>{contact.detail}</p>
                {contact.number && <strong>{contact.number}</strong>}
              </div>
              {contact.number ? (
                <a href={`tel:${contact.number}`} className="emergency-card-btn">
                  {contact.action}
                </a>
              ) : (
                <button
                  type="button"
                  className="emergency-card-btn"
                  onClick={() => navigate("/find-clinic")}
                >
                  {contact.action}
                </button>
              )}
            </article>
          ))}
        </section>

        <section className="emergency-layout">
          <div className="emergency-stack">
            <section className="emergency-panel">
              <div className="emergency-panel-title">
                <AlertTriangle size={20} />
                <h2>Call now for these signs</h2>
              </div>

              <div className="red-flag-list">
                {redFlags.map((item) => (
                  <div className="red-flag-item" key={item}>
                    <span></span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="emergency-panel">
              <div className="emergency-panel-title">
                <ClipboardCheck size={20} />
                <h2>What to prepare</h2>
              </div>

              <ol className="emergency-checklist">
                {checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="emergency-side">
            <section className="emergency-panel location-panel">
              <div className="emergency-panel-title">
                <Compass size={20} />
                <h2>Your location</h2>
              </div>

              {location ? (
                <div className="location-card">
                  <MapPin size={20} />
                  <span>
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </span>
                </div>
              ) : (
                <p className="emergency-muted">
                  Share this location with a dispatcher or a trusted contact.
                </p>
              )}

              {locationMessage && <div className="emergency-alert success">{locationMessage}</div>}
              {locationError && <div className="emergency-alert error">{locationError}</div>}

              <div className="location-actions">
                <button type="button" onClick={requestLocation}>
                  <LocateFixed size={17} />
                  Locate Me
                </button>
                <button type="button" onClick={copyLocation}>
                  <Copy size={17} />
                  Copy Link
                </button>
              </div>
            </section>

            <section className="emergency-panel">
              <div className="emergency-panel-title">
                <Hospital size={20} />
                <h2>Nearby clinics</h2>
              </div>

              {clinicsLoading ? (
                <p className="emergency-muted">Loading clinics...</p>
              ) : clinicsWithDistance.length === 0 ? (
                <p className="emergency-muted">No approved clinics found yet.</p>
              ) : (
                <div className="nearby-clinic-list">
                  {clinicsWithDistance.map((clinic) => (
                    <div className="nearby-clinic-card" key={clinic.id}>
                      <div>
                        <h3>{clinic.clinic_name}</h3>
                        <p>{clinic.address}</p>
                        <span className={isEnabledFlag(clinic.is_open_now) ? "open" : "closed"}>
                          {isEnabledFlag(clinic.is_open_now) ? "Open now" : "Closed now"}
                        </span>
                      </div>
                      <strong>
                        {clinic.distanceKm !== null
                          ? `${clinic.distanceKm.toFixed(1)} km`
                          : "Use location"}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              <Link className="emergency-wide-link" to="/find-clinic">
                View all clinics
              </Link>
            </section>

            <section className="emergency-panel emergency-note">
              <HeartPulse size={22} />
              <p>
                Cuidado MediHelp can guide you to care, but emergency calls should
                go directly to official responders.
              </p>
              <Link to="/help">Need app help instead?</Link>
            </section>
          </aside>
        </section>

        <section className="emergency-bottom-actions">
          <VoiceAssistantPopup>
            <Ambulance size={18} />
            Open Voice Assistant
          </VoiceAssistantPopup>
          <button type="button" onClick={() => navigate("/symptom-checker")}>
            <HeartPulse size={18} />
            Symptom Checker
          </button>
          <button type="button" onClick={() => navigate("/appointments")}>
            <ClipboardCheck size={18} />
            My Appointments
          </button>
        </section>
      </main>
    </div>
  );
}
