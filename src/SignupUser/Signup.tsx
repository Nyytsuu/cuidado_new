    import Logotag from '../components/Logotag';
    import './Signup.css';
    import { useState, useEffect } from "react";
    import { handleSubmit, type SignupPayload } from "../components/handleSubmit";
    import { Link } from "react-router-dom";
    import { FiEye, FiEyeOff } from "react-icons/fi";
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
function Signup() {
        const [fullname, setFullname] = useState("");
        const [email, setEmail] = useState("");
        const [phone, setPhone] = useState("");
        const [gender, setGender] = useState("");
        const [dob, setDob] = useState("");
        const [address, setAddress] = useState("");
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
        const today = new Date().toISOString().split("T")[0];
        useEffect(() => {
        fetch("http://localhost:5000/api/provinces")
            .then((res) => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
            })
            .then((data: Province[]) => {
            console.log("PROVINCES FROM API:", data); // 👈 IMPORTANT
            setProvinces(data);
            })
            .catch((err) => {
            console.error("Failed to fetch provinces:", err);
            });
        }, []);

        useEffect(() => {
        if (!provinceId) return; fetch(`http://localhost:5000/api/municipalities/${provinceId}`)
            .then((res) => res.json())
            .then((data: Municipality[]) => {
            setMunicipalities(data);
            setBarangays([]);
            setMunicipalityId("");
            setBarangayId("");
            })
            .catch(console.error);
        }, [provinceId]);

        useEffect(() => {
        if (!municipalityId) return; fetch(`http://localhost:5000/api/barangays/${municipalityId}`)
            .then((res) => res.json())
            .then((data: Barangay[]) => {
            setBarangays(data);
            setBarangayId("");
            })
            .catch(console.error);
        }, [municipalityId]);
        // Validation logic
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

const [errors, setErrors] = useState<Errors>({});

type ToastState = { open: boolean; message: string; type: "success" | "error" | "info" };
const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

const showToast = (message: string, type: ToastState["type"] = "info") => {
  setToast({ open: true, message, type });
  window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000);
};

const clearError = (key: keyof Errors) => {
  setErrors((prev) => ({ ...prev, [key]: undefined }));
};

// validators
const passwordOk =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);

const passwordsMatch = password === confirmPassword;

const phPhoneOk = /^(\+63|09)\d{9}$/.test(phone);
const validate = (): Errors => {
  const e: Errors = {};

  if (fullname.trim().length < 2) e.fullname = "Please enter your full name (letters only).";
  if (!email.includes("@")) e.email = "Please enter a valid email.";
  if (!phPhoneOk) e.phone = "Use +63XXXXXXXXXX or 09XXXXXXXXX.";
  if (!gender) e.gender = "Please select gender.";
  if (!dob) e.dob = "Please select date of birth.";

  if (!provinceId) e.provinceId = "Select a province.";
  if (!municipalityId) e.municipalityId = "Select a municipality.";
  if (!barangayId) e.barangayId = "Select a barangay.";

  if (address.trim().length < 5) e.address = "Address must be at least 5 characters.";

  if (!passwordOk)
    e.password = "8+ chars with uppercase, lowercase, number, and symbol.";
  if (password !== confirmPassword) e.confirmPassword = "Passwords do not match.";

  if (!consent) e.consent = "Consent is required.";

  return e;
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

  if (!passwordOk) newErrors.password = "8+ chars + uppercase + lowercase + number + symbol.";
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

  try {
    const data = await handleSubmit(payload);
    showToast(data?.message ?? "Signup successful ✅", "success");
  } catch (err : any) {
    console.error("SIGNUP ERROR" , err);
    showToast("Signup failed. Please try again.", "error");
  } finally {
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
            <form onSubmit={onSubmit} className="signup-form">
            <p className='Sign'>Sign Up</p>
            <p>Create an Account</p>
                    <div className="row">
            <div className="input-group">
                <label htmlFor="fullname">Full Name:</label>
                <input type="text" id="fullname" name="fullname" value={fullname} className={errors.fullname ? "error-input" : ""}
            onChange={(e) => {
                const v = e.target.value.replace(/[^a-zA-Z\s.'-]/g, "");
                setFullname(v);
                setErrors((prev) => ({ ...prev, fullname: undefined }));
            }}
            autoComplete="name" minLength={2} maxLength={150} placeholder="Juan Dela Cruz" required />
                        </div>
            <div className="input-group">
                <label htmlFor="email">Email:</label>
                <input type="email" id="email"name="email"  value={email}
            className={errors.email ? "error-input" : ""}
            onChange={(e) => {
                setEmail(e.target.value.trim());
                clearError("email");
            }}
            autoComplete="email"
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
                onChange={(e) => {
                    let v = e.target.value.replace(/[^\d+]/g, "");
                    v = v.replace(/(?!^)\+/g, "");

                    if (v.startsWith("+") && !v.startsWith("+63")) v = "+63";
                    if (v.startsWith("0") && !v.startsWith("09")) v = "09";

                    setPhone(v);
                }}
                inputMode="numeric"
                placeholder="+63XXXXXXXXXX"
                pattern="^(\+63|09)\d{9}$"
                maxLength={13}
                autoComplete="tel"
                required
                />
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
            <div className="input-group">
            <label htmlFor="dob">Date of Birth:</label>
           <input
            type="date"
            id="dob"
            name="dob"
            value={dob}
            max={today}  // ✅ blocks dates beyond current date/year
            className={errors.dob ? "error-input" : ""}
            onChange={(e) => {
            setDob(e.target.value);
            clearError("dob");
            }}
            required
            />
            {errors.dob && <div className="error-text">{errors.dob} </div>}
            </div>
            </div>
            <div className="row">
                <div className="input-group">
            <label htmlFor="Province">Province:</label>
            <select id="province" name="province_id" value={provinceId} onChange={(e) => setProvinceId(e.target.value)} required>
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
            <label htmlFor="Municipality">Municipality</label>  
            <select id="municipality" name="municipality_id" value={municipalityId} onChange={(e) => setMunicipalityId(e.target.value)} disabled={!provinceId} required >
            <option value="">Select Municipality</option>
            {municipalities.map((m) => (<option key={m.id} value={m.id}> {m.name}
            </option>
            ))}
            </select>
            {errors.municipalityId && <div className="error-text">{errors.municipalityId}</div>}
            </div>
            <div className="input-group">
              <label htmlFor="Barangay">Barangay</label>
            <select id="barangay" name="barangay_id" value={barangayId} onChange={(e) => setBarangayId(e.target.value)} disabled={!municipalityId} required>
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
            required
            />
            {errors.address && <div className="error-text">{errors.address}</div>}
            <label htmlFor="password">Password:</label>

<div className="password-field">
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

  <span className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
    {showPassword ? <FiEyeOff /> : <FiEye />}
  </span>
</div>
            {errors.password && <div className="error-text">{errors.password}</div>}
                <label htmlFor="confirm-password">Confirm Password:</label>

<div className="password-field">
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

  <span
    className="eye-icon"
    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
  >
    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
  </span>
</div>
                {errors.confirmPassword && <div className="error-text">{errors.confirmPassword}</div>}
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
            <p className="terms-privacy">By signing up, you agree to our Terms of Service and Privacy Policy.</p>
            <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing up..." : "Sign Up"}
            </button>
            <p className="login-link">Already have an account? <a href="/signin" style={{color: '#004D40'}}>Login here</a>.</p>
        </form>
        </div>
        </div>
        </div>
          {toast.open && (
      <div className={`toast toast-${toast.type}`}>
        {toast.message}
      </div>)}
      </div>
    );
    }
    export default Signup;