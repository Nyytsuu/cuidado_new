import React, { useState } from "react";
import "./ForgotPass1.css";
import PasswordChanged from "./PasswordChanged"; // ✅ adjust path if needed

export default function ForgotPass1() {
  const [newPassword, setNewPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (newPassword !== rePassword) {
      alert("Passwords do not match.");
      return;
    }

    // ✅ show popup instead of alert
    setShowSuccess(true);
  };

  return (
    <div className="fpr-page">
      <div className="fpr-card">
        <div className="fpr-icon" aria-hidden="true" />

        <h1 className="fpr-title">Forgot Password?</h1>

        <form className="fpr-form" onSubmit={handleSubmit}>
          <input
            className="fpr-input"
            type="text"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <input
            className="fpr-input"
            type="text"
            placeholder="Re-enter Password"
            value={rePassword}
            onChange={(e) => setRePassword(e.target.value)}
            required
          />

          <button className="fpr-btn" type="submit">
            Change Password
          </button>
        </form>
      </div>

      {/* ✅ POPUP OVERLAY */}
      {showSuccess && (
        <div className="fpr-modal-overlay" onClick={() => setShowSuccess(false)}>
          <div className="fpr-modal" onClick={(e) => e.stopPropagation()}>
            <PasswordChanged onClose={() => setShowSuccess(false)} />
          </div>
        </div>
      )}
    </div>
  );
}