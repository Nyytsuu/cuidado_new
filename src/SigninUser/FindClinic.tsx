import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  MapPin,
  Star,
  Circle,
  Gift,
  ChevronDown,
  LocateFixed,
  CalendarDays,
  Clock3,
  UserRound,
  Phone,
  Mail,
  ClipboardList,
  CheckCircle2,
  Building2,
} from "lucide-react";
import UserSidebar from "../Categories/UserSidebar";
import { apiUrl } from "../sharedBackendFetch";
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
  average_rating?: number | string | null;
  rating?: number | string | null;
  rating_count?: number | string | null;
  review_count?: number | string | null;
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

type ClinicService = {
  id: number;
  name: string;
  description?: string | null;
  price?: string | number | null;
  duration_minutes?: number | string | null;
  is_active?: number | boolean;
};

type ClinicReview = {
  id: number;
  appointment_id?: number;
  user_id?: number;
  rating: number | string;
  feedback?: string | null;
  clinic_reply?: string | null;
  clinic_reply_updated_at?: string | null;
  reviewer_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CurrentUser = {
  id?: number;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
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

function normalizePhilippineMobileInput(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits === "0" || digits === "6" || digits === "63") {
    return digits;
  }

  if (digits.startsWith("09")) {
    return digits.slice(0, 11);
  }

  if (digits.startsWith("639")) {
    return `0${digits.slice(2, 12)}`;
  }

  if (digits.startsWith("9")) {
    return `09${digits.slice(1, 10)}`;
  }

  if (digits.startsWith("0")) {
    return "0";
  }

  if (digits.startsWith("6")) {
    return "6";
  }

  return "";
}

function toPhilippineLocalMobileNumber(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("639")) {
    return `0${digits.slice(2, 12)}`;
  }

  return digits.slice(0, 11);
}

function isValidPhilippineMobileNumber(value: string): boolean {
  return /^09\d{9}$/.test(toPhilippineLocalMobileNumber(value));
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
      apiUrl(`/api/clinic/schedule?clinic_id=${clinic.id}`),
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

function formatReviewDate(value: string | null | undefined): string {
  if (!value) return "Recent";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatServicePrice(value: string | number | null | undefined): string {
  const amount = Number(value || 0);
  return amount > 0 ? `PHP ${amount.toFixed(2)}` : "No listed fee";
}

function formatServiceDuration(value: string | number | null | undefined): string {
  const minutes = Number(value || 0);
  return minutes > 0 ? `${minutes} min` : "Duration varies";
}

function formatClinicLabel(value: string | null | undefined): string {
  const cleaned = String(value || "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getClinicDescription(clinic: Clinic): string {
  const specialization = formatClinicLabel(clinic.specialization);
  const services = formatClinicLabel(clinic.services_offered);

  if (specialization && services && specialization.toLowerCase() !== services.toLowerCase()) {
    return `${specialization} clinic offering ${services} services.`;
  }

  if (specialization) {
    return `${specialization} clinic available for appointment requests.`;
  }

  if (services) {
    return `Clinic offering ${services} services.`;
  }

  return "Approved clinic available for appointment requests.";
}

function getClinicDistanceLabel(
  clinic: ClinicWithDistance,
  hasUserLocation: boolean
): string {
  if (clinic.distanceKm !== null) {
    return `${clinic.distanceKm.toFixed(1)} km away`;
  }

  return hasUserLocation ? "Calculating distance" : "Use My Location";
}

function getClinicRatingSummary(clinic: Clinic): {
  score: number | null;
  countLabel: string;
} {
  const rawScore = clinic.average_rating ?? clinic.rating;
  const score = Number(rawScore);
  const rawCount = clinic.rating_count ?? clinic.review_count;
  const count = Number(rawCount);

  return {
    score: Number.isFinite(score) && score > 0 ? Math.min(5, Math.max(0, score)) : null,
    countLabel:
      Number.isFinite(count) && count > 0
        ? `${count} ${count === 1 ? "rating" : "ratings"}`
        : "No ratings yet",
  };
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
  const [purpose, setPurpose] = useState("General consultation");
  const [symptoms, setSymptoms] = useState("");
  const [patientNote, setPatientNote] = useState("");
  const [clinicServices, setClinicServices] = useState<ClinicService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [loadingClinicServices, setLoadingClinicServices] = useState(false);
  const [profileClinic, setProfileClinic] = useState<ClinicWithDistance | null>(null);
  const [profileServices, setProfileServices] = useState<ClinicService[]>([]);
  const [profileReviews, setProfileReviews] = useState<ClinicReview[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const currentUser = useMemo<CurrentUser | null>(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? (JSON.parse(storedUser) as CurrentUser) : null;
    } catch (err) {
      console.error("Find clinic user parse error:", err);
      return null;
    }
  }, []);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successPopupMessage, setSuccessPopupMessage] = useState("");

  // "Who is this for?" toggle
  const [bookingForSelf, setBookingForSelf] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const clinicFetchIdRef = useRef(0);

  const fetchClinics = useCallback(async (searchOverride = search) => {
    const fetchId = ++clinicFetchIdRef.current;

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      const searchQuery = searchOverride.trim();
      if (searchQuery) params.append("search", searchQuery);
      if (specialization !== "All") params.append("specialization", specialization);
      if (openNow) params.append("openNow", "true");

      const res = await fetch(apiUrl(`/api/clinics?${params.toString()}`), {
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

      if (fetchId !== clinicFetchIdRef.current) {
        return;
      }

      setStatusTick(statusNow.getTime());
      setClinics(
        openNow
          ? clinicsWithSchedules.filter((clinic) =>
              isClinicOpenNow(clinic, statusNow)
            )
          : clinicsWithSchedules
      );
    } catch (err) {
      if (fetchId === clinicFetchIdRef.current) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      if (fetchId === clinicFetchIdRef.current) {
        setLoading(false);
      }
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

  useEffect(() => {
    if (!showBookingModal || !selectedClinic?.id) {
      setClinicServices([]);
      setSelectedServiceId("");
      setLoadingClinicServices(false);
      return;
    }

    let cancelled = false;

    const loadClinicServices = async () => {
      try {
        setLoadingClinicServices(true);
        const res = await fetch(
          apiUrl(`/api/clinic/services?clinic_id=${selectedClinic.id}`),
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => []);

        if (!res.ok) {
          throw new Error("Failed to load clinic services");
        }

        const activeServices = Array.isArray(data)
          ? data.filter((service: ClinicService) => isEnabledFlag(service.is_active))
          : [];

        if (!cancelled) {
          setClinicServices(activeServices);
          setSelectedServiceId(
            activeServices.length > 0 ? String(activeServices[0].id) : ""
          );
        }
      } catch (err) {
        console.error("Clinic services load error:", err);
        if (!cancelled) {
          setClinicServices([]);
          setSelectedServiceId("");
        }
      } finally {
        if (!cancelled) {
          setLoadingClinicServices(false);
        }
      }
    };

    void loadClinicServices();

    return () => {
      cancelled = true;
    };
  }, [showBookingModal, selectedClinic?.id]);

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

  const selectedAppointmentDate = appointmentDate
    ? parseDateInputValue(appointmentDate)
    : null;
  const selectedClinicHours =
    selectedClinic && selectedAppointmentDate
      ? getScheduleHoursForDate(selectedClinic, selectedAppointmentDate)
      : null;
  const selectedClinicHoursLabel =
    selectedClinicHours?.openTime && selectedClinicHours?.closeTime
      ? `${formatClockTime(selectedClinicHours.openTime)} - ${formatClockTime(
          selectedClinicHours.closeTime
        )}`
      : "Hours not available";
  const appointmentValidationMessage =
    selectedClinic && appointmentDate && appointmentTime
      ? isPastAppointmentTime(appointmentDate, appointmentTime)
        ? "Please choose a future date and time."
        : getAppointmentScheduleMessage(
            selectedClinic,
            appointmentDate,
            appointmentTime
          )
      : null;
  const selectedDateLabel = selectedAppointmentDate
    ? selectedAppointmentDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Select a date";
  const selectedTimeLabel = appointmentTime || "Select a time";
  const selectedClinicService =
    clinicServices.find((service) => String(service.id) === selectedServiceId) ||
    null;
  const selectedClinicRating = selectedClinic
    ? getClinicRatingSummary(selectedClinic)
    : null;
  const profileClinicRating = profileClinic
    ? getClinicRatingSummary(profileClinic)
    : null;
  const patientDisplayName =
    currentUser?.full_name || currentUser?.name || "Not provided";
  const patientDisplayPhone = currentUser?.phone || "Not provided";
  const patientDisplayEmail = currentUser?.email || "Not provided";

  const openClinicProfile = async (clinic: ClinicWithDistance) => {
    setProfileClinic(clinic);
    setProfileServices([]);
    setProfileReviews([]);
    setProfileError("");
    setProfileLoading(true);

    try {
      const [servicesRes, feedbackRes] = await Promise.all([
        fetch(apiUrl(`/api/clinic/services?clinic_id=${clinic.id}`), {
          cache: "no-store",
        }),
        fetch(apiUrl(`/api/clinic-feedback?clinic_id=${clinic.id}`), {
          cache: "no-store",
        }),
      ]);

      const servicesData = await servicesRes.json().catch(() => []);
      const feedbackData = await feedbackRes.json().catch(() => ({}));

      if (servicesRes.ok && Array.isArray(servicesData)) {
        setProfileServices(
          servicesData.filter((service: ClinicService) =>
            isEnabledFlag(service.is_active)
          )
        );
      }

      if (feedbackRes.ok) {
        setProfileReviews(
          Array.isArray(feedbackData.reviews) ? feedbackData.reviews : []
        );

        setProfileClinic((current) =>
          current?.id === clinic.id
            ? {
                ...current,
                average_rating: feedbackData.average_rating ?? current.average_rating,
                rating_count: feedbackData.rating_count ?? current.rating_count,
              }
            : current
        );
      }
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Failed to load clinic profile."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const closeClinicProfile = () => {
    setProfileClinic(null);
    setProfileServices([]);
    setProfileReviews([]);
    setProfileError("");
    setProfileLoading(false);
  };

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

    setPurpose("General consultation");
    setSymptoms("");
    setPatientNote("");
    setClinicServices([]);
    setSelectedServiceId("");
    setBookingForSelf(true);
    setGuestName("");
    setGuestPhone("");
  };

  const closeBookingModal = () => {
    if (booking) return;
    setShowBookingModal(false);
    setSelectedClinic(null);
    setClinicServices([]);
    setSelectedServiceId("");
    setBookingMessage("");
    setBookingForSelf(true);
    setGuestName("");
    setGuestPhone("");
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

    if (!purpose.trim()) {
      setBookingMessage("Please choose the purpose of the visit.");
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

      // If booking for someone else, use the typed-in guest details;
      // otherwise fall back to the logged-in user's account info.
      const patient_name_snapshot = bookingForSelf
        ? (currentUser.full_name || currentUser.name || "")
        : guestName.trim();
      const patient_phone_snapshot = bookingForSelf
        ? (currentUser.phone || "")
        : guestPhone.trim();

      if (!bookingForSelf && !patient_name_snapshot) {
        setBookingMessage("Please enter the patient's name.");
        setBooking(false);
        return;
      }

      if (
        !bookingForSelf &&
        !isValidPhilippineMobileNumber(patient_phone_snapshot)
      ) {
        setBookingMessage("Please enter a valid Philippine mobile number starting with 09 or 63, e.g. 09171234567.");
        setBooking(false);
        return;
      }

      const start_at = `${appointmentDate} ${appointmentTime}:00`;

      const startDateObj = new Date(`${appointmentDate}T${appointmentTime}:00`);
      const endDateObj = new Date(startDateObj.getTime() + 30 * 60 * 1000);
      const end_at = `${endDateObj.getFullYear()}-${String(
        endDateObj.getMonth() + 1
      ).padStart(2, "0")}-${String(endDateObj.getDate()).padStart(
        2,
        "0"
      )} ${String(endDateObj.getHours()).padStart(2, "0")}:${String(
        endDateObj.getMinutes()
      ).padStart(2, "0")}:00`;
      const selectedServicePayload = selectedClinicService
        ? [
            {
              service_id: selectedClinicService.id,
              service_name_snapshot: selectedClinicService.name,
              price_snapshot: Number(selectedClinicService.price || 0),
              duration_minutes_snapshot: Number(
                selectedClinicService.duration_minutes || 0
              ),
              description: selectedClinicService.description || null,
            },
          ]
        : [];

      const res = await fetch(apiUrl("/api/appointments/book"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id,
          clinic_id: selectedClinic.id,
          start_at,
          end_at,
          purpose: purpose.trim(),
          symptoms: symptoms.trim(),
          patient_note: patientNote.trim(),
          patient_name_snapshot,
          patient_phone_snapshot,
          clinic_name_snapshot: selectedClinic.clinic_name,
          services: selectedServicePayload,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        const detail = result.error_detail ? ` (${result.error_detail})` : "";
        throw new Error((result.message || "Failed to book appointment") + detail);
      }

      const clinicName = selectedClinic.clinic_name;

      setShowBookingModal(false);
      setSelectedClinic(null);
      setClinicServices([]);
      setSelectedServiceId("");

      setSuccessPopupMessage(
        `Your appointment request with ${clinicName} was sent successfully.`
      );
      setShowSuccessPopup(true);

      setAppointmentDate("");
      setAppointmentTime("");
      setPurpose("General consultation");
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
          <p className="fc-sub">
            Search nearby approved clinics and request an appointment.
          </p>

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
          </div>

          {error && <p className="fc-message fc-message-error">{error}</p>}
          {bookingMessage && !showBookingModal && (
            <p className="fc-message fc-message-success">{bookingMessage}</p>
          )}

          <div className="fc-layout">
            <div className="fc-list">
              {sortedClinics.map((clinic, index) => {
                const isNearest = nearestClinic?.id === clinic.id;
                const showImageCard = index === 3;
                const ratingSummary = getClinicRatingSummary(clinic);

                return (
                  <div
                    className={`fc-card ${showImageCard ? "fc-card-with-image" : ""} ${
                      isNearest ? "fc-card-nearest" : ""
                    }`}
                    key={clinic.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openClinicProfile(clinic)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openClinicProfile(clinic);
                      }
                    }}
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

                      {!showImageCard && (
                        <div className="fc-card-clinic-icon" aria-hidden="true">
                          <Building2 size={32} strokeWidth={1.9} />
                        </div>
                      )}

                      <div className="fc-card-body">
                        <h3>
                          {clinic.clinic_name}
                          {isNearest && <span className="fc-nearest-badge">Nearest</span>}
                        </h3>

                        <p className="fc-card-description">
                          {getClinicDescription(clinic)}
                        </p>

                        <div className="fc-card-address">
                          <MapPin size={15} />
                          <span>{clinic.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="fc-card-right">
                      <div className="fc-card-rating">
                        {renderStars()}
                        <span className="fc-rating-count">
                          {ratingSummary.score
                            ? `${ratingSummary.score.toFixed(1)} (${ratingSummary.countLabel})`
                            : ratingSummary.countLabel}
                        </span>
                      </div>

                      <div className="fc-card-distance">
                        {getClinicDistanceLabel(clinic, Boolean(userLocation))}
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
                        onClick={(event) => {
                          event.stopPropagation();
                          openBookingModal(clinic);
                        }}
                      >
                        {clinic.status !== "approved" ||
                        clinic.account_status !== "active"
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
              <div>
                <p className="fc-modal-eyebrow">Appointment request</p>
                <h2>{selectedClinic.clinic_name}</h2>
              </div>
              <button
                type="button"
                className="fc-modal-close"
                onClick={closeBookingModal}
                disabled={booking}
                aria-label="Close booking modal"
              >
                x
              </button>
            </div>

            <div className="fc-modal-body">
              <section className="fc-modal-clinic-card">
                <div className="fc-modal-clinic-main">
                  <span
                    className={`fc-status-pill ${
                      selectedClinic.isOpenNow ? "open" : "closed"
                    }`}
                  >
                    {selectedClinic.isOpenNow ? "Open now" : "Closed"}
                  </span>

                  <p className="fc-modal-address">
                    <MapPin size={16} />
                    <span>{selectedClinic.address}</span>
                  </p>

                  <p className="fc-modal-description">
                    {getClinicDescription(selectedClinic)}
                  </p>

                  <div className="fc-modal-meta-grid">
                    <span>
                      <Clock3 size={15} />
                      Selected day: {selectedClinicHoursLabel}
                    </span>
                    <span>
                      <MapPin size={15} />
                      {getClinicDistanceLabel(selectedClinic, Boolean(userLocation))}
                    </span>
                    <span>
                      <Star size={15} fill="currentColor" />
                      {selectedClinicRating?.score
                        ? `${selectedClinicRating.score.toFixed(1)} / 5`
                        : selectedClinicRating?.countLabel || "No ratings yet"}
                    </span>
                  </div>
                </div>

                <div className="fc-modal-service-tags">
                  {selectedClinic.specialization && (
                    <span>{selectedClinic.specialization}</span>
                  )}
                  {selectedClinic.services_offered && (
                    <span>{selectedClinic.services_offered}</span>
                  )}
                </div>
              </section>

              {bookingMessage && (
                <div className="fc-modal-alert error">{bookingMessage}</div>
              )}

              {appointmentValidationMessage && (
                <div className="fc-modal-alert warning">
                  {appointmentValidationMessage}
                </div>
              )}

              <div className="fc-modal-columns">
                <section className="fc-modal-panel">
                  <h3>
                    <CalendarDays size={17} />
                    Appointment details
                  </h3>

                  <div className="fc-modal-grid">
                    <div className="fc-modal-field">
                      <label>Date</label>
                      <input
                        type="date"
                        value={appointmentDate}
                        min={toDateInputValue()}
                        onChange={(e) => {
                          setAppointmentDate(e.target.value);
                          setBookingMessage("");
                        }}
                      />
                    </div>

                    <div className="fc-modal-field">
                      <label>Time</label>
                      <input
                        type="time"
                        value={appointmentTime}
                        min={getMinimumTimeForDate(appointmentDate)}
                        onChange={(e) => {
                          setAppointmentTime(e.target.value);
                          setBookingMessage("");
                        }}
                      />
                    </div>
                  </div>

                  <div className="fc-modal-selected-slot">
                    <span>{selectedDateLabel}</span>
                    <strong>{selectedTimeLabel}</strong>
                    <small>Estimated duration: 30 minutes</small>
                  </div>

                  <div className="fc-modal-field">
                    <label>Clinic service</label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      disabled={loadingClinicServices || clinicServices.length === 0}
                    >
                      <option value="">
                        {loadingClinicServices
                          ? "Loading services..."
                          : clinicServices.length > 0
                          ? "No specific service"
                          : "No services listed yet"}
                      </option>
                      {clinicServices.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedClinicService ? (
                    <div className="fc-service-preview">
                      <ClipboardList size={16} />
                      <span>
                        <strong>{selectedClinicService.name}</strong>
                        <small>
                          {formatServicePrice(selectedClinicService.price)} -{" "}
                          {formatServiceDuration(
                            selectedClinicService.duration_minutes
                          )}
                        </small>
                      </span>
                    </div>
                  ) : (
                    <div className="fc-service-preview muted">
                      <ClipboardList size={16} />
                      <span>
                        <strong>General appointment</strong>
                        <small>The clinic can assign the exact service later.</small>
                      </span>
                    </div>
                  )}

                  <div className="fc-modal-field">
                    <label>Purpose</label>
                    <select
                      value={purpose}
                      onChange={(e) => {
                        setPurpose(e.target.value);
                        setBookingMessage("");
                      }}
                    >
                      <option value="General consultation">
                        General consultation
                      </option>
                      <option value="Follow-up checkup">Follow-up checkup</option>
                      <option value="New symptoms">New symptoms</option>
                      <option value="Medication concern">
                        Medication concern
                      </option>
                      <option value="Clinic service inquiry">
                        Clinic service inquiry
                      </option>
                    </select>
                  </div>
                </section>

                <section className="fc-modal-panel">
                  <h3>
                    <UserRound size={17} />
                    Patient details
                  </h3>

                  {/* WHO IS THIS FOR? toggle */}
                  <div className="fc-for-toggle">
                    <span className="fc-for-label">Who is this for?</span>
                    <div className="fc-for-btns">
                      <button
                        type="button"
                        className={`fc-for-btn ${bookingForSelf ? "active" : ""}`}
                        onClick={() => {
                          setBookingForSelf(true);
                          setGuestName("");
                          setGuestPhone("");
                          setBookingMessage("");
                        }}
                      >
                        Myself
                      </button>
                      <button
                        type="button"
                        className={`fc-for-btn ${!bookingForSelf ? "active" : ""}`}
                        onClick={() => {
                          setBookingForSelf(false);
                          setBookingMessage("");
                        }}
                      >
                        Someone else
                      </button>
                    </div>
                  </div>

                  {/* MYSELF — read-only account info */}
                  {bookingForSelf ? (
                    <div className="fc-patient-summary">
                      <span>
                        <UserRound size={15} />
                        {patientDisplayName}
                      </span>
                      <span>
                        <Phone size={15} />
                        {patientDisplayPhone}
                      </span>
                      <span>
                        <Mail size={15} />
                        {patientDisplayEmail}
                      </span>
                    </div>
                  ) : (
                    /* SOMEONE ELSE — editable fields */
                    <div className="fc-guest-fields">
                      <div className="fc-modal-field">
                        <label>Patient name <span className="fc-required">*</span></label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => {
                            setGuestName(e.target.value);
                            setBookingMessage("");
                          }}
                          placeholder="Full name of the patient"
                        />
                      </div>
                      <div className="fc-modal-field">
                        <label>Contact number</label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={13}
                          pattern="09[0-9]{9}"
                          value={guestPhone}
                          onChange={(e) => {
                            setGuestPhone(normalizePhilippineMobileInput(e.target.value));
                            setBookingMessage("");
                          }}
                          placeholder="09171234567"
                        />
                        <small className="fc-field-hint">
                          Use 09XXXXXXXXX or 639XXXXXXXXX.
                        </small>
                      </div>
                    </div>
                  )}

                  <div className="fc-modal-field">
                    <label>Symptoms</label>
                    <textarea
                      value={symptoms}
                      onChange={(e) => {
                        setSymptoms(e.target.value);
                        setBookingMessage("");
                      }}
                      placeholder="Briefly describe what the patient is feeling"
                      rows={4}
                    />
                  </div>

                  <div className="fc-modal-field">
                    <label>Patient note</label>
                    <textarea
                      value={patientNote}
                      onChange={(e) => {
                        setPatientNote(e.target.value);
                        setBookingMessage("");
                      }}
                      placeholder="Anything the clinic should know before confirming"
                      rows={4}
                    />
                  </div>
                </section>
              </div>
            </div>

            <div className="fc-modal-actions">
              <p>
                This sends a pending request to the clinic. They can still confirm
                or adjust it from their appointment dashboard.
              </p>
              <div className="fc-modal-action-buttons">
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
                  disabled={
                    booking ||
                    !appointmentDate ||
                    !appointmentTime ||
                    Boolean(appointmentValidationMessage)
                  }
                >
                  {booking ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {profileClinic && (
        <div className="fc-modal-overlay" onClick={closeClinicProfile}>
          <div
            className="fc-modal-card fc-profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fc-modal-header fc-profile-header">
              <div>
                <p className="fc-modal-eyebrow">Clinic profile</p>
                <h2>{profileClinic.clinic_name}</h2>
              </div>
              <button
                type="button"
                className="fc-modal-close"
                onClick={closeClinicProfile}
                aria-label="Close clinic profile"
              >
                x
              </button>
            </div>

            <div className="fc-profile-body">
              <section className="fc-profile-hero">
                <div className="fc-profile-icon">
                  <Building2 size={38} strokeWidth={1.8} />
                </div>

                <div className="fc-profile-summary">
                  <span
                    className={`fc-status-pill ${
                      profileClinic.isOpenNow ? "open" : "closed"
                    }`}
                  >
                    {profileClinic.isOpenNow ? "Open now" : "Closed"}
                  </span>
                  <h3>{profileClinic.clinic_name}</h3>
                  <p>{getClinicDescription(profileClinic)}</p>
                  <div className="fc-profile-meta-row">
                    <span>
                      <Star size={16} fill="currentColor" />
                      {profileClinicRating?.score
                        ? `${profileClinicRating.score.toFixed(1)} (${profileClinicRating.countLabel})`
                        : profileClinicRating?.countLabel || "No ratings yet"}
                    </span>
                    <span>
                      <MapPin size={16} />
                      {getClinicDistanceLabel(profileClinic, Boolean(userLocation))}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="fc-modal-btn primary fc-profile-book-btn"
                  disabled={
                    !profileClinic.isOpenNow ||
                    profileClinic.status !== "approved" ||
                    profileClinic.account_status !== "active"
                  }
                  onClick={() => {
                    const clinic = profileClinic;
                    closeClinicProfile();
                    openBookingModal(clinic);
                  }}
                >
                  {profileClinic.isOpenNow ? "Book Appointment" : "Clinic Closed"}
                </button>
              </section>

              {profileError && (
                <div className="fc-modal-alert error">{profileError}</div>
              )}

              {profileLoading ? (
                <div className="fc-profile-loading">Loading clinic details...</div>
              ) : (
                <div className="fc-profile-grid">
                  <section className="fc-profile-panel">
                    <h3>Clinic Details</h3>
                    <div className="fc-profile-detail-list">
                      <span>
                        <MapPin size={16} />
                        <strong>{profileClinic.address || "Address not provided"}</strong>
                      </span>
                      <span>
                        <Phone size={16} />
                        <strong>{profileClinic.phone || "Phone not provided"}</strong>
                      </span>
                      <span>
                        <Mail size={16} />
                        <strong>{profileClinic.email || "Email not provided"}</strong>
                      </span>
                      <span>
                        <Clock3 size={16} />
                        <strong>
                          {profileClinic.opening_time && profileClinic.closing_time
                            ? `${formatClockTime(
                                profileClinic.opening_time
                              )} - ${formatClockTime(profileClinic.closing_time)}`
                            : "Hours not provided"}
                        </strong>
                      </span>
                    </div>
                  </section>

                  <section className="fc-profile-panel">
                    <h3>Available Services</h3>
                    {profileServices.length > 0 ? (
                      <div className="fc-profile-services">
                        {profileServices.slice(0, 8).map((service) => (
                          <span key={service.id}>
                            <ClipboardList size={14} />
                            {service.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="fc-profile-muted">
                        This clinic has not listed active services yet.
                      </p>
                    )}
                  </section>
                </div>
              )}

              <section className="fc-profile-panel fc-profile-reviews">
                <div className="fc-profile-section-head">
                  <h3>Patient Reviews</h3>
                  <span>
                    {profileClinicRating?.countLabel || "No ratings yet"}
                  </span>
                </div>

                {profileReviews.length > 0 ? (
                  <div className="fc-profile-review-list">
                    {profileReviews.map((review) => (
                      <article className="fc-profile-review" key={review.id}>
                        <div>
                          <strong>{review.reviewer_name || "Cuidado user"}</strong>
                          <span>
                            {formatReviewDate(
                              review.updated_at || review.created_at
                            )}
                          </span>
                        </div>
                        <p className="fc-profile-review-rating">
                          {Number(review.rating).toFixed(0)} / 5
                        </p>
                        {review.feedback && <p>{review.feedback}</p>}
                        {review.clinic_reply && (
                          <div className="fc-profile-clinic-reply">
                            <div>
                              <strong>Clinic response</strong>
                              <span>
                                {formatReviewDate(
                                  review.clinic_reply_updated_at ||
                                    review.updated_at ||
                                    review.created_at
                                )}
                              </span>
                            </div>
                            <p>{review.clinic_reply}</p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="fc-profile-empty-reviews">
                    No patient reviews yet. Completed appointments can leave a
                    rating after the visit.
                  </div>
                )}
              </section>
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
            <div className="fc-success-icon">
              <CheckCircle2 size={52} strokeWidth={2.4} />
            </div>
            <h3>Request Sent</h3>
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
