
import Logotag from "../components/Logotag";
import "./ClinicSignup.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
  password?: string;

  // Step 2
  repName?: string;
  repPosition?: string;
  repPhone?: string;
  servicesOffered?: string;
  openingTime?: string;
  closingTime?: string;
  operatingDays?: string;
  consent?: string;
};

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "info";
};

export default function ClinicSignup() {
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

  /* ---------- UI STATE ---------- */
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  /* ---------- FETCH PROVINCES ---------- */
  useEffect(() => {
    fetch("http://localhost:5000/api/provinces")
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

    fetch(`http://localhost:5000/api/municipalities/${provinceId}`)
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

    fetch(`http://localhost:5000/api/barangays/${municipalityId}`)
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

    if (clinicName.trim().length < 2) e.clinicName = "Please enter clinic name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Please enter a valid email.";
    if (password.trim().length < 8) e.password = "Password must be at least 8 characters.";
    if (!provinceId) e.provinceId = "Select a province.";
    if (!municipalityId) e.municipalityId = "Select a municipality.";
    if (!barangayId) e.barangayId = "Select a barangay.";

    if (address.trim().length < 5) e.address = "Address must be at least 5 characters.";

    if (!specialization) e.specialization = "Select clinic type/specialization.";
    if (!licenseNumber.trim()) e.licenseNumber = "License number is required.";

    return e;
  };

  /* ---------- VALIDATE STEP 2 ---------- */
  const validateStep2 = (): Errors => {
    const e: Errors = {};

    if (repName.trim().length < 2) e.repName = "Representative full name required.";
    if (repPosition.trim().length < 2) e.repPosition = "Position is required.";

    if (!servicesOffered) e.servicesOffered = "Select service offered.";
    if (!openingTime) e.openingTime = "Opening time required.";
    if (!closingTime) e.closingTime = "Closing time required.";
    if (!operatingDays.trim()) e.operatingDays = "Operating days required.";

    if (!clinicLicenseFile) showToast("Upload clinic license.", "error");
    if (!repValidIdFile) showToast("Upload representative valid ID.", "error");

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
    setErrors((prev) => ({ ...prev, ...v }));

    if (Object.keys(v).length > 0 || !clinicLicenseFile || !repValidIdFile) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setIsSubmitting(true);

  try {
    const fd = new FormData();

    // STEP 1
    fd.append("clinic_name", clinicName);
    fd.append("email", email);
    fd.append("phone", phone);
    fd.append("province_id", provinceId);
    fd.append("municipality_id", municipalityId);
    fd.append("barangay_id", barangayId);
    fd.append("address", address);
    fd.append("specialization", specialization);
    fd.append("license_number", licenseNumber);
    fd.append("years_operation", yearsOperation ? String(parseInt(yearsOperation, 10)) : "0");

    // STEP 2
    fd.append("rep_full_name", repName);
    fd.append("rep_position", repPosition);
    fd.append("rep_phone", repPhone);
    fd.append("services_offered", servicesOffered);
    fd.append("opening_time", openingTime);
    fd.append("closing_time", closingTime);
    fd.append("operating_days", operatingDays);

    // FILES
    fd.append("clinic_license_file", clinicLicenseFile!);
    fd.append("rep_valid_id_file", repValidIdFile!);

    // PASSWORD (YOU MUST ADD PASSWORD STATE)
    fd.append("password", password);

    const res = await fetch("http://localhost:5000/api/clinic/signup", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Clinic signup failed");

    showToast(data.message, "success");
    setIsSubmitting(false);
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : "An error occurred during signup",
      "error"
    );
    setIsSubmitting(false);
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
                        setEmail(e.target.value.trim());
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
                        let v = e.target.value.replace(/[^\d+]/g, "");
                        v = v.replace(/(?!^)\+/g, "");

                           // If it starts with 0, keep it 09 + 9 digits
    if (v.startsWith("0")) v = v.slice(0, 11);

    // If it starts with +, keep +63 + 10 digits
    if (v.startsWith("+")) v = v.slice(0, 13);

                        setPhone(v);
                        clearError("phone");
                      }}
                      placeholder="+63XXXXXXXXXX"
                      maxLength={13}
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
                    <option value="general">General Clinic</option>
                    <option value="dental">Dental</option>
                    <option value="pediatric">Pediatric</option>
                    <option value="laboratory">Laboratory</option>
                  </select>
                  {errors.specialization && (
                    <div className="error-text">{errors.specialization}</div>
                  )}

                  <label>License Number:</label>
                  <input
                    value={licenseNumber}
                    className={errors.licenseNumber ? "error-input" : ""}
                    onChange={(e) => {
                      setLicenseNumber(e.target.value);
                      clearError("licenseNumber");
                    }}
                    required
                  />
                  {errors.licenseNumber && (
                    <div className="error-text">{errors.licenseNumber}</div>
                  )}

                  <label>Years of Operation (Optional):</label>
                  <input
                    value={yearsOperation}
                    onChange={(e) => setYearsOperation(e.target.value)}
                    placeholder="Years of operation"
                  />

                  <label>Password:</label>
                  <input
                    type="password"
                    value={password}
                    className={errors.password ? "error-input" : ""}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError("password");
                    }}
                    placeholder="Enter a strong password"
                    required
                  />
                  {errors.password && (
                    <div className="error-text">{errors.password}</div>
                  )}
                </div>

                <button type="submit">Next</button>

                <p className="login-link">
                  Already have an account? <Link to="/clinic-signin">Sign in</Link>
                </p>
                <p className="login-link">
                  Not a clinic? <Link to="/signup">Sign up as a Patient instead.</Link>
                </p>
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
                        let v = e.target.value.replace(/[^\d+]/g, "");
                        v = v.replace(/(?!^)\+/g, "");

                         // If it starts with 0, keep it 09 + 9 digits
    if (v.startsWith("0")) v = v.slice(0, 11);

    // If it starts with +, keep +63 + 10 digits
    if (v.startsWith("+")) v = v.slice(0, 13);

                        setRepPhone(v);
                        clearError("repPhone");
                      }}
                      placeholder="+63XXXXXXXXXX"
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
                    <input
                      value={operatingDays}
                      className={errors.operatingDays ? "error-input" : ""}
                      onChange={(e) => {
                        setOperatingDays(e.target.value);
                        clearError("operatingDays");
                      }}
                      placeholder="e.g. Mon - Fri"
                      required
                    />
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
                    onChange={(e) => setClinicLicenseFile(e.target.files?.[0] ?? null)}
                    required
                  />

                  <label>Upload a Valid ID of representative:</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setRepValidIdFile(e.target.files?.[0] ?? null)}
                    required
                  />
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
                  {isSubmitting ? "Signing up..." : "Sign Up"}
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

      {toast.open && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}