import React, { useState } from "react";
import "./Changedpass.css";
import { FiEye, FiEyeOff } from "react-icons/fi";

type Props = {
  onClose?: () => void;
  onSuccess: () => void;
};

type ToastState = {
  open: boolean;
  message: string;
  type: "error" | "success" | "info";
};

export default function Changepass({ onClose, onSuccess }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [rePassword, setRePassword] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [showRe, setShowRe] = useState(false);

  const [loading, setLoading] = useState(false);

  const [touchedNew, setTouchedNew] = useState(false);
  const [touchedRe, setTouchedRe] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const showToast = (message: string, type: ToastState["type"] = "info") => {
    setToast({ open: true, message, type });
    window.setTimeout(() => {
      setToast((t) => ({ ...t, open: false }));
    }, 3000);
  };

  const apiBase = "http://localhost:5000";

  const hasMinLen = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

  const passwordOk = hasMinLen && hasUpper && hasLower && hasNumber && hasSymbol;
  const passwordsMatch = newPassword === rePassword;

  const newPwError = touchedNew && !passwordOk;
  const rePwError = touchedRe && rePassword.length > 0 && !passwordsMatch;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setTouchedNew(true);
    setTouchedRe(true);

    if (!passwordOk) {
      showToast(
        "Password must contain 8+ characters, uppercase, lowercase, number, and symbol.",
        "error"
      );
      return;
    }

    if (!passwordsMatch) {
      showToast("Passwords do not match.", "error");
      return;
    }

    const email = sessionStorage.getItem("fp_email");
    const resetToken = sessionStorage.getItem("resetToken");

    if (!email || !resetToken) {
      showToast("Missing reset session. Please request OTP again.", "error");
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
        showToast(data?.message || "Failed to reset password.", "error");
        return;
      }

      sessionStorage.removeItem("fp_email");
      sessionStorage.removeItem("resetToken");

      showToast("Password changed successfully!", "success");

      onSuccess();
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);
      showToast("Server error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fpr-card">
      <div className="fpr-icon" />

      <h1 className="fpr-title">Forgot Password?</h1>

      <form className="fpr-form" onSubmit={handleSubmit}>
        {/* NEW PASSWORD */}
        <div className="fpr-input-wrap">
          <input
            className={`fpr-input ${newPwError ? "fpr-input-error" : ""}`}
            type={showNew ? "text" : "password"}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (!touchedNew) setTouchedNew(true);
            }}
            onBlur={() => setTouchedNew(true)}
            required
          />

          <span className="fpr-eye" onClick={() => setShowNew(!showNew)}>
            {showNew ? <FiEyeOff /> : <FiEye />}
          </span>
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="fpr-input-wrap">
          <input
            className={`fpr-input ${rePwError ? "fpr-input-error" : ""}`}
            type={showRe ? "text" : "password"}
            placeholder="Re-enter Password"
            value={rePassword}
            onChange={(e) => {
              setRePassword(e.target.value);
              if (!touchedRe) setTouchedRe(true);
            }}
            onBlur={() => setTouchedRe(true)}
            required
          />

          <span className="fpr-eye" onClick={() => setShowRe(!showRe)}>
            {showRe ? <FiEyeOff /> : <FiEye />}
          </span>
        </div>

        <button className="fpr-btn" type="submit" disabled={loading}>
          {loading ? "Changing..." : "Change Password"}
        </button>

        {onClose && (
          <button type="button" className="fpr-cancel" onClick={onClose}>
            Cancel
          </button>
        )}
      </form>

      {/* TOAST CENTERED INSIDE MODAL */}
      {toast.open && (
        <div className="fpr-toast-wrap">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </div>
  );
}