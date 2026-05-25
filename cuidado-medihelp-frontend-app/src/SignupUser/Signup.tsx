import "./Signup.css";
import React, { useState, useEffect, useMemo } from "react";
import { handleSubmit, type SignupPayload } from "../components/handleSubmit";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiX } from "react-icons/fi";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardList,
  Dna,
  Home,
  Lock,
  Mail,
  MapPin,
  Phone,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import OtpPopup from "../SigninUser/OtpPopup";
import { getConfiguredBackendUrl } from "../sharedBackendFetch";
import logo from "../img/logo.png";

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

type Errors = {
  fullname?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  provinceId?: string;
  municipalityId?: string;
  barangayId?: string;
  address?: string;
  password?: string;
  confirmPassword?: string;
  consent?: string;
};

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "info";
};

const getPasswordScore = (value: string) => {
  if (!value) return 0;

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  return Math.min(score, 4);
};

function Signup() {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const navigate = useNavigate();

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [provinceId, setProvinceId] = useState<string>("");
  const [municipalityId, setMunicipalityId] = useState<string>("");
  const [barangayId, setBarangayId] = useState<string>("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [consent, setConsent] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState<Errors>({});

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  // signup OTP state
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState<SignupPayload | null>(null);

  const apiBase = getConfiguredBackendUrl();

  const showToast = (message: string, type: ToastState["type"] = "info") => {
    setToast({ open: true, message, type });
    window.setTimeout(() => {
      setToast((t) => ({ ...t, open: false }));
    }, 3000);
  };

  const clearError = (key: keyof Errors) => {
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const score = useMemo(() => getPasswordScore(password), [password]);
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];

  const today = new Date();
  const minAgeDate = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    today.getDate()
  );
  const maxDob = minAgeDate.toISOString().split("T")[0];

  const passwordOk =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);

  const phPhoneOk = /^(\+639|09)\d{9}$/.test(phone);
  const passwordsMatch = password === confirmPassword;

  useEffect(() => {
    fetch(`${apiBase}/api/provinces`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: Province[]) => {
        setProvinces(data);
      })
      .catch((err) => {
        console.error("Failed to fetch provinces:", err);
      });
  }, [apiBase]);

  useEffect(() => {
    if (!provinceId) return;
    fetch(`${apiBase}/api/municipalities/${provinceId}`)
      .then((res) => res.json())
      .then((data: Municipality[]) => {
        setMunicipalities(data);
        setBarangays([]);
        setMunicipalityId("");
        setBarangayId("");
      })
      .catch(console.error);
  }, [apiBase, provinceId]);

  useEffect(() => {
    if (!municipalityId) return;
    fetch(`${apiBase}/api/barangays/${municipalityId}`)
      .then((res) => res.json())
      .then((data: Barangay[]) => {
        setBarangays(data);
        setBarangayId("");
      })
      .catch(console.error);
  }, [apiBase, municipalityId]);

  const sendSignupOtp = async (emailToSend: string) => {
    const res = await fetch(`${apiBase}/api/auth/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: emailToSend,
        purpose: "signup_verification",
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || "Failed to send verification OTP.");
    }
  };

  const closeOtpModal = () => {
    setOtpOpen(false);
    setOtpError("");
    setLoadingConfirm(false);
    setLoadingResend(false);
    setPendingSignupData(null);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: Errors = {};

    if (fullname.trim().length < 2) newErrors.fullname = "Please enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) newErrors.email = "Please enter a valid email.";
    if (!phPhoneOk) newErrors.phone = "Use +63XXXXXXXXXX or 09XXXXXXXXX.";
    if (!gender) newErrors.gender = "Please select gender.";
    if (!dob) newErrors.dob = "Please select date of birth.";
    if (!provinceId) newErrors.provinceId = "Select a province.";
    if (!municipalityId) newErrors.municipalityId = "Select a municipality.";
    if (!barangayId) newErrors.barangayId = "Select a barangay.";
    if (address.trim().length < 5) newErrors.address = "Address must be at least 5 characters.";
    if (!passwordOk) {
      newErrors.password = "8+ chars with uppercase, lowercase, number, and symbol.";
    }
    if (!passwordsMatch) newErrors.confirmPassword = "Passwords do not match.";
    if (!consent) newErrors.consent = "Please accept the terms and data consent.";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    const payload: SignupPayload = {
      fullname,
      email,
      phone,
      gender,
      dob,
      province_id: provinceId,
      municipality_id: municipalityId,
      barangay_id: barangayId,
      address,
      password,
    };

    setIsSubmitting(true);
    setOtpError("");

    try {
      setPendingSignupData(payload);
      await sendSignupOtp(email);
      setOtpOpen(true);
      showToast("Verification code sent to your email.", "info");
    } catch (err: any) {
      console.error("SEND OTP ERROR", err);
      showToast(err?.message || "Failed to send verification OTP.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSignupOtp = async (otp: string) => {
    if (!pendingSignupData) {
      setOtpError("Missing signup data. Please try again.");
      return;
    }

    setOtpError("");
    setLoadingConfirm(true);

    try {
      const verifyRes = await fetch(`${apiBase}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: pendingSignupData.email,
          otp,
          purpose: "signup_verification",
        }),
      });

      const verifyData = await verifyRes.json().catch(() => ({}));

      if (!verifyRes.ok) {
        setOtpError(verifyData?.message || "Invalid OTP.");
        return;
      }

      const signupData = await handleSubmit(pendingSignupData);

      showToast(signupData?.message ?? "Signup successful ✅", "success");
      setOtpOpen(false);
      setPendingSignupData(null);

      setTimeout(() => {
        navigate("/signin");
      }, 1500);
    } catch (err: any) {
      console.error("VERIFY OTP / SIGNUP ERROR", err);
      setOtpError(err?.message || "Signup failed. Please try again.");
    } finally {
      setLoadingConfirm(false);
    }
  };

  const handleResendSignupOtp = async () => {
    if (!email) {
      setOtpError("Missing email address.");
      return;
    }

    setOtpError("");
    setLoadingResend(true);

    try {
      await sendSignupOtp(email);
      showToast("Verification code resent.", "info");
    } catch (err: any) {
      setOtpError(err?.message || "Failed to resend OTP.");
    } finally {
      setLoadingResend(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/signin");
  };

  return (
    <div className="signup-screen">
      <div className="signup-pattern" aria-hidden="true">
        <ClipboardList className="pattern-icon pattern-clipboard" />
        <Pill className="pattern-icon pattern-pill" />
        <Syringe className="pattern-icon pattern-syringe-a" />
        <Syringe className="pattern-icon pattern-syringe-b" />
        <Dna className="pattern-icon pattern-dna" />
        <Sparkles className="pattern-icon pattern-sparkle-a" />
        <Sparkles className="pattern-icon pattern-sparkle-b" />
      </div>

      <button
        type="button"
        className="signup-back-button"
        onClick={handleBack}
        aria-label="Go back"
      >
        <ArrowLeft size={24} />
      </button>

      <section className="signup-hero" aria-label="Cuidado signup introduction">
        <div className="signup-hero-copy">
          <h1>
            <span>Join us</span>
            <strong>Today!</strong>
          </h1>
          <div className="signup-hero-rule" />
          <p>
            Sign up to check your symptoms, book appointments, and manage your health
            with ease.
          </p>
        </div>

        <img src={logo} alt="Cuidado" className="signup-hero-logo" />
      </section>

      <main className="signup-card">
        <form onSubmit={onSubmit} className="signup-form" noValidate>
          <header className="signup-form-header">
            <span aria-hidden="true" />
            <h2>Sign Up</h2>
            <span aria-hidden="true" />
          </header>

          <section className="signup-section-intro">
            <div className="signup-section-icon">
              <UsersRound size={26} />
            </div>
            <div>
              <h3>Create an Account</h3>
              <p>Fill in your information to get started.</p>
            </div>
          </section>

          <div className="signup-grid signup-grid-two">
            <div className="input-group">
              <label htmlFor="fullname">Full Name</label>
              <div className={`signup-control ${errors.fullname ? "has-error" : ""}`}>
                <UserRound size={21} />
                <input
                  type="text"
                  id="fullname"
                  name="fullname"
                  value={fullname}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^a-zA-Z\s.'-]/g, "");
                    setFullname(v);
                    clearError("fullname");
                  }}
                  autoComplete="name"
                  minLength={2}
                  maxLength={150}
                  placeholder="Juan Dela Cruz"
                  required
                />
              </div>
              {errors.fullname && <div className="error-text">{errors.fullname}</div>}
            </div>

            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className={`signup-control ${errors.email ? "has-error" : ""}`}>
                <Mail size={21} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value.trim());
                    clearError("email");
                  }}
                  autoComplete="email"
                  placeholder="@gmail.com"
                  required
                />
              </div>
              {errors.email && <div className="error-text">{errors.email}</div>}
            </div>
          </div>

          <div className="signup-grid signup-grid-three">
            <div className="input-group">
              <label htmlFor="phone">Phone Number</label>
              <div className={`signup-control ${errors.phone ? "has-error" : ""}`}>
                <Phone size={21} />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={phone}
                  onChange={(e) => {
                    let v = e.target.value.replace(/[^\d+]/g, "");
                    v = v.replace(/(?!^)\+/g, "");

                    if (v.startsWith("+") && !v.startsWith("+639")) v = "+639";
                    if (v.startsWith("0") && !v.startsWith("09")) v = "09";

                    if (v.startsWith("+639")) {
                      v = v.slice(0, 13);
                    } else if (v.startsWith("09")) {
                      v = v.slice(0, 11);
                    }

                    setPhone(v);
                    clearError("phone");
                  }}
                  inputMode="numeric"
                  placeholder="+639 or 09"
                  pattern="^(\+639|09)\d{9}$"
                  autoComplete="tel"
                  required
                />
              </div>
              {errors.phone && <div className="error-text">{errors.phone}</div>}
            </div>

            <div className="input-group">
              <label htmlFor="gender">Gender</label>
              <div className={`signup-control signup-select ${errors.gender ? "has-error" : ""}`}>
                <UserRound size={21} />
                <select
                  id="gender"
                  name="gender"
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value);
                    clearError("gender");
                  }}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Rather Not Say</option>
                </select>
              </div>
              {errors.gender && <div className="error-text">{errors.gender}</div>}
            </div>

            <div className="input-group">
              <label htmlFor="dob">Date of Birth</label>
              <div className={`signup-control ${errors.dob ? "has-error" : ""}`}>
                <CalendarDays size={21} />
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value);
                    clearError("dob");
                  }}
                  min="1900-01-01"
                  max={maxDob}
                  required
                />
              </div>
              {errors.dob && <div className="error-text">{errors.dob}</div>}
            </div>
          </div>

          <div className="signup-grid signup-grid-three">
            <div className="input-group">
              <label htmlFor="province">Province</label>
              <div className={`signup-control signup-select ${errors.provinceId ? "has-error" : ""}`}>
                <MapPin size={21} />
                <select
                  id="province"
                  name="province_id"
                  value={provinceId}
                  onChange={(e) => {
                    setProvinceId(e.target.value);
                    clearError("provinceId");
                  }}
                  required
                >
                  <option value="">Select Province</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.province_name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.provinceId && <div className="error-text">{errors.provinceId}</div>}
            </div>

            <div className="input-group">
              <label htmlFor="municipality">Municipality</label>
              <div
                className={`signup-control signup-select ${
                  errors.municipalityId ? "has-error" : ""
                }`}
              >
                <Building2 size={21} />
                <select
                  id="municipality"
                  name="municipality_id"
                  value={municipalityId}
                  onChange={(e) => {
                    setMunicipalityId(e.target.value);
                    clearError("municipalityId");
                  }}
                  disabled={!provinceId}
                  required
                >
                  <option value="">Select Municipality</option>
                  {municipalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.municipalityId && (
                <div className="error-text">{errors.municipalityId}</div>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="barangay">Barangay</label>
              <div className={`signup-control signup-select ${errors.barangayId ? "has-error" : ""}`}>
                <Home size={21} />
                <select
                  id="barangay"
                  name="barangay_id"
                  value={barangayId}
                  onChange={(e) => {
                    setBarangayId(e.target.value);
                    clearError("barangayId");
                  }}
                  disabled={!municipalityId}
                  required
                >
                  <option value="">Select Barangay</option>
                  {barangays.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.barangayId && <div className="error-text">{errors.barangayId}</div>}
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="address">Address</label>
            <div className={`signup-control ${errors.address ? "has-error" : ""}`}>
              <MapPin size={21} />
              <input
                type="text"
                id="address"
                name="address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  clearError("address");
                }}
                minLength={5}
                maxLength={255}
                autoComplete="street-address"
                placeholder="Blk L St. Subd. Barangay"
                required
              />
            </div>
            {errors.address && <div className="error-text">{errors.address}</div>}
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className={`signup-control signup-password ${errors.password ? "has-error" : ""}`}>
              <Lock size={21} />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError("password");
                }}
                autoComplete="new-password"
                placeholder="Enter your password"
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
          </div>

          <div className="input-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <div
              className={`signup-control signup-password ${
                errors.confirmPassword ? "has-error" : ""
              }`}
            >
              <Lock size={21} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirm-password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearError("confirmPassword");
                }}
                autoComplete="new-password"
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowConfirmPassword((s) => !s)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="error-text">{errors.confirmPassword}</div>
            )}
          </div>

          <section className="signup-security-card">
            <div className="security-icon">
              <ShieldCheck size={29} />
            </div>
            <div>
              <h3>Keep your account secure</h3>
              <p>Use at least 8 characters with a mix of letters, numbers, and symbols.</p>
              {password.length > 0 && (
                <div className="pw-meter-wrap">
                  <div className="pw-meter">
                    <div
                      className={`pw-meter-fill score-${score}`}
                      style={{ width: `${((score + 1) / 5) * 100}%` }}
                    />
                  </div>
                  <small className="pw-label">{labels[score]}</small>
                </div>
              )}
            </div>
          </section>

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
            <span>I consent to processing of my personal data.</span>
          </label>
          {errors.consent && <div className="error-text consent-error">{errors.consent}</div>}

          <p className="terms-privacy">
            By signing up, you agree to our{" "}
            <button
              type="button"
              className="terms-link-button"
              onClick={() => setTermsOpen(true)}
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              className="terms-link-button"
              onClick={() => setTermsOpen(true)}
            >
              Privacy Policy
            </button>
            .
          </p>

          <button className="signup-submit-button" type="submit" disabled={isSubmitting}>
            <UserPlus size={24} />
            {isSubmitting ? "Sending OTP..." : "Sign Up"}
          </button>

          <div className="signup-divider">
            <span />
            <p>OR</p>
            <span />
          </div>

          <p className="login-link">
            Already have an account? <Link to="/signin">Log in</Link>
          </p>
        </form>
      </main>

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
              onConfirm={handleConfirmSignupOtp}
              onResend={handleResendSignupOtp}
            />
          </div>
        </div>
      )}

      {termsOpen && (
        <div className="terms-modal-overlay" onClick={() => setTermsOpen(false)}>
          <section
            className="terms-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-terms-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="terms-modal-close"
              type="button"
              aria-label="Close terms and conditions"
              onClick={() => setTermsOpen(false)}
            >
              <FiX />
            </button>

            <div className="terms-modal-header">
              <p className="terms-kicker">Cuidado Patient Account</p>
              <h2 id="patient-terms-title">Terms and Conditions</h2>
              <p>
                Please review these terms before creating your Cuidado patient account.
              </p>
            </div>

            <div className="terms-modal-content">
              <section>
                <h3>1. Account Information</h3>
                <p>
                  You agree to provide accurate personal, contact, and location details and to
                  keep your login credentials secure.
                </p>
              </section>

              <section>
                <h3>2. Health Information</h3>
                <p>
                  Cuidado may show health topics, symptom guidance, clinic listings, and
                  appointment tools. This information supports your care decisions but does not
                  replace advice from licensed medical professionals.
                </p>
              </section>

              <section>
                <h3>3. Appointments and Clinics</h3>
                <p>
                  Appointment availability, clinic services, schedules, and responses depend on
                  the participating clinic. You are responsible for attending, rescheduling, or
                  cancelling appointments when needed.
                </p>
              </section>

              <section>
                <h3>4. Privacy and Data Use</h3>
                <p>
                  By signing up, you allow Cuidado to process your personal data for account
                  creation, verification, appointment handling, notifications, and support.
                </p>
              </section>

              <section>
                <h3>5. Emergency Use</h3>
                <p>
                  Cuidado is not an emergency response service. For urgent or life-threatening
                  situations, contact local emergency services or go to the nearest hospital.
                </p>
              </section>
            </div>

            <div className="terms-modal-actions">
              <button type="button" onClick={() => setTermsOpen(false)}>
                I Understand
              </button>
            </div>
          </section>
        </div>
      )}

      {toast.open && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default Signup;
