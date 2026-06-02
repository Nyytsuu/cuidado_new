import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AdminHeader.css";
import logo from "../img/logo.png";
import searchIcon from "../img/search.png";

interface AdminHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
}

export default function AdminHeader({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search keywords...",
}: AdminHeaderProps) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("admin_token");
    navigate("/signin", { replace: true });
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <img src={logo} alt="CUIDADO logo" className="brand-logo" />

        <form
          className="header-search"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button aria-label="Search" type="submit" className="search-btn">
            <img src={searchIcon} alt="Search" />
          </button>
        </form>
      </div>

      <nav className="header-nav">
        <Link className="nav-link" to="/admin/dashboard">
          Home
        </Link>
        <Link className="nav-link" to="/admin/appointments">
          Appointments
        </Link>

        <div className={`profile-menu ${profileOpen ? "open" : ""}`}>
          <button
            type="button"
            className="nav-link profile-btn"
            onClick={() => setProfileOpen((v) => !v)}
          >
            Profile <span className="caret">▾</span>
          </button>

          <div className="profile-dropdown">
            <Link to="/admin/profile">My Profile</Link>
            <button
              type="button"
              className="dropdown-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
