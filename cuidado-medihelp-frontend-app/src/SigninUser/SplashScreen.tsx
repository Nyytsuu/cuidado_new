import { useNavigate } from "react-router-dom";
import "./SplashScreen.css";
import logo from "../img/logo.png";

export default function SplashScreen() {
  const navigate = useNavigate();

  return (
    <div className="splash-screen">
      <button className="skip-btn" onClick={() => navigate("/signin")}>
        Skip
      </button>

      <img src={logo} alt="CUIDADO" className="splash-logo" />
    </div>
  );
}