import "./ForgetPass.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import EmailSent from "../admin/EmailSent";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [showEmailSent, setShowEmailSent] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // alert(`Reset link will be sent to: ${email}`);
    setShowEmailSent(true); // ✅ open popup
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

          <button className="fp-btn" type="submit">
            <span>Send Email</span>
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
            

            <EmailSent />
          </div>
        </div>
      )}
    </div>
  );
}