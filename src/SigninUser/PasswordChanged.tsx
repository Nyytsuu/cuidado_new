import React from "react";
import { useNavigate } from "react-router-dom";
import "./PasswordChanged.css";
import image14 from "../img/image12.png"; // ✅ put your success image here (change name if different)

type Props = {
  onClose: () => void;
};

const PasswordChanged: React.FC<Props> = ({ onClose }) => {
  const navigate = useNavigate();

  return (
    <div className="pc-page" role="dialog" aria-modal="true">
      <div className="pc-card">
        <div className="pc-icon">
          <img src={image14} alt="Password changed" />
        </div>

        <h1 className="pc-title">Password Changed!</h1>
        <p className="pc-subtitle">You&apos;ve successfully changed your password</p>

        <button
          className="pc-btn"
          onClick={() => navigate("/signin")}
          type="button"
        >
          Back to Login Now
        </button>

        <button className="pc-close" onClick={onClose} type="button" aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  );
};

export default PasswordChanged;