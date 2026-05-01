import { useMemo, useState, useEffect } from "react";
import UserSidebar from "../Categories/UserSidebar";
import "./BMICalculator.css";

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

type Clinic = {
  id: number;
  clinic_name: string;
  email?: string | null;
  address?: string | null;
  location_text?: string | null;
  phone?: string | null;
  specialization?: string | null;
  services_offered?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  operating_days?: string | null;
  status?: string | null;
  account_status?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  is_blocked_today?: number | boolean;
  today_opening_time?: string | null;
  today_closing_time?: string | null;
  weekly_schedule?: WeeklyScheduleDay[];
  blocked_dates?: BlockedDate[];
};

type ClinicService = {
  id: number;
  name: string;
  description?: string | null;
  price?: number | string | null;
  duration_minutes?: number | string | null;
  is_active: number;
};

type ClinicProfile = Clinic & {
  years_operation?: number | null;
  location_text?: string | null;
  services?: ClinicService[];
};

type CurrentUser = {
  id?: number;
  full_name?: string;
  name?: string;
  phone?: string;
};

const API = "http://localhost:5000/api";

function getStoredCurrentUser(): CurrentUser | null {
  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? (JSON.parse(storedUser) as CurrentUser) : null;
  } catch {
    return null;
  }
}

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

function addMinutes(date: string, time: string, minutes: number): string {
  const base = new Date(`${date}T${time}:00`);
  base.setMinutes(base.getMinutes() + minutes);

  const yyyy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  const hh = String(base.getHours()).padStart(2, "0");
  const min = String(base.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
}

function getMinimumTimeForDate(date: string): string | undefined {
  return date === toDateInputValue() ? toTimeInputValue() : undefined;
}

function isPastAppointmentTime(date: string, time: string): boolean {
  const selected = new Date(`${date}T${time}:00`);
  return Number.isNaN(selected.getTime()) || selected.getTime() <= Date.now();
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

function toTimeLabel(value?: string | null): string {
  const match = String(value || "").match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "Not set";
}

function toTitle(value?: string | null): string {
  const text = String(value || "").trim();
  if (!text) return "Not provided";

  return text
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function splitServices(value?: string | null): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function BMICalculator() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [showBmiPopup, setShowBmiPopup] = useState(false);
  const [unit, setUnit] = useState<"Metric" | "Imperial">("Metric");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);
  const [clinicsError, setClinicsError] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile | null>(null);
  const [clinicProfileLoading, setClinicProfileLoading] = useState(false);
  const [clinicProfileError, setClinicProfileError] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [purpose, setPurpose] = useState("BMI consultation");
  const [symptoms, setSymptoms] = useState("");
  const [patientNote, setPatientNote] = useState("");

  useEffect(() => {
    const loadClinics = async () => {
      try {
        setClinicsLoading(true);
        setClinicsError("");

        const res = await fetch(`${API}/clinics`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load clinics.");
        }

        setClinics(Array.isArray(data) ? data : []);
      } catch (err) {
        setClinicsError(
          err instanceof Error ? err.message : "Failed to load clinics."
        );
        setClinics([]);
      } finally {
        setClinicsLoading(false);
      }
    };

    loadClinics();
  }, []);

  const bmiData = useMemo(() => {
  const weightNum = Number(weight);
  const heightNum = Number(height);

  if (!weightNum || !heightNum || weightNum <= 0 || heightNum <= 0) {
    return {
      bmi: null as number | null,
      category: "Enter valid values",
      description: "Please provide valid height and weight values.",
      indicatorPercent: 0,
    };
  }

  let bmi = 0;

  if (unit === "Metric") {
    const heightMeters = heightNum / 100;
    bmi = weightNum / (heightMeters * heightMeters);
  } else {
    bmi = (weightNum / (heightNum * heightNum)) * 703;
  }

  let category = "";
  let description = "";

  if (bmi < 18.5) {
    category = "Underweight";
    description =
      "A BMI below 18.5 is considered underweight. Consider consulting a doctor or nutrition professional.";
  } else if (bmi < 23) {
    category = "Normal";
    description =
      "Your BMI is within the normal range. Maintain a balanced diet and active lifestyle.";
  } else if (bmi < 25) {
    category = "At Risk";
    description =
      "Your BMI is slightly elevated. Consider monitoring your diet and physical activity.";
  } else if (bmi < 30) {
    category = "Overweight";
    description =
      "A BMI between 25 and 29.9 is considered overweight for adults. Consult your doctor for a health assessment.";
  } else {
    category = "Obese";
    description =
      "A BMI of 30 or above may indicate obesity. Consider professional medical advice for a full assessment.";
  }

  const clamped = Math.max(10, Math.min(50, bmi));
  const indicatorPercent = ((clamped - 10) / (50 - 10)) * 100;

  return {
    bmi: Number(bmi.toFixed(1)),
    category,
    description,
    indicatorPercent,
  };
}, [weight, height, unit]);

const bmiCheckupAdvice = useMemo(() => {
  if (bmiData.bmi === null) {
    return {
      title: "Invalid BMI",
      needCheckup: false,
      message: "Please enter valid height and weight values first.",
    };
  }

  if (bmiData.bmi < 18.5) {
    return {
      title: "Underweight",
      needCheckup: true,
      message:
        "Your BMI is below the normal range. A medical check-up is recommended to assess your nutrition and overall health.",
    };
  }

  if (bmiData.bmi < 23) {
    return {
      title: "Normal",
      needCheckup: false,
      message:
        "Your BMI is within the normal range. A routine check-up is still good for preventive care, but there is no urgent BMI-related concern.",
    };
  }

  if (bmiData.bmi < 25) {
    return {
      title: "At Risk",
      needCheckup: true,
      message:
        "Your BMI is slightly above the normal range. A check-up may help you review your weight, diet, and lifestyle early.",
    };
  }

  if (bmiData.bmi < 30) {
    return {
      title: "Overweight",
      needCheckup: true,
      message:
        "Your BMI falls in the overweight range. It is a good idea to schedule a check-up for a health assessment and guidance.",
    };
  }

  return {
    title: "Obese",
    needCheckup: true,
    message:
      "Your BMI is in the obesity range. A medical check-up is strongly recommended for proper evaluation and support.",
  };
}, [bmiData]);

  const displayedClinics = useMemo(() => clinics.slice(0, 4), [clinics]);
  const profileClinic = clinicProfile || selectedClinic;
  const activeServices = useMemo(
    () =>
      (clinicProfile?.services || []).filter(
        (service) => Number(service.is_active) === 1
      ),
    [clinicProfile]
  );
  const selectedService = useMemo(
    () =>
      activeServices.find((service) => String(service.id) === selectedServiceId) ||
      null,
    [activeServices, selectedServiceId]
  );
  const listedServices =
    activeServices.length > 0
      ? activeServices.map((service) => service.name)
      : splitServices(profileClinic?.services_offered).map(toTitle);
  const canBookSelectedClinic =
    (profileClinic?.status || "approved") === "approved" &&
    (profileClinic?.account_status || "active") === "active";

  const openClinicProfile = async (clinic: Clinic) => {
    const currentUser = getStoredCurrentUser();
    const plusThirty = new Date(Date.now() + 30 * 60 * 1000);

    setSelectedClinic(clinic);
    setClinicProfile(null);
    setClinicProfileError("");
    setBookingMessage("");
    setBookingSuccess("");
    setAppointmentDate(toDateInputValue(plusThirty));
    setAppointmentTime(toTimeInputValue(plusThirty));
    setSelectedServiceId("");
    setPatientName(currentUser?.full_name || currentUser?.name || "");
    setPatientPhone(currentUser?.phone || "");
    setPurpose("BMI consultation");
    setSymptoms("");
    setPatientNote(
      bmiData.bmi !== null
        ? `BMI: ${bmiData.bmi} (${bmiData.category})`
        : ""
    );

    try {
      setClinicProfileLoading(true);

      const res = await fetch(`${API}/clinic/profile?clinic_id=${clinic.id}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load clinic profile.");
      }

      const loadedProfile = data as ClinicProfile;
      const firstActiveService = (loadedProfile.services || []).find(
        (service) => Number(service.is_active) === 1
      );

      setClinicProfile({ ...clinic, ...loadedProfile });
      setSelectedServiceId(firstActiveService ? String(firstActiveService.id) : "");
      if (firstActiveService) {
        setPurpose(`BMI consultation - ${firstActiveService.name}`);
      }
    } catch (err) {
      setClinicProfileError(
        err instanceof Error ? err.message : "Failed to load clinic profile."
      );
      setClinicProfile({
        ...clinic,
        services: [],
        location_text: clinic.address || "",
      });
    } finally {
      setClinicProfileLoading(false);
    }
  };

  const closeClinicProfile = () => {
    if (booking) return;

    setSelectedClinic(null);
    setClinicProfile(null);
    setClinicProfileError("");
    setBookingMessage("");
    setBookingSuccess("");
  };

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);

    const service = activeServices.find((item) => String(item.id) === serviceId);
    if (service) {
      setPurpose(`BMI consultation - ${service.name}`);
    } else {
      setPurpose("BMI consultation");
    }
  };

  const handleBookAppointment = async () => {
    if (!profileClinic) return;

    const currentUser = getStoredCurrentUser();

    if (!currentUser?.id) {
      setBookingMessage("No logged-in user found.");
      return;
    }

    if (!canBookSelectedClinic) {
      setBookingMessage("This clinic is not available for booking.");
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
      profileClinic,
      appointmentDate,
      appointmentTime
    );

    if (scheduleMessage) {
      setBookingMessage(scheduleMessage);
      return;
    }

    if (!patientName.trim() || !patientPhone.trim()) {
      setBookingMessage("Please enter your name and phone number.");
      return;
    }

    try {
      setBooking(true);
      setBookingMessage("");
      setBookingSuccess("");

      const durationMinutes = Number(selectedService?.duration_minutes || 30);
      const startAt = `${appointmentDate} ${appointmentTime}:00`;
      const endAt = addMinutes(appointmentDate, appointmentTime, durationMinutes);

      const res = await fetch(`${API}/appointments/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          clinic_id: profileClinic.id,
          start_at: startAt,
          end_at: endAt,
          purpose: purpose || "BMI consultation",
          symptoms,
          patient_note: patientNote,
          patient_name_snapshot: patientName.trim(),
          patient_phone_snapshot: patientPhone.trim(),
          clinic_name_snapshot: profileClinic.clinic_name,
          services: selectedService
            ? [
                {
                  service_id: selectedService.id,
                  service_name_snapshot: selectedService.name,
                  price_snapshot: Number(selectedService.price || 0),
                  duration_minutes_snapshot: Number(
                    selectedService.duration_minutes || 30
                  ),
                  description: selectedService.description || "",
                },
              ]
            : [],
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(result?.message || "Failed to book appointment.");
      }

      setBookingSuccess(
        `Your appointment with ${profileClinic.clinic_name} was booked successfully.`
      );
      setBookingMessage("");
    } catch (err) {
      setBookingMessage(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className={`bmi-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <div className="bmi-content">
        <main className="bmi-main">
          <section className="bmi-top-section">
            <div className="bmi-left-panel">
              <div className="bmi-title-wrap">
                <h1>BMI Calculator</h1>
                <p>Calculate your Body Mass Index</p>
              </div>

              <div className="bmi-card">
                <div className="bmi-unit-toggle">
                  <button
                    type="button"
                    className={unit === "Metric" ? "active" : ""}
                    onClick={() => setUnit("Metric")}
                  >
                    ☰ <span>Metric</span>
                  </button>
                  <button
                    type="button"
                    className={unit === "Imperial" ? "active" : ""}
                    onClick={() => setUnit("Imperial")}
                  >
                    Imperial
                  </button>
                </div>

                <div className="bmi-input-group">
                  <div className="bmi-input-row">
                    <span className="input-icon">👤</span>
                    <input
                      type="text"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                    <span className="label-text">Age</span>
                  </div>

                  <div className="bmi-input-row split">
                    <div className="split-left">
                      <span className="input-icon">🫀</span>
                      <span className="label-text">
                        {unit === "Metric" ? "Weight (kg)" : "Weight (lb)"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                    <span className="unit-text">
                      {unit === "Metric" ? "kg" : "lb"}
                    </span>
                  </div>

                  <div className="bmi-input-row split">
                    <div className="split-left">
                      <span className="input-icon">🧍</span>
                      <span className="label-text">
                        {unit === "Metric" ? "Height (cm)" : "Height (in)"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                    <span className="unit-text">
                      {unit === "Metric" ? "cm" : "in"}
                    </span>
                  </div>
                </div>

                <button type="button" className="bmi-primary-btn" onClick={() => setShowBmiPopup(true)}>
                  Calculate BMI 
                </button>
              </div>

              <div className="bmi-result-card">
                <h2>
                  Your BMI Result:{" "}
                  <span>{bmiData.bmi !== null ? bmiData.bmi : "--"}</span>
                </h2>

                <div className="bmi-scale-wrap">
                  <div className="bmi-scale-bar">
                    <span className="seg blue"></span>
                    <span className="seg teal"></span>
                    <span className="seg green"></span>
                    <span className="seg orange"></span>
                    <span className="seg red"></span>
                    <div
                      className="bmi-indicator"
                      style={{ left: `${bmiData.indicatorPercent}%` }}
                    ></div>
                  </div>

                  <div className="bmi-scale-labels">
                    <span>10</span>
                    <span>18.5</span>
                    <span>22.5</span>
                    <span>25</span>
                    <span>30</span>
                    <span>50</span>
                  </div>

                  <div className="bmi-scale-categories">
                    <span>&lt; 18.5</span>
                    <span>18.5 - 22.9</span>
                    <span>23 - 24.9</span>
                    <span>25 - 29.9</span>
                    <span>30+</span>
                  </div>
                </div>

                <p className="bmi-result-desc">
                  <strong>{bmiData.category}.</strong> {bmiData.description}
                </p>
              </div>

              <div className="bmi-tip-card">
                <div className="tip-icon">🍏</div>
                <p>
                  <strong>Eat a balanced diet</strong> rich in fruits, vegetables,
                  lean proteins, and whole grains. Limit sugary foods and drinks.
                </p>
              </div>
            </div>

            <div className="bmi-right-panel">
              <div className="near-clinic-card only-card">
                <h3>Near Clinics</h3>

                {clinicsLoading ? (
                  <p>Loading clinics...</p>
                ) : clinicsError ? (
                  <p>{clinicsError}</p>
                ) : displayedClinics.length === 0 ? (
                  <p>No clinics found.</p>
                ) : (
                  <div className="clinic-list">
                    {displayedClinics.map((clinic) => (
                      <div key={clinic.id} className="clinic-item">
                        <div className="clinic-left">
                          <div className="clinic-avatar">👨‍⚕️</div>

                          <div className="clinic-info">
                            <h4>{clinic.clinic_name}</h4>
                            <p>{clinic.address || "Address unavailable"}</p>

                            <div className="clinic-meta">
                              <span>📞 {clinic.phone || "No phone available"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="clinic-right">
                          <button
                            type="button"
                            className="near-btn"
                            onClick={() => openClinicProfile(clinic)}
                          >
                            View Clinic
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <footer className="bmi-footer">
            <span>About Us</span>
            <span>|</span>
            <span>Contact</span>
            <span>|</span>
            <span>Privacy Policy</span>
            <span>|</span>
            <span>Terms of Service</span>
            {showBmiPopup && (
  <div className="bmi-popup-overlay" onClick={() => setShowBmiPopup(false)}>
    <div
      className="bmi-popup-card"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="bmi-popup-close"
        onClick={() => setShowBmiPopup(false)}
      >
        ×
      </button>

      <h2>Your BMI Result</h2>

      <div className="bmi-popup-value">
        {bmiData.bmi !== null ? bmiData.bmi : "--"}
      </div>

      <p className="bmi-popup-category">
        <strong>Category:</strong> {bmiCheckupAdvice.title}
      </p>

      <p className="bmi-popup-message">{bmiCheckupAdvice.message}</p>

      <div
        className={`bmi-popup-checkup ${
          bmiCheckupAdvice.needCheckup ? "warning" : "ok"
        }`}
      >
        {bmiCheckupAdvice.needCheckup
          ? "A clinic check-up is recommended."
          : "No urgent check-up needed based on BMI alone."}
      </div>

      <button
        type="button"
        className="bmi-popup-btn"
        onClick={() => setShowBmiPopup(false)}
      >
        OK
      </button>
    </div>
  </div>
)}
          </footer>

          {profileClinic && (
            <div className="clinic-profile-overlay" onClick={closeClinicProfile}>
              <div
                className="clinic-profile-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="bmiClinicProfileTitle"
              >
                <div className="clinic-profile-head">
                  <div className="clinic-profile-title">
                    <div className="clinic-profile-avatar">
                      {profileClinic.clinic_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 id="bmiClinicProfileTitle">{profileClinic.clinic_name}</h2>
                      <p>{toTitle(profileClinic.specialization)}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="clinic-profile-close"
                    onClick={closeClinicProfile}
                    disabled={booking}
                    aria-label="Close clinic profile"
                  >
                    x
                  </button>
                </div>

                {clinicProfileLoading ? (
                  <div className="clinic-profile-loading">Loading clinic profile...</div>
                ) : (
                  <>
                    {clinicProfileError && (
                      <div className="clinic-profile-alert error">
                        {clinicProfileError}
                      </div>
                    )}

                    <div className="clinic-profile-grid">
                      <section className="clinic-profile-panel">
                        <h3>Clinic Details</h3>
                        <div className="clinic-detail-list">
                          <div>
                            <span>Address</span>
                            <strong>
                              {profileClinic.location_text ||
                                profileClinic.address ||
                                "Address unavailable"}
                            </strong>
                          </div>
                          <div>
                            <span>Contact</span>
                            <strong>{profileClinic.phone || "No phone available"}</strong>
                          </div>
                          <div>
                            <span>Email</span>
                            <strong>{profileClinic.email || "No email available"}</strong>
                          </div>
                          <div>
                            <span>Hours</span>
                            <strong>
                              {toTimeLabel(profileClinic.opening_time)} -{" "}
                              {toTimeLabel(profileClinic.closing_time)}
                            </strong>
                          </div>
                          <div>
                            <span>Operating Days</span>
                            <strong>{toTitle(profileClinic.operating_days)}</strong>
                          </div>
                          <div>
                            <span>Status</span>
                            <strong>
                              {toTitle(profileClinic.status)} /{" "}
                              {toTitle(profileClinic.account_status || "active")}
                            </strong>
                          </div>
                        </div>
                      </section>

                      <section className="clinic-profile-panel">
                        <h3>Services</h3>
                        {listedServices.length === 0 ? (
                          <p className="clinic-empty">No services listed yet.</p>
                        ) : (
                          <ul className="clinic-service-list">
                            {listedServices.map((service) => (
                              <li key={service}>{service}</li>
                            ))}
                          </ul>
                        )}
                      </section>
                    </div>

                    <section className="clinic-booking-panel">
                      <div className="clinic-booking-head">
                        <div>
                          <h3>Book Appointment</h3>
                          <p>Choose a future schedule for your BMI consultation.</p>
                        </div>
                      </div>

                      {!canBookSelectedClinic && (
                        <div className="clinic-profile-alert error">
                          This clinic is not available for booking.
                        </div>
                      )}

                      {bookingSuccess && (
                        <div className="clinic-profile-alert success">
                          {bookingSuccess}
                        </div>
                      )}

                      {bookingMessage && (
                        <div className="clinic-profile-alert error">
                          {bookingMessage}
                        </div>
                      )}

                      <div className="clinic-booking-grid">
                        <label>
                          Date
                          <input
                            type="date"
                            value={appointmentDate}
                            min={toDateInputValue()}
                            onChange={(event) => setAppointmentDate(event.target.value)}
                            disabled={booking}
                          />
                        </label>

                        <label>
                          Time
                          <input
                            type="time"
                            value={appointmentTime}
                            min={getMinimumTimeForDate(appointmentDate)}
                            onChange={(event) => setAppointmentTime(event.target.value)}
                            disabled={booking}
                          />
                        </label>

                        <label>
                          Service
                          <select
                            value={selectedServiceId}
                            onChange={(event) => handleServiceChange(event.target.value)}
                            disabled={booking || activeServices.length === 0}
                          >
                            <option value="">General BMI consultation</option>
                            {activeServices.map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Your Name
                          <input
                            type="text"
                            value={patientName}
                            onChange={(event) => setPatientName(event.target.value)}
                            disabled={booking}
                          />
                        </label>

                        <label>
                          Phone Number
                          <input
                            type="text"
                            value={patientPhone}
                            onChange={(event) => setPatientPhone(event.target.value)}
                            disabled={booking}
                          />
                        </label>

                        <label>
                          Purpose
                          <input
                            type="text"
                            value={purpose}
                            onChange={(event) => setPurpose(event.target.value)}
                            disabled={booking}
                          />
                        </label>

                        <label className="wide">
                          Symptoms
                          <textarea
                            value={symptoms}
                            onChange={(event) => setSymptoms(event.target.value)}
                            rows={3}
                            disabled={booking}
                            placeholder="Optional symptoms or concerns"
                          />
                        </label>

                        <label className="wide">
                          Note
                          <textarea
                            value={patientNote}
                            onChange={(event) => setPatientNote(event.target.value)}
                            rows={3}
                            disabled={booking}
                            placeholder="Additional note for the clinic"
                          />
                        </label>
                      </div>

                      <div className="clinic-booking-actions">
                        <button
                          type="button"
                          className="clinic-secondary-btn"
                          onClick={closeClinicProfile}
                          disabled={booking}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="clinic-book-btn"
                          onClick={handleBookAppointment}
                          disabled={booking || !canBookSelectedClinic}
                        >
                          {booking ? "Booking..." : "Confirm Booking"}
                        </button>
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
