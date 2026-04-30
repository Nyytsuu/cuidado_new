import "./ClinicSignin.css";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/api"; 

export default function Signin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await login(email, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userId", String(data.user.id));

      if (data.user.role === "admin") navigate("/admin");
      else if (data.user.role === "clinic") navigate("/clinic/dashboard");
      else navigate("/dashboard");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-container">
      {/* LEFT SIDE */}
      <div className="left-side">
        <div className="login-card">
          <h1>LOGIN</h1>

          {/* ✅ onSubmit added */}
          <form onSubmit={onLogin}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <p className="forgot">
              Forgot Password?{" "}
              <Link to="/forgot-password" style={{ color: "#004D40" }}>
                Click here
              </Link>
            </p>

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <p className="center-text" style={{ marginTop: "15px" }}>
              Don’t have an account?{" "}
              <Link to="/clinicsignup" style={{ color: "#004D40" }}>
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>

      <div className="logsides"></div>

      {/* RIGHT SIDE */}
      <div className="right-side">
        <div className="right-content">
          <img
            src="/src/img/logo.png"
            alt="CUIDADO"
            className="cs-brand-img"
          />

          <div className="bottom-text">
            <h2>GOOD TO SEE YOU AGAIN!</h2>
            <p>
              Log in to continue your journey toward better health and manage your
              appointments with ease.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
