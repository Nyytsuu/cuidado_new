import React from "react";
import "./EmailSent.css";
import image10 from "../img/calendar.png";

type Props = {
  onOpenEmail: () => void;
  onResend: () => void;
};

const EmailSent: React.FC<Props> = ({ onOpenEmail, onResend }) => {
  return (
    <div className="email-page">
      <div className="email-card">

        {/* Email Icon */}
        <div className="email-icon">
          <img src={image10} alt="Email sent" />
        </div>

        <h1 className="email-title">Email Sent!</h1>

        <p className="email-body">
          <strong>Thanks!</strong> We've sent a <b>6-digit verification code</b> to your
          email address. Please check your inbox and enter the code to continue
          resetting your password.
          <br /><br />
          If you don't receive the email, please check your spam folder or contact{" "}
          <a href="mailto:cuidadosupport@gmail.com">
            cuidadosupport@gmail.com
          </a>.
        </p>

        {/* OPEN EMAIL */}
        <button
          className="email-primary-btn"
          onClick={onOpenEmail}
        >
          Open Email Inbox
        </button>

        {/* RESEND EMAIL */}
        <button
          className="email-resend-btn"
          onClick={onResend}
        >
          <span className="chevron">‹</span>
          Resend Code
        </button>

      </div>
    </div>
  );
};

export default EmailSent;