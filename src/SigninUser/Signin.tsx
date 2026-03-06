import "./Signin.css";
import { useState } from "react";
import { login } from "../api/api";
import { Link, useNavigate } from "react-router-dom";
function Signin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
const onLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setLoading(true);

  try {
    const data = await login(email, password);
    console.log("LOGIN RESPONSE:", data);
    // ✅ save token + role 
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.user.role);
    
    // ✅ redirect based on role
    if (data.user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    } 
    else if (data.user.role === "clinic") {
      navigate("/clinic/dashboard", { replace: true });
    } 
    else {
      navigate("/user/dashboard", { replace: true });
    }

  } catch (err: any) {
    alert(err.message);
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="signin-container">
      <div className="left-side">
        <div className="login-card">
          <h1>LOGIN</h1>

          <form onSubmit={onLogin}>
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

            <p style={{ marginTop: 10, fontSize: 14, textAlign: "center" }}>
              Don’t have an account?{" "}
              <Link to="/signup" style={{ color: "#004D40" }}>
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>

        <div className="logsides"></div>

      <div className="right-side">
        <div className="right-content">
          <div className="brand"><img src="/src/img/logo.png" alt="logo" /></div>
             <div className="bottom-text">
                <h2>GOOD TO SEE <br></br> YOU AGAIN!</h2>
                 <p>
                     Log in to continue your journey toward better health and manage
                     your appointments with ease.
                </p>
             </div>
        </div>
      </div>
    </div>
  );
}

export default Signin;