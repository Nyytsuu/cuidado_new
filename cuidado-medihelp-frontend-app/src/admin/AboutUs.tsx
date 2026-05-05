import { useState } from "react";
import "./AboutUs.css";


import SidebarAdmin from "./SidebarAdmin";

export default function AboutUs() {
  
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

    
      <div className="about">
       
        <section className="about__hero">
          <h1 className="about__title">ABOUT US</h1>
        </section>

        
        <section className="about__content">
          <div className="about__grid">
            <div className="about__left">
              <h2 className="about__heading">
                OUR STORY <span className="about__underline" />
              </h2>

              <p className="about__text">
                No more risks in self-medication, Cuidado provides the right
                information.
              </p>
            </div>

            <div className="about__right">
              <p className="about__text">
                At Cuidado, we believe that good health starts with the right
                information. Many people turn to self-medication, which can often
                lead to risks and complications. That’s why we created Cuidado, a
                smart health companion designed to guide you safely and
                conveniently.
              </p>

              <div className="about__list">
                < p className ="about__text">
                Type your symptoms and get medicine recommendations
                Search for medicines and learn their uses
                Access voice assistance for easy navigation</p>
              </div>

              <p className="about__text">
                With Cuidado, safe health care is always at your fingertips.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}