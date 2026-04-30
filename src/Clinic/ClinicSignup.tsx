
import Logotag from "../components/Logotag";
import "./ClinicSignup.css";
import zxcvbn from "zxcvbn";
import { useEffect, useState, useMemo } from "react";
import { FiEye, FiEyeOff, FiX } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import OtpPopup from "../SigninUser/OtpPopup";

/* ---------- TYPES ---------- */
interface Province {
  id: number;
  province_name: string;
}

interface Municipality {
  id: number;
  province_id: number;
  name: string;
}

interface Barangay {
  id: number;
  municipality_id: number;
  name: string;
}

/* ✅ FIXED: add missing keys used in Step 2 */
type Errors = {
  // Step 1
  clinicName?: string;
  email?: string;
  phone?: string;
  provinceId?: string;
  municipalityId?: string;
  barangayId?: string;
  address?: string;
  specialization?: string;
  licenseNumber?: string;
  yearsOperation?: string;
  password?: string;
  confirmPassword?: string;

  // Step 2
  repName?: string;
  repPosition?: string;
  repPhone?: string;
  servicesOffered?: string;
  openingTime?: string;
  closingTime?: string;
  operatingDays?: string;
  clinicLicenseFile?: string;
  repValidIdFile?: string;
  consent?: string;
};

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "info";
};

type ApiErrorResponse = {
  message?: string;
  errors?: string[];
  verificationToken?: string;
};

const API_BASE = "http://localhost:5000";
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PH_PHONE_RE = /^(\+639|09)\d{9}$/;
const LICENSE_RE = /^R\d{2}-\d{2}-\d{6}$/;
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;
const UPLOAD_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const UPLOAD_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const VALID_OPERATING_DAYS = new Set(["mon-fri", "mon-sat", "daily"]);
const VALID_SERVICE_VALUES = new Set(["general", "dental", "pediatric", "laboratory"]);

const normalizePhPhone = (value: string) => {
  let v = value.replace(/[^\d+]/g, "");
  v = v.replace(/(?!^)\+/g, "");

  if (v.startsWith("+") && !v.startsWith("+639")) v = "+639";
  if (v.startsWith("0") && !v.startsWith("09")) v = "09";

  if (v.startsWith("+639")) return v.slice(0, 13);
  if (v.startsWith("09")) return v.slice(0, 11);

  return v.slice(0, 13);
};

const isStrongPassword = (value: string) =>
  value.length >= 8 &&
  /[A-Z]/.test(value) &&
  /[a-z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z0-9]/.test(value);

const getUploadFileError = (file: File | null, label: string) => {
  if (!file) return `${label} is required.`;

  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = UPLOAD_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (!hasAllowedExtension || !UPLOAD_TYPES.has(file.type)) {
    return `${label} must be a PDF, JPG, PNG, or WEBP file.`;
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return `${label} must be 8MB or smaller.`;
  }

  return "";
};

export default function ClinicSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  /* ---------- STEP 1 STATE ---------- */
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);

  const [provinceId, setProvinceId] = useState<string>("");
  const [municipalityId, setMunicipalityId] = useState<string>("");
  const [barangayId, setBarangayId] = useState<string>("");

  const [address, setAddress] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [yearsOperation, setYearsOperation] = useState("");

  /* ---------- STEP 2 STATE ---------- */
  const [repName, setRepName] = useState("");
  const [repPosition, setRepPosition] = useState("");
  const [repPhone, setRepPhone] = useState("");

  const [servicesOffered, setServicesOffered] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [operatingDays, setOperatingDays] = useState("");

  const [clinicLicenseFile, setClinicLicenseFile] = useState<File | null>(null);
  const [repValidIdFile, setRepValidIdFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /* ---------- UI STATE ---------- */
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const showToast = (message: string, type: ToastState["type"] = "info") => {
    setToast({ open: true, message, type });
    window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000);
  };

  const clearError = (key: keyof Errors) => {
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const result = useMemo(() => zxcvbn(password), [password]);
  const score = result.score;
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  /* ---------- FETCH PROVINCES ---------- */
  useEffect(() => {
    fetch(`${API_BASE}/api/provinces`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! ${res.status}`);
        return res.json();
      })
      .then((data: Province[]) => setProvinces(data))
      .catch((err) => console.error("Failed to fetch provinces:", err));
  }, []);

  /* ---------- FETCH MUNICIPALITIES ---------- */
  useEffect(() => {
    if (!provinceId) return;

    fetch(`${API_BASE}/api/municipalities/${provinceId}`)
      .then((res) => res.json())
      .then((data: Municipality[]) => {
        setMunicipalities(data);
        setBarangays([]);
        setMunicipalityId("");
        setBarangayId("");
      })
      .catch(console.error);
  }, [provinceId]);

  /* ---------- FETCH BARANGAYS ---------- */
  useEffect(() => {
    if (!municipalityId) return;

    fetch(`${API_BASE}/api/barangays/${municipalityId}`)
      .then((res) => res.json())
      .then((data: Barangay[]) => {
        setBarangays(data);
        setBarangayId("");
      })
      .catch(console.error);
  }, [municipalityId]);

  /* ---------- VALIDATE STEP 1 ---------- */
  const validateStep1 = (): Errors => {
    const e: Errors = {};

    if (clinicName.trim().length < 3) e.clinicName = "Clinic name must be at least 3 characters.";
    if (!EMAIL_RE.test(email.trim().toLowerCase())) e.email = "Please enter a valid email.";
    if (!PH_PHONE_RE.test(phone)) e.phone = "Use +639XXXXXXXXX or 09XXXXXXXXX.";
    if (!provinceId) e.provinceId = "Select a province.";
    if (!municipalityId) e.municipalityId = "Select a municipality.";
    if (!barangayId) e.barangayId = "Select a barangay.";

    if (address.trim().length < 10) e.address = "Address must be at least 10 characters.";

    if (!specialization) e.specialization = "Select clinic type/specialization.";
    if (!LICENSE_RE.test(licenseNumber.trim().toUpperCase())) {
      e.licenseNumber = "Use format R06-23-007645.";
    }

    if (yearsOperation.trim()) {
      const years = Number(yearsOperation);
      if (!Number.isInteger(years) || years < 0 || years > 150) {
        e.yearsOperation = "Enter a number from 0 to 150.";
      }
    }

    if (!isStrongPassword(password)) {
      e.password = "8+ chars with uppercase, lowercase, number, and symbol.";
    }

    if (password !== confirmPassword) e.confirmPassword = "Passwords do not match.";

    return e;
  };

  /* ---------- VALIDATE STEP 2 ---------- */
  const validateStep2 = (): Errors => {
    const e: Errors = {};

    if (repName.trim().length < 2) e.repName = "Representative full name required.";
    if (repPosition.trim().length < 2) e.repPosition = "Position is required.";
    if (!PH_PHONE_RE.test(repPhone)) e.repPhone = "Use +639XXXXXXXXX or 09XXXXXXXXX.";

    if (!VALID_SERVICE_VALUES.has(servicesOffered)) e.servicesOffered = "Select service offered.";
    if (!openingTime) e.openingTime = "Opening time required.";
    if (!closingTime) e.closingTime = "Closing time required.";
    if (openingTime && closingTime && openingTime >= closingTime) {
      e.closingTime = "Closing time must be after opening time.";
    }
    if (!VALID_OPERATING_DAYS.has(operatingDays)) e.operatingDays = "Select operating days.";

    const clinicLicenseError = getUploadFileError(clinicLicenseFile, "Clinic license");
    if (clinicLicenseError) e.clinicLicenseFile = clinicLicenseError;

    const repValidIdError = getUploadFileError(repValidIdFile, "Representative valid ID");
    if (repValidIdError) e.repValidIdFile = repValidIdError;

    if (!consent) e.consent = "Consent is required.";

    return e;
  };

  /* ---------- SUBMIT STEP 1 ---------- */
  const onSubmitStep1 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = validateStep1();
    setErrors(v);

    if (Object.keys(v).length > 0) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setStep(2);
  };

  /* ---------- SUBMIT STEP 2 ---------- */
  const onSubmitStep2 = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const v = validateStep2();
    setErrors(v);

    if (Object.keys(v).length > 0) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setIsSubmitting(true);
    setOtpError("");

    try {
      await sendClinicSignupOtp(email);
      setOtpOpen(true);
      showToast("Verification code sent to your clinic email.", "info");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to send verification code.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildClinicSignupFormData = (verificationToken: string) => {
    const fd = new FormData();

    fd.append("clinic_name", clinicName.trim());
    fd.append("email", email.trim().toLowerCase());
    fd.append("phone", phone);
    fd.append("province_id", provinceId);
    fd.append("municipality_id", municipalityId);
    fd.append("barangay_id", barangayId);
    fd.append("address", address.trim());
    fd.append("specialization", specialization);
    fd.append("license_number", licenseNumber.trim().toUpperCase());
    fd.append("years_operation", yearsOperation ? String(parseInt(yearsOperation, 10)) : "0");

    fd.append("rep_full_name", repName.trim());
    fd.append("rep_position", repPosition.trim());
    fd.append("rep_phone", repPhone);
    fd.append("services_offered", servicesOffered);
    fd.append("opening_time", openingTime);
    fd.append("closing_time", closingTime);
    fd.append("operating_days", operatingDays);

    if (clinicLicenseFile) fd.append("clinic_license_file", clinicLicenseFile);
    if (repValidIdFile) fd.append("rep_valid_id_file", repValidIdFile);

    fd.append("password", password);
    fd.append("email_verification_token", verificationToken);

    return fd;
  };

  const sendClinicSignupOtp = async (emailToSend: string) => {
    const res = await fetch(`${API_BASE}/api/auth/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: emailToSend.trim().toLowerCase(),
        purpose: "clinic_signup_verification",
      }),
    });

    const data: ApiErrorResponse = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Failed to send verification code.");
    }
  };

  const submitClinicSignup = async (verificationToken: string) => {
    const res = await fetch(`${API_BASE}/api/clinic/signup`, {
      method: "POST",
      body: buildClinicSignupFormData(verificationToken),
    });

    const data: ApiErrorResponse = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Clinic signup failed.");
    }

    return data;
  };

  const closeOtpModal = () => {
    if (loadingConfirm) return;

    setOtpOpen(false);
    setOtpError("");
    setLoadingConfirm(false);
    setLoadingResend(false);
  };

  const handleConfirmClinicOtp = async (otp: string) => {
    setOtpError("");
    setLoadingConfirm(true);
    let verificationToken = "";

    try {
      const verifyRes = await fetch(`${API_BASE}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email.trim().toLowerCase(),
          otp,
          purpose: "clinic_signup_verification",
        }),
      });

      const verifyData: ApiErrorResponse = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) {
        setOtpError(verifyData.message || "Invalid OTP.");
        setLoadingConfirm(false);
        return;
      }

      if (!verifyData.verificationToken) {
        setOtpError("Email verification session was not created. Please resend the code.");
        setLoadingConfirm(false);
        return;
      }

      verificationToken = verifyData.verificationToken;
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Failed to verify OTP.");
      setLoadingConfirm(false);
      return;
    }

    setIsSubmitting(true);

    try {
      const signupData = await submitClinicSignup(verificationToken);
      showToast(signupData.message || "Clinic signup submitted for admin approval.", "success");
      setOtpOpen(false);

      setTimeout(() => {
        navigate("/signin");
      }, 1500);
    } catch (err) {
      setOtpOpen(false);
      showToast(err instanceof Error ? err.message : "Clinic signup failed.", "error");
    } finally {
      setIsSubmitting(false);
      setLoadingConfirm(false);
    }
  };

  const handleResendClinicOtp = async () => {
    setOtpError("");
    setLoadingResend(true);

    try {
      await sendClinicSignupOtp(email);
      showToast("Verification code resent.", "info");
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Failed to resend OTP.");
    } finally {
      setLoadingResend(false);
    }
  };

return (
    <div>
      <div className="bgimg">
        <Logotag />

        <div className="wrapper">
          <div className="left-bg"></div>

          <div className="signup-container">
            {/* ---------- STEP 1 ---------- */}
            {step === 1 && (
  <form onSubmit={onSubmitStep1} className="signup-form">
    <p className="Sign">Sign Up</p>
    <p>Register Your Clinic</p>

    <div className="row">
      <div className="input-group">
        <label>Clinic Name:</label>
        <input
          value={clinicName}
          className={errors.clinicName ? "error-input" : ""}
          onChange={(e) => {
            setClinicName(e.target.value);
            clearError("clinicName");
          }}
          placeholder="Enter your clinic name"
          required
        />
        {errors.clinicName && <div className="error-text">{errors.clinicName}</div>}
      </div>

      <div className="input-group">
        <label>Email:</label>
        <input
          type="email"
          value={email}
          className={errors.email ? "error-input" : ""}
          onChange={(e) => {
            setEmail(e.target.value.trim().toLowerCase());
            clearError("email");
          }}
          required
        />
        {errors.email && <div className="error-text">{errors.email}</div>}
      </div>
    </div>

    <div className="row">
      <div className="input-group">
        <label>Phone Number:</label>
        <input
          type="tel"
          value={phone}
          className={errors.phone ? "error-input" : ""}
          onChange={(e) => {
            setPhone(normalizePhPhone(e.target.value));
            clearError("phone");
          }}
          inputMode="numeric"
          placeholder="+639XXXXXXXXXX or 09XXXXXXXXX"
          pattern="^(\+639|09)\d{9}$"
          autoComplete="tel"
          required
        />
        {errors.phone && <div className="error-text">{errors.phone}</div>}
      </div>
    </div>

    <div className="row">
      <div className="input-group">
        <label>Province:</label>
        <select
          value={provinceId}
          className={errors.provinceId ? "error-input" : ""}
          onChange={(e) => {
            setProvinceId(e.target.value);
            clearError("provinceId");
          }}
          required
        >
          <option value="">Select Province</option>
          {provinces.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.province_name}
            </option>
          ))}
        </select>
        {errors.provinceId && <div className="error-text">{errors.provinceId}</div>}
      </div>

      <div className="input-group">
        <label>Municipality:</label>
        <select
          value={municipalityId}
          className={errors.municipalityId ? "error-input" : ""}
          onChange={(e) => {
            setMunicipalityId(e.target.value);
            clearError("municipalityId");
          }}
          disabled={!provinceId}
          required
        >
          <option value="">Select Municipality</option>
          {municipalities.map((m) => (
            <option key={m.id} value={String(m.id)}>
              {m.name}
            </option>
          ))}
        </select>
        {errors.municipalityId && (
          <div className="error-text">{errors.municipalityId}</div>
        )}
      </div>

      <div className="input-group">
        <label>Barangay:</label>
        <select
          value={barangayId}
          className={errors.barangayId ? "error-input" : ""}
          onChange={(e) => {
            setBarangayId(e.target.value);
            clearError("barangayId");
          }}
          disabled={!municipalityId}
          required
        >
          <option value="">Select Barangay</option>
          {barangays.map((b) => (
            <option key={b.id} value={String(b.id)}>
              {b.name}
            </option>
          ))}
        </select>
        {errors.barangayId && <div className="error-text">{errors.barangayId}</div>}
      </div>
    </div>

    <div className="last-group">
      <label>Address:</label>
      <input
        value={address}
        className={errors.address ? "error-input" : ""}
        onChange={(e) => {
          setAddress(e.target.value);
          clearError("address");
        }}
        required
      />
      {errors.address && <div className="error-text">{errors.address}</div>}

      <label>Clinic Type / Specialization:</label>
      <select
        value={specialization}
        className={errors.specialization ? "error-input" : ""}
        onChange={(e) => {
          setSpecialization(e.target.value);
          clearError("specialization");
        }}
        required
      >
        <option value="">Select</option>
        <option value="general">General Clinic (Family Medicine)</option>
        <option value="dental">Speciality Clinic (Cardiology)</option>
        <option value="pediatric">Diagnostic Clinic (Lab & X-ray)</option>
        <option value="laboratory">Aesthetic Clinic (Skin & Cosmetic)</option>
      </select>
      {errors.specialization && (
        <div className="error-text">{errors.specialization}</div>
      )}

      <label>License Number:</label>
      <input
        value={licenseNumber}
        className={errors.licenseNumber ? "error-input" : ""}
        onChange={(e) => {
          let v = e.target.value.toUpperCase();
          v = v.replace(/[^A-Z0-9-]/g, "");
          v = v.slice(0, 13);
          setLicenseNumber(v);
          clearError("licenseNumber");
        }}
        placeholder="R06-23-007645"
        pattern="^R\d{2}-\d{2}-\d{6}$"
        title="Use format: R[Region]-[Year]-[Series Number], e.g. R06-23-007645"
        required
      />
      {errors.licenseNumber && (
        <div className="error-text">{errors.licenseNumber}</div>
      )}

      <label>Years of Operation (Optional):</label>
      <input
        type="number"
        min={0}
        max={150}
        value={yearsOperation}
        className={errors.yearsOperation ? "error-input" : ""}
        onChange={(e) => {
          setYearsOperation(e.target.value);
          clearError("yearsOperation");
        }}
        placeholder="Years of operation"
      />
      {errors.yearsOperation && (
        <div className="error-text">{errors.yearsOperation}</div>
      )}

      <label>Password:</label>
      <div className="field-with-icon">
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          className={errors.password ? "error-input" : ""}
          onChange={(e) => {
            setPassword(e.target.value);
            clearError("password");
          }}
          placeholder="Enter a strong password"
          required
        />

        <button
          type="button"
          className="eye-btn"
          onClick={() => setShowPassword((s) => !s)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>
      {errors.password && <div className="error-text">{errors.password}</div>}

      {password.length > 0 && (
        <div className="pw-meter-wrap">
          <div className="pw-meter">
            <div
              className={`pw-meter-fill score-${score}`}
              style={{ width: `${((score + 1) / 5) * 100}%` }}
            />
          </div>
          <small className="pw-label">{labels[score]}</small>

          <ul className="pw-criteria">
            <li className={password.length >= 8 ? "ok" : ""}>8+ characters</li>
            <li className={/[A-Z]/.test(password) ? "ok" : ""}>Uppercase letter</li>
            <li className={/[a-z]/.test(password) ? "ok" : ""}>Lowercase letter</li>
            <li className={/\d/.test(password) ? "ok" : ""}>Number</li>
            <li className={/[^A-Za-z0-9]/.test(password) ? "ok" : ""}>Symbol</li>
          </ul>
        </div>
      )}

      <label>Confirm Password:</label>
      <div className="field-with-icon">
        <input
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          className={errors.confirmPassword ? "error-input" : ""}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            clearError("confirmPassword");
          }}
          placeholder="Re-enter password"
          required
        />

        <button
          type="button"
          className="eye-btn"
          onClick={() => setShowConfirmPassword((s) => !s)}
          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
        >
          {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>
      {errors.confirmPassword && (
        <div className="error-text">{errors.confirmPassword}</div>
      )}

      <button type="submit">Next</button>

      <p className="login-link">
        Already have an account? <Link to="/signin">Sign in</Link>
      </p>
      <p className="login-link">
        Not a clinic? <Link to="/signup">Sign up as a Patient instead.</Link>
      </p>
    </div>
  </form>
)}

            {/* ---------- STEP 2 ---------- */}
            {step === 2 && (
              <form onSubmit={onSubmitStep2} className="signup-form">
                <p className="Sign">Representative Information</p>

                <div className="row">
                  <div className="input-group">
                    <label>Full Name of clinic representative:</label>
                    <input
                      value={repName}
                      className={errors.repName ? "error-input" : ""}
                      onChange={(e) => {
                        setRepName(e.target.value);
                        clearError("repName");
                      }}
                      required
                    />
                    {errors.repName && <div className="error-text">{errors.repName}</div>}
                  </div>

                  <div className="input-group">
                    <label>Position:</label>
                    <input
                      value={repPosition}
                      className={errors.repPosition ? "error-input" : ""}
                      onChange={(e) => {
                        setRepPosition(e.target.value);
                        clearError("repPosition");
                      }}
                      required
                    />
                    {errors.repPosition && <div className="error-text">{errors.repPosition}</div>}
                  </div>
                </div>

                <div className="row">
                  <div className="input-group">
                    <label>Phone Number:</label>
                    <input
                      type="tel"
                      value={repPhone}
                      className={errors.repPhone ? "error-input" : ""}
                      onChange={(e) => {
                        setRepPhone(normalizePhPhone(e.target.value));
                        clearError("repPhone");
                      }}
                      inputMode="numeric"
                      placeholder="+639XXXXXXXXX or 09XXXXXXXXX"
                      pattern="^(\+639|09)\d{9}$"
                      maxLength={13}
                      required
                    />
                    {errors.repPhone && <div className="error-text">{errors.repPhone}</div>}
                  </div>

                  <div className="input-group">
                    <label>Services Offered:</label>
                    <select
                      value={servicesOffered}
                      className={errors.servicesOffered ? "error-input" : ""}
                      onChange={(e) => {
                        setServicesOffered(e.target.value);
                        clearError("servicesOffered");
                      }}
                      required
                    >
                      <option value="">Select</option>
                      <option value="general">General Consultation</option>
                      <option value="dental">Dental</option>
                      <option value="pediatric">Pediatric</option>
                      <option value="laboratory">Laboratory</option>
                    </select>
                    {errors.servicesOffered && (
                      <div className="error-text">{errors.servicesOffered}</div>
                    )}
                  </div>
                </div>

                <div className="row">
                  <div className="input-group">
                    <label>Opening Time:</label>
                    <input
                      type="time"
                      value={openingTime}
                      className={errors.openingTime ? "error-input" : ""}
                      onChange={(e) => {
                        setOpeningTime(e.target.value);
                        clearError("openingTime");
                      }}
                      required
                    />
                    {errors.openingTime && <div className="error-text">{errors.openingTime}</div>}
                  </div>

                  <div className="input-group">
                    <label>Closing Time:</label>
                    <input
                      type="time"
                      value={closingTime}
                      className={errors.closingTime ? "error-input" : ""}
                      onChange={(e) => {
                        setClosingTime(e.target.value);
                        clearError("closingTime");
                      }}
                      required
                    />
                    {errors.closingTime && <div className="error-text">{errors.closingTime}</div>}
                  </div>

                  <div className="input-group">
                    <label>Operating Days:</label>
                    <select
                      value={operatingDays}
                      className={errors.operatingDays ? "error-input" : ""}
                      onChange={(e) => {
                        setOperatingDays(e.target.value);
                        clearError("operatingDays");
                      }}
                      required
                    >
                      <option value="">Select</option>
                      <option value="mon-fri">Monday to Friday</option>
                      <option value="mon-sat">Monday to Saturday</option>
                      <option value="daily">Daily</option>
                    </select>
                    {errors.operatingDays && (
                      <div className="error-text">{errors.operatingDays}</div>
                    )}
                  </div>
                </div>

                <div className="last-group">
                  <label>Upload Clinic License:</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className={errors.clinicLicenseFile ? "error-input" : ""}
                    onChange={(e) => {
                      setClinicLicenseFile(e.target.files?.[0] ?? null);
                      clearError("clinicLicenseFile");
                    }}
                    required
                  />
                  {errors.clinicLicenseFile && (
                    <div className="error-text">{errors.clinicLicenseFile}</div>
                  )}

                  <label>Upload a Valid ID of representative:</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className={errors.repValidIdFile ? "error-input" : ""}
                    onChange={(e) => {
                      setRepValidIdFile(e.target.files?.[0] ?? null);
                      clearError("repValidIdFile");
                    }}
                    required
                  />
                  {errors.repValidIdFile && (
                    <div className="error-text">{errors.repValidIdFile}</div>
                  )}
                </div>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      clearError("consent");
                    }}
                  />
                  <span className="custom-box"></span>
                  I consent to processing of my personal data.
                </label>
                {errors.consent && <div className="error-text">{errors.consent}</div>}

                <p className="terms-privacy">
                  By signing up, you agree to our Terms of Service and Privacy Policy.
                </p>

                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending code..." : "Verify Email & Sign Up"}
                </button>

                <p className="login-link">
                  Already have an account? <Link to="/signin">Sign in</Link>
                </p>
                <p className="login-link">
                  Not a clinic? <Link to="/signup">Sign up as a Patient instead.</Link>
                </p>

                <button type="button" onClick={() => setStep(1)} style={{ marginTop: 10 }}>
                  Back
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {otpOpen && (
        <div className="fp-modal-overlay" onClick={closeOtpModal}>
          <div className="fp-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="fp-modal-close" type="button" onClick={closeOtpModal}>
              <FiX />
            </button>

            <OtpPopup
              open={true}
              email={email}
              error={otpError}
              loadingConfirm={loadingConfirm}
              loadingResend={loadingResend}
              onClose={closeOtpModal}
              onConfirm={handleConfirmClinicOtp}
              onResend={handleResendClinicOtp}
            />
          </div>
        </div>
      )}

      {toast.open && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
