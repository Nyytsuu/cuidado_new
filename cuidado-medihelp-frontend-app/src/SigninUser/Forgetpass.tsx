import "./ForgetPass.css";
import { useState } from "react";

type Props = {
  onClose?: () => void;
    onSubmitEmail?: (email: string) => Promise<void>;
};

export default function ForgotPassword({ onClose, onSubmitEmail }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("");

    if (!email.trim()) {
      setStatus("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      await onSubmitEmail(email.trim());
    } catch (err: any) {
      setStatus(err?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
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

        {status && (
          <div style={{ fontSize: 14, color: "#b00020", marginTop: -4 }}>
            {status}
          </div>
        )}

        <button className="fp-btn" type="submit" disabled={loading}>
          <span>{loading ? "Sending..." : "Send Email"}</span>
        </button>

        <button type="button" className="fp-back-btn" onClick={() => onClose?.()}>
          Back to login
        </button>
      </form>
    </div>
  );
}