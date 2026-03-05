import "./ForgetPass.css";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EmailSent from "../admin/EmailSent"; // ✅ adjust path if EmailSent is in same folder: "./EmailSent"

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const navigate = useNavigate();

  // ✅ Send OTP (used by Submit + Resend)
  const sendOtp = async () => {
    const res = await fetch("http://localhost:5000/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, purpose: "forgot_password" }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to send OTP.");

    // ✅ store email for OTP verify page
    sessionStorage.setItem("fp_email", email);
  };

  // ✅ Submit form
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("");

    if (!email.trim()) {
      setStatus("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      await sendOtp();
      setShowEmailSent(true); // ✅ open popup
    } catch (err: any) {
      console.error("OTP SEND ERROR:", err);
      setStatus(err?.message || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Open Email Box / Continue
  const handleOpenEmailBox = () => {
    setShowEmailSent(false);
    navigate("/verify-otp"); // ✅ your OTP page route
  };

  // ✅ Resend Email (re-send OTP)
  const handleResend = async () => {
    setStatus("");
    setLoading(true);
    try {
      await sendOtp();
      // optional: keep popup open, no need to do anything else
    } catch (err: any) {
      console.error("OTP RESEND ERROR:", err);
      setStatus(err?.message || "Failed to resend OTP.");
      setShowEmailSent(false); // optional: close popup on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-page">
      <div className="fp-card">
        <div className="fp-icon">
          <div className="fp-lock"></div>
        </div>

        <h2 className="fp-title">Forgot Password?</h2>

        <form className="fp-form" onSubmit={handleSubmit}>
          <div className="fp-input-wrap">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <span className="fp-mail">✉</span>
          </div>

          {/* ✅ error / status (only show when popup is not open) */}
          {status && !showEmailSent && (
            <div style={{ fontSize: 14, color: "#b00020", marginTop: -4 }}>
              {status}
            </div>
          )}

          <button className="fp-btn" type="submit" disabled={loading}>
            <span>{loading ? "Sending..." : "Send Email"}</span>
          </button>

          <Link className="fp-back" to="/signin">
            Back to login
          </Link>
        </form>
      </div>

      {/* ✅ POPUP */}
      {showEmailSent && (
        <div
          className="fp-modal-overlay"
          onClick={() => setShowEmailSent(false)}
        >
          <div className="fp-modal" onClick={(e) => e.stopPropagation()}>
            <EmailSent
              onOpenEmail={handleOpenEmailBox}
              onResend={handleResend}
            />

            {/* ✅ Optional: if you still want your Continue button under it */}
            {/* 
            <div
              style={{
                position: "absolute",
                bottom: 30,
                left: 0,
                right: 0,
                display: "grid",
                placeItems: "center",
              }}
            >
              <button className="fp-btn" type="button" onClick={handleOpenEmailBox}>
                <span>Continue</span>
              </button>
            </div> 
            */}
          </div>
        </div>
      )}
    </div>
  );
}