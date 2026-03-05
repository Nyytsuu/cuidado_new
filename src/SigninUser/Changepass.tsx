import React, { useState } from "react";
import "./Changedpass.css";
import PasswordChanged from "./PasswordChanged"; // ✅ adjust path if needed
import { useNavigate } from "react-router-dom";

export default function Changepass() {
  const [newPassword, setNewPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const navigate = useNavigate();
  const apiBase = "http://localhost:5000";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("");

    // ✅ validations
    if (newPassword !== rePassword) {
      setStatus("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setStatus("Password must be at least 8 characters.");
      return;
    }

    // ✅ get email + resetToken saved from previous steps
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
        body: JSON.stringify({
          email,
          resetToken,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(data?.message || "Failed to reset password.");
        return;
      }

      // ✅ success popup
      setShowSuccess(true);

      // ✅ clear stored session
      sessionStorage.removeItem("fp_email");
      sessionStorage.removeItem("resetToken");

      // optional: clear inputs
      setNewPassword("");
      setRePassword("");
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);
      setStatus("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const closePopup = () => {
    setShowSuccess(false);
    navigate("/signin"); // ✅ go back to login after success
  };

  return (
    <div className="fpr-page">
      <div className="fpr-card">
        <div className="fpr-icon" aria-hidden="true" />

        <h1 className="fpr-title">Change Password</h1>

        <form className="fpr-form" onSubmit={handleSubmit}>
          <input
            className="fpr-input"
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <input
            className="fpr-input"
            type="password"
            placeholder="Re-enter Password"
            value={rePassword}
            onChange={(e) => setRePassword(e.target.value)}
            required
          />

          {/* ✅ status/error message */}
          {status && (
            <div style={{ marginTop: 8, fontSize: 14, color: "#b00020" }}>
              {status}
            </div>
          )}

          <button className="fpr-btn" type="submit" disabled={loading}>
            {loading ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* ✅ POPUP OVERLAY */}
      {showSuccess && (
        <div className="fpr-modal-overlay" onClick={closePopup}>
          <div className="fpr-modal" onClick={(e) => e.stopPropagation()}>
            <PasswordChanged onClose={closePopup} />
          </div>
        </div>
      )}
    </div>
  );
}