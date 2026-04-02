import { useState } from "react";
import profile from "../img/profile1.jpg";
import "./AdminProfile.css";
import SidebarAdmin from "./SidebarAdmin";
import searchIcon from "../img/search.png";
import logo from "../img/logo.png";

function AdminProfile() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [username, setUsername] = useState("Hello World");
  const [email, setEmail] = useState("helloworld@gmail.com");

  const [tempUsername, setTempUsername] = useState(username);
  const [tempEmail, setTempEmail] = useState(email);

  const handleEdit = () => {
    setTempUsername(username);
    setTempEmail(email);
    setIsEditing(true);
  };

  const handleSave = () => {
    setUsername(tempUsername);
    setEmail(tempEmail);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempUsername(username);
    setTempEmail(email);
    setIsEditing(false);
  };

  return (
    <>
      <SidebarAdmin
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
      />

      <header className="app-header">
        <div className="header-left">
          <img src={logo} alt="CUIDADO logo" className="brand-logo" />

          <div className="header-search">
            <input type="text" placeholder="Search keywords..." />
            <button aria-label="Search" type="button" className="search-btn">
              <img src={searchIcon} alt="Search" />
            </button>
          </div>
        </div>

        <nav className="header-nav">
          <a className="nav-link" href="../admin/dashboard">
            Home
          </a>
          <a className="nav-link" href="../admin/appointments">
            Appointments
          </a>

          <div className={`profile-menu ${headerProfileOpen ? "open" : ""}`}>
            <button
              type="button"
              className="nav-link profile-btn"
              onClick={() => setHeaderProfileOpen((v) => !v)}
            >
              Profile <span className="caret">▾</span>
            </button>

            <div className="profile-dropdown">
              <a href="#">My Profile</a>
              <a href="#">Settings</a>
              <a href="#">Logout</a>
            </div>
          </div>
        </nav>
      </header>

      <div className="Profile">
        <h1 className="profileTitle">Profile</h1>

        <div className="divider">
          ----------------------------------------------------------------------------------------
        </div>

        <div className="profileLayout">
          <div className="leftSection">
            <div className="left">
              <div className="Container">
                <button className="edit">Edit Profile Pic</button>

                <div className="card">
                  <img src={profile} alt="Profile" />
                </div>

                <h2 className="name">{username}</h2>
              </div>
            </div>
          </div>

          <div className="right">
            <div className="detailsCard">
              <h2 className="detailsTitle">Bio and other details</h2>

              <div className="detailsGrid">
                <div className="detailsColumn">
                  <div className="detailField">
                    <label>Email</label>
                    {isEditing ? (
                      <input
                        className="detailInput"
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                      />
                    ) : (
                      <div className="detailValue">{email}</div>
                    )}
                  </div>

                  <div className="detailField">
                    <label>Password</label>
                    <div className="passwordRow">
                      <div className="detailValue">********************</div>
                      <button className="miniEditBtn">Edit</button>
                    </div>
                  </div>

                  <div className="detailField">
                    <label>Username</label>
                    {isEditing ? (
                      <input
                        className="detailInput"
                        value={tempUsername}
                        onChange={(e) => setTempUsername(e.target.value)}
                      />
                    ) : (
                      <div className="detailValue">{username}</div>
                    )}
                  </div>

                  <div className="detailField">
                    <label>Date of birth</label>
                    <div className="detailValue">september 14 , 1990</div>
                  </div>
                </div>

                <div className="detailsColumn">
                  <div className="detailField">
                    <label>Gender</label>
                    <div className="detailValue">prefer not to say</div>
                  </div>
                </div>
              </div>

              <div className="detailsFooter">
                {!isEditing ? (
                  <button className="editDetailsBtn" onClick={handleEdit}>
                    Edit details
                  </button>
                ) : (
                  <div className="editButtons">
                    <button className="cancelBtn" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button className="saveBtn" onClick={handleSave}>
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="archiveSection">
            <h2 className="archiveTitle"></h2>

            <div className="archiveCard">
              <div className="archiveHeader">
                <span>Archive 📖</span>
                <button className="seeMoreBtn">see more</button>
              </div>

              <div className="archiveTags">
                <span>Heart Attack</span>
                <span>Migraine</span>
                <span>Sunburn</span>
              </div>
            </div>

            <div className="archiveCard">
              <div className="archiveHeader">
                <span>Recently viewed ⏱</span>
                <button className="seeMoreBtn">see more</button>
              </div>

              <div className="archiveTags">
                <span>Sore Throat</span>
                <span>Diarrhea</span>
                <span>Ache</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminProfile;