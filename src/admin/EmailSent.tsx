import React from "react";
import "./EmailSent.css";
import image10 from "../img/calendar.png";

const EmailSent: React.FC = () => {
  return (
    <div className="email-page">
      <div className="email-card">

        {/* Email Icon */}
        <div className="email-icon">
          <img src={image10} alt="Email sent" />
        </div>

        <h1 className="email-title">Email Sent!</h1>

        <p className="email-body">
          <strong>Thanks!</strong> The email was sent that will ask you to click on
          a link to verify that you own the account. If you don't get the email
          please contact{" "}
          <a href="mailto:cuidadosupport@gmail.com">
            cuidadosupport@gmail.com
          </a>
        </p>

        <button className="email-primary-btn">
          Open Email Box
        </button>

        <button className="email-resend-btn">
          <span className="chevron">‹</span>
          Resend Email
        </button>

      </div>
    </div>
  );
};

export default EmailSent;