import "./Signin.css";
import { useState } from "react";
import { login } from "../api/api";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiX } from "react-icons/fi";
import ReCAPTCHA from "react-google-recaptcha";

import ForgotPassword from "./Forgetpass";
import OtpPopup from "../SigninUser/OtpPopup";
import Changepass from "../SigninUser/Changepass";
import PasswordChanged from "../SigninUser/PasswordChanged";

type FPFlowStep = "forgot" | "otp" | "change" | "success";

function Signin() {
  const navigate = useNavigate();

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // failed login / captcha
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState("");

  // error popup
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  // forgot flow state
  const [fpOpen, setFpOpen] = useState(false);
  const [fpStep, setFpStep] = useState<FPFlowStep>("forgot");
  const [fpEmail, setFpEmail] = useState("");

  // OTP UI state
  const [otpError, setOtpError] = useState<string>("");
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);

  const apiBase = "http://localhost:5000";
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const showCaptcha = failedAttempts >= 5;

  const closeAllFp = () => {
    setFpOpen(false);
    setFpStep("forgot");
    setFpEmail("");
    setOtpError("");
    setLoadingConfirm(false);
    setLoadingResend(false);

    sessionStorage.removeItem("fp_email");
    sessionStorage.removeItem("resetToken");
  };

  const openForgot = () => {
    setFpOpen(true);
    setFpStep("forgot");
    setOtpError("");
  };

  const handlePasswordResetSuccess = () => {
    setOtpError("");
    setFpStep("success");
  };

  // login submit
  // login submit
const onLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setLoading(true);
  setLoginError("");

  // require captcha after 5 failed attempts
  if (showCaptcha && !captchaToken) {
    setLoginError("Please complete the CAPTCHA first.");
    setLoading(false);
    return;
  }

  console.log("CAPTCHA KEY:", siteKey);

  try {
    const data = await login(email, password, captchaToken || undefined);

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.user.role);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("userId", String(data.user.id));

    // reset on success
    setFailedAttempts(0);
    setCaptchaToken(null);

    if (data.user.role === "admin") navigate("/admin/dashboard", { replace: true });
    else if (data.user.role === "clinic") navigate("/clinic/dashboard", { replace: true });
    else navigate("/homepage", { replace: true });
  } catch (err: any) {
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    setLoginError(err.message || "Login failed.");

    if (newAttempts >= 5) {
      setCaptchaToken(null);
    }
  } finally {
    setLoading(false);
  }
};
  // 1) send otp
  const sendOtp = async (emailToSend: string) => {
    const res = await fetch(`${apiBase}/api/auth/otp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: emailToSend,
        purpose: "forgot_password",
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data?.message || "Failed to send OTP.");

    sessionStorage.setItem("fp_email", emailToSend);
  };

  const handleForgotSubmit = async (emailToSend: string) => {
    setOtpError("");
    await sendOtp(emailToSend);
    setFpEmail(emailToSend);
    setFpStep("otp");
  };

  const handleConfirmOtp = async (otp: string) => {
    setOtpError("");
    setLoadingConfirm(true);

    try {
      const emailSaved = sessionStorage.getItem("fp_email") || fpEmail;

      const res = await fetch(`${apiBase}/api/auth/otp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: emailSaved,
          otp,
          purpose: "forgot_password",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setOtpError(data?.message || "Invalid OTP.");
        return;
      }

      const resetToken = data?.resetToken || data?.token;

      if (!resetToken) {
        setOtpError("Missing reset token from server.");
        return;
      }

      sessionStorage.setItem("resetToken", resetToken);
      setFpStep("change");

    } catch (err: any) {
      setOtpError(err?.message || "Server error.");
    } finally {
      setLoadingConfirm(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError("");
    setLoadingResend(true);

    try {
      const emailSaved = sessionStorage.getItem("fp_email") || fpEmail;
      await sendOtp(emailSaved);
    } catch (err: any) {
      setOtpError(err?.message || "Failed to resend OTP.");
    } finally {
      setLoadingResend(false);
    }
  };

  const closeSuccess = () => {
    closeAllFp();
  };
console.log("CAPTCHA KEY:", siteKey);
  return (
    <div className="signin-container">
      <div className="left-side">
        <div className="login-card">
          <h1>LOGIN</h1>

          <form onSubmit={onLogin}>
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <span
                className="eye-icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>

            <p className="forgot">
              Forgot Password?{" "}
              <span className="forgot-link" onClick={openForgot}>
                Click here
              </span>
            </p>

            {loginError && (
              <p style={{ color: "red", fontSize: "14px" }}>
                {loginError}
              </p>
            )}

            {showCaptcha && (
  <div className="captcha-wrap">
    {!siteKey ? (
      <p className="captcha-error">
        Missing reCAPTCHA site key.
      </p>
    ) : (
      <div className="captcha-box">
        <ReCAPTCHA
          sitekey={siteKey}
          onChange={(token) => setCaptchaToken(token)}
          onExpired={() => setCaptchaToken(null)}
        />
      </div>
    )}
  </div>
)}

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <p
              style={{
                marginTop: 10,
                fontSize: 14,
                textAlign: "center",
              }}
            >
              Don’t have an account?{" "}
              <Link to="/signup" style={{ color: "#004D40" }}>
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>


      <div className="right-side">
        <div className="right-content">
          <div className="brand">
            <img src="/src/img/logo.png" alt="logo" />
          </div>

          <div className="bottom-text">
            <h2>
              GOOD TO SEE <br /> YOU AGAIN!
            </h2>

            <p>
              Log in to continue your journey toward better health and
              manage your appointments with ease.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {fpOpen && (
        <div className="fp-modal-overlay" onClick={closeAllFp}>
          <div
            className="fp-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="fp-modal-close"
              type="button"
              onClick={closeAllFp}
            >
              <FiX />
            </button>

            {fpStep === "forgot" && (
              <ForgotPassword
                onClose={closeAllFp}
                onSubmitEmail={handleForgotSubmit}
              />
            )}

            {fpStep === "otp" && (
              <OtpPopup
                open={true}
                email={fpEmail}
                error={otpError}
                loadingConfirm={loadingConfirm}
                loadingResend={loadingResend}
                onClose={closeAllFp}
                onConfirm={handleConfirmOtp}
                onResend={handleResendOtp}
              />
            )}

            {fpStep === "change" && (
              <Changepass
                onClose={closeAllFp}
                onSuccess={handlePasswordResetSuccess}
              />
            )}

            {fpStep === "success" && (
              <PasswordChanged onClose={closeSuccess} />
            )}
          </div>
        </div>
      )}

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="error-popup-overlay">
          <div className="error-popup">
            <h2>Too Many Failed Attempts</h2>
            <p>You entered the wrong password multiple times.</p>
            <p>Please try again carefully.</p>

            <button
              onClick={() => setShowErrorPopup(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Signin;