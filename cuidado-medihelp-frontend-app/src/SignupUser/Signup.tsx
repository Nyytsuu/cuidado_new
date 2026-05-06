import Logotag from "../components/Logotag";
import "./Signup.css";
import React, { useState, useEffect, useMemo } from "react";
import { handleSubmit, type SignupPayload } from "../components/handleSubmit";
import { Link, useNavigate } from "react-router-dom";
import zxcvbn from "zxcvbn";
import { FiEye, FiEyeOff, FiX } from "react-icons/fi";
import OtpPopup from "../SigninUser/OtpPopup";
import { getConfiguredBackendUrl } from "../sharedBackendFetch";

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

  const result = useMemo(() => zxcvbn(password), [password]);
  const score = result.score;
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
    if (!consent) newErrors.consent = "Consent is required.";

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

  return (
    <div>
      <div className="bgimg">
        <Logotag />

        <div className="wrapper">
          <div className="left-bg"></div>

          <div className="signup-container">
            <form onSubmit={onSubmit} className="signup-form">
              <p className="Sign">Sign Up</p>
              <p>Create an Account</p>

              <div className="row">
                <div className="input-group">
                  <label htmlFor="fullname">Full Name:</label>
                  <input
                    type="text"
                    id="fullname"
                    name="fullname"
                    value={fullname}
                    className={errors.fullname ? "error-input" : ""}
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
                  {errors.fullname && <div className="error-text">{errors.fullname}</div>}
                </div>

                <div className="input-group">
                  <label htmlFor="email">Email:</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    className={errors.email ? "error-input" : ""}
                    onChange={(e) => {
                      setEmail(e.target.value.trim());
                      clearError("email");
                    }}
                    autoComplete="email"
                    placeholder="@gmail.com"
                    required
                  />
                  {errors.email && <div className="error-text">{errors.email}</div>}
                </div>
              </div>

              <div className="row">
                <div className="input-group">
                  <label htmlFor="phone">Phone Number:</label>
                  <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={phone}
                          className={errors.phone ? "error-input" : ""}
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
                  {errors.phone && <div className="error-text">{errors.phone}</div>}
                </div>

                <div className="input-group">
                  <label htmlFor="gender">Gender:</label>
                  <select
                    id="gender"
                    name="gender"
                    value={gender}
                    className={errors.gender ? "error-input" : ""}
                    onChange={(e) => {
                      setGender(e.target.value);
                      clearError("gender");
                    }}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.gender && <div className="error-text">{errors.gender}</div>}
                </div>

                <div className="input-group date-wrap">
                  <label htmlFor="dob">Date of Birth:</label>
                  <input
                    type="date"
                    id="dob"
                    name="dob"
                    value={dob}
                    className={errors.dob ? "error-input" : ""}
                    onChange={(e) => {
                      setDob(e.target.value);
                      clearError("dob");
                    }}
                    min="1900-01-01"
                    max={maxDob}
                    required
                  />
                  {errors.dob && <div className="error-text">{errors.dob}</div>}
                </div>
              </div>

              <div className="row">
                <div className="input-group">
                  <label htmlFor="province">Province:</label>
                  <select
                    id="province"
                    name="province_id"
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
                      <option key={p.id} value={p.id}>
                        {p.province_name}
                      </option>
                    ))}
                  </select>
                  {errors.provinceId && <div className="error-text">{errors.provinceId}</div>}
                </div>

                <div className="input-group">
                  <label htmlFor="municipality">Municipality</label>
                  <select
                    id="municipality"
                    name="municipality_id"
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
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  {errors.municipalityId && (
                    <div className="error-text">{errors.municipalityId}</div>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="barangay">Barangay</label>
                  <select
                    id="barangay"
                    name="barangay_id"
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
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  {errors.barangayId && <div className="error-text">{errors.barangayId}</div>}
                </div>
              </div>

              <div className="last-group">
                <label htmlFor="address">Address:</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={address}
                  className={errors.address ? "error-input" : ""}
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
                {errors.address && <div className="error-text">{errors.address}</div>}

                <label htmlFor="password">Password:</label>
                <div className="field-with-icon">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={password}
                    className={errors.password ? "error-input" : ""}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError("password");
                    }}
                    autoComplete="new-password"
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

                <label htmlFor="confirm-password">Confirm Password:</label>
                <div className="field-with-icon">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirm-password"
                    name="confirmPassword"
                    value={confirmPassword}
                    className={errors.confirmPassword ? "error-input" : ""}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearError("confirmPassword");
                    }}
                    autoComplete="new-password"
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
                {isSubmitting ? "Sending OTP..." : "Sign Up"}
              </button>

              <p className="login-link">
                Already have an account?{" "}
                <Link to="/signin" style={{ color: "#004D40" }}>
                  Login here
                </Link>
                .
              </p>
              <p className="login-link">
                Have A Clinic?{" "}
                <Link to="/clinic/signup" style={{ color: "#004D40" }}>
                  Sign Up Here
                </Link>
                .
              </p>
            </form>
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
              onConfirm={handleConfirmSignupOtp}
              onResend={handleResendSignupOtp}
            />
          </div>
        </div>
      )}

      {toast.open && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default Signup;
