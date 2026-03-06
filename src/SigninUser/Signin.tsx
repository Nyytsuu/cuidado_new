import "./Signin.css";
import { useState } from "react";
import { login } from "../api/api";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiX } from "react-icons/fi";

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

  // forgot flow state
  const [fpOpen, setFpOpen] = useState(false);
  const [fpStep, setFpStep] = useState<FPFlowStep>("forgot");
  const [fpEmail, setFpEmail] = useState("");

  // OTP UI state
  const [otpError, setOtpError] = useState<string>("");
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);

  const apiBase = "http://localhost:5000";

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

  // ✅ THIS is the missing connection
  const handlePasswordResetSuccess = () => {
    setOtpError("");
    setFpStep("success"); // <-- show PasswordChanged
  };

  // login submit
  const onLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await login(email, password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);

      if (data.user.role === "admin") navigate("/admin/dashboard", { replace: true });
      else if (data.user.role === "clinic") navigate("/clinic/dashboard", { replace: true });
      else navigate("/user/dashboard", { replace: true });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 1) send otp
  const sendOtp = async (emailToSend: string) => {
    const res = await fetch(`${apiBase}/api/auth/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: emailToSend, purpose: "forgot_password" }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to send OTP.");

    sessionStorage.setItem("fp_email", emailToSend);
  };

  // called from ForgotPassword modal
  const handleForgotSubmit = async (emailToSend: string) => {
    setOtpError("");
    await sendOtp(emailToSend);
    setFpEmail(emailToSend);
    setFpStep("otp");
  };

  // 2) confirm otp -> get resetToken
  const handleConfirmOtp = async (otp: string) => {
    setOtpError("");
    setLoadingConfirm(true);

    try {
      const emailSaved = sessionStorage.getItem("fp_email") || fpEmail;

      const res = await fetch(`${apiBase}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // 3) resend otp
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

  // close success -> back to sign in
  const closeSuccess = () => {
    closeAllFp();
  };

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
              <span className="eye-icon" onClick={() => setShowPassword((p) => !p)}>
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>

            <p className="forgot">
              Forgot Password?{" "}
              <span className="forgot-link" onClick={openForgot}>
                Click here
              </span>
            </p>

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <p style={{ marginTop: 10, fontSize: 14, textAlign: "center" }}>
              Don’t have an account?{" "}
              <Link to="/signup" style={{ color: "#004D40" }}>
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>

      <div className="logsides"></div>

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
              Log in to continue your journey toward better health and manage your
              appointments with ease.
            </p>
          </div>
        </div>
      </div>

      {/* ✅ ONE OVERLAY, MANY STEPS */}
      {fpOpen && (
        <div className="fp-modal-overlay" onClick={closeAllFp}>
          <div className="fp-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="fp-modal-close" type="button" onClick={closeAllFp}>
              <FiX />
            </button>

            {fpStep === "forgot" && (
              <ForgotPassword onClose={closeAllFp} onSubmitEmail={handleForgotSubmit} />
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
              <Changepass onClose={closeAllFp} onSuccess={handlePasswordResetSuccess} />
            )}

            {fpStep === "success" && <PasswordChanged onClose={closeSuccess} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default Signin;