import { useState } from "react";
import profile from "../img/profile1.jpg";
import "./AdminProfile.css";
import passwordIcon from "../img/passwordicon.png";

import SidebarAdmin from "./SidebarAdmin"; 

function AdminProfile() {
 
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [username, setUsername] = useState("keez");
  const [email, setEmail] = useState("kezo@gmail.com");

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
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <div className="Profile">
        <h1 className="profileTitle">Profile</h1>

        <div className="divider">
          --------------------------------------------------------------------------
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

            <button className="changepass">
              <img src={passwordIcon} alt="password icon" className="passIcon"/>
              Change Password
            </button>

            <button className="logout">Logout</button>
          </div>

          <div className="Dividermid"></div>

          <div className="right">
            <div className="infoBox">

              <div className="field">
                <label>Username:</label>
                <input
                  value={isEditing ? tempUsername : username}
                  readOnly={!isEditing}
                  onChange={(e) => setTempUsername(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Email:</label>
                <input
                  value={isEditing ? tempEmail : email}
                  readOnly={!isEditing}
                  onChange={(e) => setTempEmail(e.target.value)}
                />
              </div>

            </div>

            {!isEditing && (
              <button className="editProfileBtn" onClick={handleEdit}>
                Edit Profile
              </button>
            )}

            {isEditing && (
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
    </>
  );
}

export default AdminProfile;