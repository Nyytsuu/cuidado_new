import { useEffect, useMemo, useState } from "react";
import UserSidebar from "../Categories/UserSidebar";
import "./FindClinic.css";
import "leaflet/dist/leaflet.css";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Clinic = {
  id: number;
  clinic_name: string;
  email: string;
  phone: string;
  address: string;
  specialization: string;
  services_offered: string;
  opening_time: string;
  closing_time: string;
  operating_days: string;
  created_at: string;
  status: string;
  account_status: string;
  latitude: string | number | null;
  longitude: string | number | null;
};

type ClinicWithDistance = Clinic & {
  distanceKm: number | null;
  isOpenNow: boolean;
};

export default function FindClinic() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState("All");
  const [openNow, setOpenNow] = useState(false);

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");

  const [selectedClinic, setSelectedClinic] = useState<ClinicWithDistance | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [purpose, setPurpose] = useState("Clinic Booking");
  const [symptoms, setSymptoms] = useState("");
  const [patientNote, setPatientNote] = useState("");

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successPopupMessage, setSuccessPopupMessage] = useState("");

  const fetchClinics = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (specialization !== "All") params.append("specialization", specialization);
      if (openNow) params.append("openNow", "true");

      const res = await fetch(`http://localhost:5000/api/clinics?${params.toString()}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error("Failed to fetch clinics");
      }

      setClinics(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this browser.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setError("Unable to get your location.");
        setLocating(false);
      }
    );
  };

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

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const normalizeDay = (value: string) =>
    value.trim().toLowerCase().replace(/\./g, "");

  const getTodayName = () =>
    new Date().toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();

  const isClinicOpenNow = (clinic: Clinic) => {
    const today = getTodayName();
    const daysRaw = (clinic.operating_days || "").toLowerCase();

    let isOperatingToday = false;

    if (daysRaw.includes("mon-fri")) {
      isOperatingToday = ["mon", "tue", "wed", "thu", "fri"].includes(today);
    } else if (daysRaw.includes("mon-sat")) {
      isOperatingToday = ["mon", "tue", "wed", "thu", "fri", "sat"].includes(today);
    } else if (daysRaw.includes("daily")) {
      isOperatingToday = true;
    } else {
      const parts = daysRaw.split(",").map(normalizeDay);
      isOperatingToday = parts.some((d) => today.startsWith(d));
    }

    if (!isOperatingToday) return false;

    const now = new Date();
    const [openH, openM] = clinic.opening_time.split(":").map(Number);
    const [closeH, closeM] = clinic.closing_time.split(":").map(Number);

    const openDate = new Date();
    openDate.setHours(openH, openM, 0, 0);

    const closeDate = new Date();
    closeDate.setHours(closeH, closeM, 0, 0);

    return now >= openDate && now <= closeDate;
  };

  const clinicsWithDistance = useMemo<ClinicWithDistance[]>(() => {
    return clinics.map((clinic) => {
      const hasCoords =
        clinic.latitude !== null &&
        clinic.longitude !== null &&
        !Number.isNaN(Number(clinic.latitude)) &&
        !Number.isNaN(Number(clinic.longitude));

      return {
        ...clinic,
        distanceKm:
          hasCoords && userLocation
            ? haversineDistance(
                userLocation.lat,
                userLocation.lng,
                Number(clinic.latitude),
                Number(clinic.longitude)
              )
            : null,
        isOpenNow: isClinicOpenNow(clinic),
      };
    });
  }, [clinics, userLocation]);

  const sortedClinics = useMemo(() => {
    const data = [...clinicsWithDistance];

    data.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    return data;
  }, [clinicsWithDistance]);

  const nearestClinic = useMemo(() => {
    return sortedClinics.find((clinic) => clinic.distanceKm !== null) || null;
  }, [sortedClinics]);

  const defaultCenter: [number, number] =
    nearestClinic && nearestClinic.latitude && nearestClinic.longitude
      ? [Number(nearestClinic.latitude), Number(nearestClinic.longitude)]
      : [14.4058443, 120.9892631];

  const mapCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : defaultCenter;

  const openBookingModal = (clinic: ClinicWithDistance) => {
    if (!clinic.isOpenNow) {
      setBookingMessage(`${clinic.clinic_name} is currently closed.`);
      return;
    }

    setSelectedClinic(clinic);
    setShowBookingModal(true);
    setBookingMessage("");

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    setAppointmentDate(`${yyyy}-${mm}-${dd}`);

    const plusThirty = new Date(now.getTime() + 30 * 60 * 1000);
    const hh = String(plusThirty.getHours()).padStart(2, "0");
    const min = String(plusThirty.getMinutes()).padStart(2, "0");
    setAppointmentTime(`${hh}:${min}`);

    setPurpose("Clinic Booking");
    setSymptoms("");
    setPatientNote("");
  };

  const closeBookingModal = () => {
    if (booking) return;
    setShowBookingModal(false);
    setSelectedClinic(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedClinic) return;

    if (!appointmentDate || !appointmentTime) {
      setBookingMessage("Please select appointment date and time.");
      return;
    }

    try {
      setBooking(true);
      setBookingMessage("");

      const user_id = 1;
      const patient_name_snapshot = "Railee Babiano";
      const patient_phone_snapshot = "+639669875311";

      const start_at = `${appointmentDate} ${appointmentTime}:00`;

      const startDateObj = new Date(`${appointmentDate}T${appointmentTime}:00`);
      const endDateObj = new Date(startDateObj.getTime() + 30 * 60 * 1000);
      const end_at = `${endDateObj.getFullYear()}-${String(
        endDateObj.getMonth() + 1
      ).padStart(2, "0")}-${String(endDateObj.getDate()).padStart(2, "0")} ${String(
        endDateObj.getHours()
      ).padStart(2, "0")}:${String(endDateObj.getMinutes()).padStart(2, "0")}:00`;

      const res = await fetch("http://localhost:5000/api/appointments/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id,
          clinic_id: selectedClinic.id,
          start_at,
          end_at,
          purpose,
          symptoms,
          patient_note: patientNote,
          patient_name_snapshot,
          patient_phone_snapshot,
          clinic_name_snapshot: selectedClinic.clinic_name,
          services: [],
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to book appointment");
      }

      const clinicName = selectedClinic.clinic_name;

      setShowBookingModal(false);
      setSelectedClinic(null);

      setSuccessPopupMessage(
        `Your appointment with ${clinicName} was booked successfully.`
      );
      setShowSuccessPopup(true);

      setAppointmentDate("");
      setAppointmentTime("");
      setPurpose("Clinic Booking");
      setSymptoms("");
      setPatientNote("");
    } catch (err) {
      setBookingMessage(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className={`findclinic-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <div className="findclinic-content">
        <main className="findclinic-main">
          <h1 className="fc-title">Find Clinic</h1>
          <p className="fc-sub">Search approved and active clinics</p>

          <div className="fc-search-wrap">
            <div className="fc-search-bar">
              <div className="fc-search-field fc-search-location">
                <span className="fc-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search clinic..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="fc-search-field fc-search-select">
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="general">General</option>
                  <option value="dental">Dental</option>
                </select>
              </div>

              <div className="fc-search-field fc-search-select">
                <select
                  value={openNow ? "open" : "all"}
                  onChange={(e) => setOpenNow(e.target.value === "open")}
                >
                  <option value="all">All Clinics</option>
                  <option value="open">Open Now</option>
                </select>
              </div>

              <button type="button" className="fc-search-btn" onClick={fetchClinics}>
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          <div className="fc-filters">
            <button type="button" className="fc-filter-chip">
              {sortedClinics.length} clinic(s)
            </button>

            <button
              type="button"
              className="fc-filter-chip fc-filter-location"
              onClick={requestLocation}
            >
              📍 {locating ? "Locating..." : "Use My Location"}
            </button>

            {nearestClinic && nearestClinic.distanceKm !== null && (
              <button type="button" className="fc-filter-chip fc-filter-nearest">
                Nearest: {nearestClinic.clinic_name} ({nearestClinic.distanceKm.toFixed(2)} km)
              </button>
            )}

            <button
              type="button"
              className="fc-filter-chip fc-filter-book"
              onClick={() => nearestClinic && openBookingModal(nearestClinic)}
              disabled={!nearestClinic || !nearestClinic.isOpenNow || booking}
            >
              Book Nearest Clinic
            </button>
          </div>

          {error && <p className="fc-message fc-message-error">{error}</p>}
          {bookingMessage && <p className="fc-message fc-message-success">{bookingMessage}</p>}

          <div className="fc-layout">
            <div className="fc-list">
              {sortedClinics.map((clinic) => {
                const isNearest = nearestClinic?.id === clinic.id;

                return (
                  <div
                    className={`fc-card ${isNearest ? "fc-card-nearest" : ""}`}
                    key={clinic.id}
                  >
                    <div className="fc-card-left">
                      <h3>
                        {clinic.clinic_name}
                        {isNearest && <span className="fc-nearest-badge">Nearest</span>}
                      </h3>

                      <div className="fc-meta">
                        <span className="fc-meta-pill">{clinic.specialization}</span>
                        <span className="fc-meta-pill">{clinic.services_offered}</span>
                      </div>

                      <div className="fc-location-row">
                        <span className="fc-location-icon">📍</span>
                        <p>{clinic.address}</p>
                      </div>

                      <div className="fc-detail-list">
                        <p>
                          <strong>Hours:</strong> {clinic.opening_time} - {clinic.closing_time}
                        </p>
                        <p>
                          <strong>Days:</strong> {clinic.operating_days}
                        </p>
                        <p>
                          <strong>Phone:</strong> {clinic.phone}
                        </p>
                      </div>
                    </div>

                    <div className="fc-right">
                      <span className={`fc-status ${clinic.isOpenNow ? "open" : "closed"}`}>
                        {clinic.isOpenNow ? "Open Now" : "Closed"}
                      </span>

                      <p className="fc-distance">
                        {clinic.distanceKm !== null
                          ? `${clinic.distanceKm.toFixed(2)} km`
                          : "Distance unavailable"}
                      </p>

                      <button
                        type="button"
                        className="fc-book-btn"
                        disabled={!clinic.isOpenNow || booking}
                        onClick={() => openBookingModal(clinic)}
                      >
                        {clinic.isOpenNow ? "Book Now" : "Closed"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {!loading && sortedClinics.length === 0 && <p>No clinics found.</p>}
            </div>

            <div className="fc-map">
              <MapContainer
                center={mapCenter}
                zoom={15}
                scrollWheelZoom={true}
                style={{ height: "100%", minHeight: "520px", width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {userLocation && (
                  <Marker position={[userLocation.lat, userLocation.lng]}>
                    <Popup>You are here</Popup>
                  </Marker>
                )}

                {sortedClinics
                  .filter(
                    (clinic) =>
                      clinic.latitude !== null &&
                      clinic.longitude !== null &&
                      !Number.isNaN(Number(clinic.latitude)) &&
                      !Number.isNaN(Number(clinic.longitude))
                  )
                  .map((clinic) => (
                    <Marker
                      key={clinic.id}
                      position={[Number(clinic.latitude), Number(clinic.longitude)]}
                    >
                      <Popup>
                        <strong>{clinic.clinic_name}</strong>
                        <br />
                        {clinic.address}
                        <br />
                        {clinic.isOpenNow ? "Open Now" : "Closed"}
                        {clinic.distanceKm !== null && (
                          <>
                            <br />
                            Distance: {clinic.distanceKm.toFixed(2)} km
                          </>
                        )}
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>
            </div>
          </div>

          <div className="fc-footer">
            <span>About Us</span>
            <span>Contact</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </main>
      </div>

      {showBookingModal && selectedClinic && (
        <div className="fc-modal-overlay" onClick={closeBookingModal}>
          <div className="fc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fc-modal-header">
              <h2>Book Appointment</h2>
              <button
                type="button"
                className="fc-modal-close"
                onClick={closeBookingModal}
                disabled={booking}
              >
                ×
              </button>
            </div>

            <div className="fc-modal-body">
              <p className="fc-modal-clinic-name">{selectedClinic.clinic_name}</p>
              <p className="fc-modal-address">{selectedClinic.address}</p>

              <div className="fc-modal-grid">
                <div className="fc-modal-field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                  />
                </div>

                <div className="fc-modal-field">
                  <label>Time</label>
                  <input
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="fc-modal-field">
                <label>Purpose</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Enter purpose"
                />
              </div>

              <div className="fc-modal-field">
                <label>Symptoms</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Enter symptoms"
                  rows={3}
                />
              </div>

              <div className="fc-modal-field">
                <label>Patient Note</label>
                <textarea
                  value={patientNote}
                  onChange={(e) => setPatientNote(e.target.value)}
                  placeholder="Add a note"
                  rows={3}
                />
              </div>
            </div>

            <div className="fc-modal-actions">
              <button
                type="button"
                className="fc-modal-btn secondary"
                onClick={closeBookingModal}
                disabled={booking}
              >
                Cancel
              </button>
              <button
                type="button"
                className="fc-modal-btn primary"
                onClick={handleConfirmBooking}
                disabled={booking}
              >
                {booking ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessPopup && (
        <div className="fc-success-overlay">
          <div className="fc-success-card">
            <div className="fc-success-icon">✅</div>
            <h3>Booking Successful</h3>
            <p>{successPopupMessage}</p>

            <button
              type="button"
              className="fc-success-btn"
              onClick={() => setShowSuccessPopup(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}