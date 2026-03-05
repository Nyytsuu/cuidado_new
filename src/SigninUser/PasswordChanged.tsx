import React from "react";
import "./PasswordChanged.css";
import image14 from "../img/image12.png";

type Props = {
  onClose: () => void;
};

const PasswordChanged: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="pc-card">
      <div className="pc-icon">
        <img src={image14} alt="Password changed" />
      </div>

      <h1 className="pc-title">Password Changed!</h1>
      <p className="pc-subtitle">You&apos;ve successfully changed your password.</p>

      <button className="pc-btn" onClick={onClose} type="button">
        Back to Login Now
      </button>
    </div>
  );
};

export default PasswordChanged;