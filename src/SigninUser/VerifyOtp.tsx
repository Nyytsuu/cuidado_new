import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./VerifyOtp.css";
import OtpPopup from "./OtpPopup"; // ✅ adjust path if different

export default function VerifyOtp() {
  const [open, setOpen] = useState(true);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>("");
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);

  const navigate = useNavigate();
  const apiBase = "http://localhost:5000";

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("fp_email") || "";
    setEmail(savedEmail);

    if (!savedEmail) {
      setError("No email found. Please go back and request OTP again.");
    }
  }, []);

  const onConfirm = async (otp: string) => {
    setError("");
    if (!email) return setError("Missing email. Please request OTP again.");

    setLoadingConfirm(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email,
          otp,
          purpose: "forgot_password",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Invalid OTP");

      sessionStorage.setItem("resetToken", data.resetToken);

      setOpen(false);
      navigate("/change-password"); 
    } catch (err: any) {
      setError(err?.message || "Verification failed");
    } finally {
      setLoadingConfirm(false);
    }
  };

  const onResend = async () => {
    setError("");
    if (!email) return setError("Missing email. Please request OTP again.");

    setLoadingResend(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, purpose: "forgot_password" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to resend OTP");
    } catch (err: any) {
      setError(err?.message || "Resend failed");
    } finally {
      setLoadingResend(false);
    }
  };

  const onClose = () => {
    setOpen(false);
    navigate("/forgot-password");
  };

  return (
    <div className="vo-page">
      <div className="vo-card">
        <div className="vo-icon" aria-hidden="true" />
        <h2 className="vo-title">Verify OTP</h2>
        <p className="vo-subtitle">
          We sent a 6-digit code to <b>{email || "your email"}</b>
        </p>

        {/* ✅ Your existing OTP popup UI */}
        <OtpPopup
          open={open}
          email={email}
          error={error}
          loadingConfirm={loadingConfirm}
          loadingResend={loadingResend}
          onClose={onClose}
          onConfirm={onConfirm}
          onResend={onResend}
        />
      </div>
    </div>
  );
}