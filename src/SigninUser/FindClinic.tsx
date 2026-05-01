import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  MapPin,
  Star,
  Circle,
  Gift,
  ChevronDown,
  LocateFixed,
} from "lucide-react";
import UserSidebar from "../Categories/UserSidebar";
import "./FindClinic.css";
import "leaflet/dist/leaflet.css";

import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const highlightedUserIcon = new L.DivIcon({
  className: "fc-user-location-icon",
  html: `
    <div class="fc-user-location-pin">
      <div class="fc-user-location-dot"></div>
      <div class="fc-user-location-pulse"></div>
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

type Clinic = {
  id: number;
  clinic_name: string;
  email: string;
  phone: string;
  address: string;
  specialization: string;
  services_offered: string;
  opening_time: string | null;
  closing_time: string | null;
  operating_days: string;
  created_at: string;
  status: string;
  account_status: string;
  latitude: string | number | null;
  longitude: string | number | null;
  is_working_today?: number | boolean;
  is_blocked_today?: number | boolean;
  is_open_now?: number | boolean;
  today_opening_time?: string | null;
  today_closing_time?: string | null;
  clinic_today?: string;
  clinic_now_time?: string;
  weekly_schedule?: WeeklyScheduleDay[];
  blocked_dates?: BlockedDate[];
};

type ClinicWithDistance = Clinic & {
  distanceKm: number | null;
  isOpenNow: boolean;
};

type WeeklyScheduleDay = {
  clinic_id?: number;
  day_of_week: string;
  is_working: number | boolean;
  opening_time: string | null;
  closing_time: string | null;
};

type BlockedDate = {
  id?: number;
  clinic_id?: number;
  date: string;
  reason?: string;
};

type ClinicScheduleApiDay = {
  day: string;
  working: number | boolean | string;
  open: string | null;
  close: string | null;
};

type ClinicScheduleApiResponse = {
  schedule?: ClinicScheduleApiDay[];
  blockedDates?: BlockedDate[];
};

function toDateInputValue(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeInputValue(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isPastAppointmentTime(date: string, time: string): boolean {
  const selected = new Date(`${date}T${time}:00`);
  return Number.isNaN(selected.getTime()) || selected.getTime() <= Date.now();
}

function getMinimumTimeForDate(date: string): string | undefined {
  return date === toDateInputValue() ? toTimeInputValue() : undefined;
}

function normalizeDay(value: string): string {
  return value.trim().toLowerCase().replace(/\./g, "");
}

function getDayName(date: Date, format: "long" | "short"): string {
  return date.toLocaleDateString("en-US", { weekday: format }).toLowerCase();
}

function isEnabledFlag(value: number | boolean | string | null | undefined): boolean {
  return value === true || Number(value) === 1;
}

async function loadClinicScheduleSnapshot(clinic: Clinic): Promise<Clinic> {
  try {
    const res = await fetch(
      `http://localhost:5000/api/clinic/schedule?clinic_id=${clinic.id}`,
      { cache: "no-store" }
    );

    if (!res.ok) return clinic;

    const data = (await res.json()) as ClinicScheduleApiResponse;
    const weeklySchedule = Array.isArray(data.schedule)
      ? data.schedule.map((item) => ({
          clinic_id: clinic.id,
          day_of_week: item.day,
          is_working: isEnabledFlag(item.working),
          opening_time: item.open,
          closing_time: item.close,
        }))
      : clinic.weekly_schedule;
    const blockedDates = Array.isArray(data.blockedDates)
      ? data.blockedDates
      : clinic.blocked_dates;
    const todayDate = clinic.clinic_today || toDateInputValue();
    const isBlockedToday = blockedDates?.some(
      (blockedDate) => blockedDate.date === todayDate
    );

    return {
      ...clinic,
      weekly_schedule: weeklySchedule,
      blocked_dates: blockedDates,
      is_blocked_today: isBlockedToday ? true : clinic.is_blocked_today,
    };
  } catch {
    return clinic;
  }
}

function findScheduleForDate(
  clinic: Clinic,
  date: Date
): WeeklyScheduleDay | undefined {
  const targetDay = getDayName(date, "long");
  return clinic.weekly_schedule?.find(
    (item) => item.day_of_week.toLowerCase() === targetDay
  );
}

function isOperatingFromSummary(clinic: Clinic, date: Date): boolean {
  const today = getDayName(date, "short");
  const daysRaw = (clinic.operating_days || "").toLowerCase();

  if (daysRaw.includes("mon-fri")) {
    return ["mon", "tue", "wed", "thu", "fri"].includes(today);
  }

  if (daysRaw.includes("mon-sat")) {
    return ["mon", "tue", "wed", "thu", "fri", "sat"].includes(today);
  }

  if (daysRaw.includes("daily")) {
    return true;
  }

  const parts = daysRaw.split(",").map(normalizeDay).filter(Boolean);
  return parts.some((day) => today.startsWith(day));
}

function parseClockTime(value: string | null | undefined): [number, number] | null {
  const match = String(value || "").match(/^(\d{2}):(\d{2})/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return [hours, minutes];
}

function parseDateInputValue(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatClockTime(value: string | null | undefined): string {
  const parts = parseClockTime(value);
  if (!parts) return "";

  const [hours, minutes] = parts;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getClosureMessageForDate(clinic: Clinic, date: Date): string | null {
  const dateValue = toDateInputValue(date);

  if (
    (dateValue === toDateInputValue() && isEnabledFlag(clinic.is_blocked_today)) ||
    clinic.blocked_dates?.some((blockedDate) => blockedDate.date === dateValue)
  ) {
    return "Clinic is unavailable on the selected date.";
  }

  const schedule = findScheduleForDate(clinic, date);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

  if (schedule) {
    return isEnabledFlag(schedule.is_working)
      ? null
      : `Clinic is closed on ${dayName}.`;
  }

  return isOperatingFromSummary(clinic, date)
    ? null
    : `Clinic is closed on ${dayName}.`;
}

function getScheduleHoursForDate(
  clinic: Clinic,
  date: Date
): { openTime: string | null | undefined; closeTime: string | null | undefined } {
  const schedule = findScheduleForDate(clinic, date);
  const isToday = toDateInputValue(date) === toDateInputValue();

  return {
    openTime:
      schedule?.opening_time ||
      (isToday ? clinic.today_opening_time : null) ||
      clinic.opening_time,
    closeTime:
      schedule?.closing_time ||
      (isToday ? clinic.today_closing_time : null) ||
      clinic.closing_time,
  };
}

function getAppointmentScheduleMessage(
  clinic: Clinic,
  dateValue: string,
  timeValue: string
): string | null {
  const date = parseDateInputValue(dateValue);
  if (!date) return "Please select a valid appointment date.";

  const closureMessage = getClosureMessageForDate(clinic, date);
  if (closureMessage) return closureMessage;

  const { openTime, closeTime } = getScheduleHoursForDate(clinic, date);
  const openParts = parseClockTime(openTime);
  const closeParts = parseClockTime(closeTime);
  const selectedParts = parseClockTime(timeValue);

  if (!openParts || !closeParts || !selectedParts) {
    return "Clinic hours are not available for the selected date.";
  }

  const selectedMinutes = selectedParts[0] * 60 + selectedParts[1];
  const openMinutes = openParts[0] * 60 + openParts[1];
  const closeMinutes = closeParts[0] * 60 + closeParts[1];

  if (selectedMinutes < openMinutes || selectedMinutes >= closeMinutes) {
    return `Please choose a time between ${formatClockTime(openTime)} and ${formatClockTime(closeTime)}.`;
  }

  return null;
}

function isClinicOpenNow(clinic: Clinic, now: Date = new Date()): boolean {
  const todayDate = clinic.clinic_today || toDateInputValue(now);

  if (
    isEnabledFlag(clinic.is_blocked_today) ||
    clinic.blocked_dates?.some((blockedDate) => blockedDate.date === todayDate)
  ) {
    return false;
  }

  if (getClosureMessageForDate(clinic, now)) {
    return false;
  }

  const { openTime, closeTime } = getScheduleHoursForDate(clinic, now);
  const openParts = parseClockTime(openTime);
  const closeParts = parseClockTime(closeTime);

  if (!openParts || !closeParts) return false;

  const [openH, openM] = openParts;
  const [closeH, closeM] = closeParts;

  const openDate = new Date(now);
  openDate.setHours(openH, openM, 0, 0);

  const closeDate = new Date(now);
  closeDate.setHours(closeH, closeM, 0, 0);

  const localOpenNow = now >= openDate && now < closeDate;

  if (clinic.weekly_schedule?.length || clinic.blocked_dates?.length) {
    return localOpenNow;
  }

  if (clinic.is_open_now !== undefined && clinic.is_open_now !== null) {
    return isEnabledFlag(clinic.is_open_now);
  }

  return localOpenNow;
}

function MapFlyTo({
  center,
  zoom,
}: {
  center: [number, number] | null;
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, map]);

  return null;
}

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
  const [statusTick, setStatusTick] = useState(() => Date.now());

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [highlightLocation, setHighlightLocation] = useState(false);
  const [mapTarget, setMapTarget] = useState<[number, number] | null>(null);

  const [booking, setBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");

  const [selectedClinic, setSelectedClinic] = useState<ClinicWithDistance | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [purpose, setPurpose] = useState("Clinic Booking");
  const [symptoms, setSymptoms] = useState("");
  const [patientNote, setPatientNote] = useState("");
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successPopupMessage, setSuccessPopupMessage] = useState("");

  const fetchClinics = useCallback(async (searchOverride = search) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (searchOverride) params.append("search", searchOverride);
      if (specialization !== "All") params.append("specialization", specialization);
      if (openNow) params.append("openNow", "true");

      const res = await fetch(`http://localhost:5000/api/clinics?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error("Failed to fetch clinics");
      }

      const clinicRows: Clinic[] = Array.isArray(result) ? result : [];
      const clinicsWithSchedules = await Promise.all(
        clinicRows.map(loadClinicScheduleSnapshot)
      );
      const statusNow = new Date();

      setStatusTick(statusNow.getTime());
      setClinics(
        openNow
          ? clinicsWithSchedules.filter((clinic) =>
              isClinicOpenNow(clinic, statusNow)
            )
          : clinicsWithSchedules
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [openNow, search, specialization]);

  useEffect(() => {
    void fetchClinics();
  }, [fetchClinics]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusTick(Date.now());
      void fetchClinics();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [fetchClinics]);

  useEffect(() => {
    const handleFocus = () => {
      setStatusTick(Date.now());
      void fetchClinics();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchClinics]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this browser.");
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(coords);
        setHighlightLocation(true);
        setMapTarget([coords.lat, coords.lng]);
        setLocating(false);

        setTimeout(() => {
          setHighlightLocation(false);
        }, 3000);
      },
      () => {
        setError("Unable to get your location.");
        setLocating(false);
      }
    );
  };

  const handleHighlightMyLocation = () => {
    if (!userLocation) {
      requestLocation();
      return;
    }

    setHighlightLocation(true);
    setMapTarget([userLocation.lat, userLocation.lng]);

    setTimeout(() => {
      setHighlightLocation(false);
    }, 3000);
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

  const clinicsWithDistance = useMemo<ClinicWithDistance[]>(() => {
    const statusNow = new Date(statusTick);

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
        isOpenNow: isClinicOpenNow(clinic, statusNow),
      };
    });
  }, [clinics, userLocation, statusTick]);

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

    const plusThirty = new Date(Date.now() + 30 * 60 * 1000);
    setAppointmentDate(toDateInputValue(plusThirty));
    setAppointmentTime(toTimeInputValue(plusThirty));

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

  if (!currentUser?.id) {
    setBookingMessage("No logged-in user found.");
    return;
  }

  if (!appointmentDate || !appointmentTime) {
    setBookingMessage("Please select appointment date and time.");
    return;
  }

  if (isPastAppointmentTime(appointmentDate, appointmentTime)) {
    setBookingMessage("Please choose a future date and time.");
    return;
  }

  const scheduleMessage = getAppointmentScheduleMessage(
    selectedClinic,
    appointmentDate,
    appointmentTime
  );

  if (scheduleMessage) {
    setBookingMessage(scheduleMessage);
    return;
  }

  try {
    setBooking(true);
    setBookingMessage("");

    const user_id = currentUser.id;
    const patient_name_snapshot = currentUser.full_name || currentUser.name || "";
    const patient_phone_snapshot = currentUser.phone || "";

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
console.log("BOOK STATUS:", res.status);
console.log("BOOK RESPONSE:", result);

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

  const renderStars = () => {
    return (
      <div className="fc-stars">
        <span>★</span>
        <span>★</span>
        <span>★</span>
        <span>★</span>
        <span className="fc-star-faded">★</span>
      </div>
    );
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
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search clinics..."
        onSearchSubmit={(value) => fetchClinics(value)}
      />

      <div className="findclinic-content">
        <main className="findclinic-main">
          <h1 className="fc-title">Find Clinic</h1>
          <p className="fc-sub">Calculate your Body Mass Index</p>

          <div className="fc-search-wrap">
            <div className="fc-search-bar">
              <div className="fc-search-field fc-search-location">
                <span className="fc-search-icon">
                  <Search size={18} strokeWidth={2.2} />
                </span>
                <input
                  type="text"
                  placeholder="Bacoor"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="fc-search-field fc-search-select">
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                >
                  <option value="All">Category: All</option>
                  <option value="general">Category: General</option>
                  <option value="dental">Category: Dental</option>
                </select>
                <ChevronDown size={14} className="fc-select-arrow" />
              </div>

              <div className="fc-search-field fc-search-select">
                <select
                  value={openNow ? "open" : "all"}
                  onChange={(e) => setOpenNow(e.target.value === "open")}
                >
                  <option value="all">Distance: Within 20 km</option>
                  <option value="open">Open Now</option>
                </select>
                <ChevronDown size={14} className="fc-select-arrow" />
              </div>

              <button type="button" className="fc-search-btn" onClick={() => fetchClinics()}>
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          <div className="fc-filters">
            <button type="button" className="fc-filter-chip fc-filter-chip-cost">
              <MapPin size={14} strokeWidth={2.2} />
              <span>Cost</span>
              <ChevronDown size={12} strokeWidth={2.2} />
            </button>

            <button type="button" className="fc-filter-chip fc-filter-chip-rating">
              <Star size={14} strokeWidth={2.2} />
              <span>Rating</span>
            </button>

            <button
              type="button"
              className={`fc-filter-chip fc-filter-chip-open ${openNow ? "active" : ""}`}
              onClick={() => setOpenNow((prev) => !prev)}
            >
              <Circle size={14} strokeWidth={2.2} />
              <span>Open Now</span>
            </button>

            <button type="button" className="fc-filter-chip fc-filter-chip-offers">
              <Gift size={14} strokeWidth={2.2} />
              <span>Offers</span>
            </button>

            <button
              type="button"
              className={`fc-filter-chip fc-highlight-location-btn ${
                highlightLocation ? "active" : ""
              }`}
              onClick={handleHighlightMyLocation}
              disabled={locating}
            >
              <LocateFixed size={14} strokeWidth={2.2} />
              <span>{locating ? "Locating..." : "My Location"}</span>
            </button>
          </div>

          {error && <p className="fc-message fc-message-error">{error}</p>}
          {bookingMessage && <p className="fc-message fc-message-success">{bookingMessage}</p>}

          <div className="fc-layout">
            <div className="fc-list">
              {sortedClinics.map((clinic, index) => {
                const isNearest = nearestClinic?.id === clinic.id;
                const showImageCard = index === 3;

                return (
                  <div
                    className={`fc-card ${showImageCard ? "fc-card-with-image" : ""} ${
                      isNearest ? "fc-card-nearest" : ""
                    }`}
                    key={clinic.id}
                  >
                    <div className="fc-card-left">
                      {showImageCard && (
                        <div className="fc-card-thumb">
                          <img
                            src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80"
                            alt={clinic.clinic_name}
                          />
                        </div>
                      )}

                      <div className="fc-card-body">
                        <h3>
                          {clinic.clinic_name}
                          {isNearest && <span className="fc-nearest-badge">Nearest</span>}
                        </h3>

                        <div className="fc-card-pricing">
                          <span>$ -PPP</span>
                          <span>₱PP</span>
                          <span>₱₱20.00</span>
                        </div>

                        <div className="fc-card-address">
                          <MapPin size={15} />
                          <span>{clinic.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="fc-card-right">
                      <div className="fc-card-rating">{renderStars()}</div>

                      <div className="fc-card-distance">
                        {clinic.distanceKm !== null
                          ? `${clinic.distanceKm.toFixed(1)} km`
                          : "2.5 km"}
                      </div>

                     <button
  type="button"
  className="fc-book-btn"
  disabled={
    !clinic.isOpenNow ||
    booking ||
    clinic.status !== "approved" ||
    clinic.account_status !== "active"
  }
  onClick={() => openBookingModal(clinic)}
>
  {clinic.status !== "approved" || clinic.account_status !== "active"
    ? "Unavailable"
    : clinic.isOpenNow
    ? "Book Now"
    : "Closed"}
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
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: "100%", minHeight: "590px", width: "100%" }}
              >
                <MapFlyTo center={mapTarget} zoom={16} />

                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {userLocation && (
                  <Marker
                    position={[userLocation.lat, userLocation.lng]}
                    icon={highlightLocation ? highlightedUserIcon : undefined}
                  >
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
            <span>|</span>
            <span>Contact</span>
            <span>|</span>
            <span>Privacy Policy</span>
            <span>|</span>
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
                    min={toDateInputValue()}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                  />
                </div>

                <div className="fc-modal-field">
                  <label>Time</label>
                  <input
                    type="time"
                    value={appointmentTime}
                    min={getMinimumTimeForDate(appointmentDate)}
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
        <div
          className="fc-success-overlay"
          onClick={() => setShowSuccessPopup(false)}
        >
          <div
            className="fc-success-card"
            onClick={(e) => e.stopPropagation()}
          >
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
