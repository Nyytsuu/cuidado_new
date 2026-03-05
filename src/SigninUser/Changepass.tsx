import React, { useState } from "react";
import "./Changedpass.css";
import { FiEye, FiEyeOff } from "react-icons/fi";

type Props = {
  onClose?: () => void;
  onSuccess: () => void; // this should set fpStep("success") in Signin
};

export default function Changepass({ onClose, onSuccess }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [rePassword, setRePassword] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [showRe, setShowRe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const apiBase = "http://localhost:5000";

  // ✅ password rules
  const hasMinLen = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

  const passwordOk = hasMinLen && hasUpper && hasLower && hasNumber && hasSymbol;
  const passwordsMatch = newPassword === rePassword;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("");

    // ✅ validations (no <p>, just warning text)
    if (!passwordOk) {
      setStatus(
        "Password must contain 8+ characters, uppercase, lowercase, number, and symbol."
      );
      return;
    }

    if (!passwordsMatch) {
      setStatus("Passwords do not match.");
      return;
    }

    const email = sessionStorage.getItem("fp_email");
    const resetToken = sessionStorage.getItem("resetToken");

    if (!email || !resetToken) {
      setStatus("Missing reset session. Please request OTP again.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetToken, newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(data?.message || "Failed to reset password.");
        return;
      }

      // ✅ clear session + fields
      sessionStorage.removeItem("fp_email");
      sessionStorage.removeItem("resetToken");
      setNewPassword("");
      setRePassword("");

      // ✅ GO TO PasswordChanged POPUP RIGHT AWAY
      onSuccess();
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);
      setStatus("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fpr-card">
      <div className="fpr-icon" aria-hidden="true" />
      <h1 className="fpr-title">Forgot Password?</h1>

      <form className="fpr-form" onSubmit={handleSubmit}>
        {/* NEW PASSWORD */}
        <div className="fpr-input-wrap">
          <input
            className={`fpr-input ${
              status.includes("Password must") ? "fpr-input-error" : ""
            }`}
            type={showNew ? "text" : "password"}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setStatus("");
            }}
            required
          />
          <span className="fpr-eye" onClick={() => setShowNew((p) => !p)}>
            {showNew ? <FiEyeOff /> : <FiEye />}
          </span>
        </div>

        {/* RE-ENTER PASSWORD */}
        <div className="fpr-input-wrap">
          <input
            className={`fpr-input ${
              status.includes("match") ? "fpr-input-error" : ""
            }`}
            type={showRe ? "text" : "password"}
            placeholder="Re-enter Password"
            value={rePassword}
            onChange={(e) => {
              setRePassword(e.target.value);
              setStatus("");
            }}
            required
          />
          <span className="fpr-eye" onClick={() => setShowRe((p) => !p)}>
            {showRe ? <FiEyeOff /> : <FiEye />}
          </span>
        </div>

        {/* ✅ warning (no <p>) */}
        {status && <div className="fpr-status">{status}</div>}

        <button className="fpr-btn" type="submit" disabled={loading}>
          {loading ? "Changing..." : "Change Password"}
        </button>

        {onClose && (
          <button type="button" className="fpr-cancel" onClick={onClose}>
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}