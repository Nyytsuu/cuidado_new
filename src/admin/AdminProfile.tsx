import { useState } from "react";
import profile from "../img/profile1.jpg";
import "./AdminProfile.css";


import SidebarAdmin from "./SidebarAdmin"; 

function Adminprofile() {
 
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

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

                <h2 className="name">Kezo</h2>
              </div>
            </div>

            <button className="changepass">Change Password</button>
            <button className="logout">Logout</button>
          </div>

          <div className="Dividermid"></div>

          <div className="right">
            <div className="infoBox">
              <div className="field">
                <label>Username:</label>
                <input value="keez" readOnly />
              </div>

              <div className="field">
                <label>Email:</label>
                <input value="kezo@gmail.com" readOnly />
              </div>
            </div>

            <button className="editProfileBtn">Edit Profile</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Adminprofile;