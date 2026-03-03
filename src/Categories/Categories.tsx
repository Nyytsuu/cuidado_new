import { useState } from "react";
import "./Categories.css";
import Sidebar from "./Sidebar";
import searchIcon from "../img/search.png";
import diaImg from "../img/Dia.png";
import med1 from "../img/1.png";
import med2 from "../img/2.png";
import med3 from "../img/3.png";
import logo from "../img/logo.png";

export default function Categories() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  return (
    <div className={`with-sidebar ${isPopupOpen ? "modal-open" : ""}`}>
      <Sidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
      />

      <main className="preview-canvas">
        <header className="app-header">
          <div className="header-left">
            <img src={logo} alt="CUIDADO logo" className="brand-logo" />
          </div>

          <div className="header-search">
            <input type="text" placeholder="Search keywords..." />
            <button aria-label="Search" type="button" className="search-btn">
  <img src={searchIcon} alt="Search" />
</button>
          </div>
        </header>

        <div className="body">
          <div className="title">
            <img src={diaImg} alt="Diarrhea" />
            <div className="title-header">
              <h1>Diarrhea</h1>
            </div>
          </div>

          <div className="layer1">
            <div className="overview">
              <h2>Overview</h2>
              <p>
                Diarrhea — loose, watery and possibly more-frequent passage of stool — is a common problem.
                Sometimes, it's the only symptom of a condition. At other times, it may be associated with
                other symptoms, such as nausea, vomiting, abdominal pain or weight loss.
                <br /><br />
                Luckily, diarrhea is usually short-lived, lasting no more than a few days. But when diarrhea
                lasts beyond a few days, it is usually a clue to another problem — such as medicine side
                effects, changes in diet, irritable bowel syndrome (IBS), or a more serious disorder,
                including ongoing infection, celiac disease or inflammatory bowel disease (IBD).
              </p>
            </div>

            <div className="prevention">
              <div className="prevention-head">
                <h4>Prevention and Care</h4>
              </div>
              <div className="prevention-details">
                <p>
                  Wash frequently.<br />
                  Lather with soap for at least 20 seconds.<br />
                  Use hand sanitizer when washing isn't possible.<br />
                  Ask your health care team about antibiotics.<br />
                  Check for travel warnings.
                </p>
              </div>
            </div>
          </div>

          <div className="layer2">
            <div className="symptoms">
              <h3>Symptoms</h3>
              <ul>
                <li>Belly cramps or pain.</li>
                <li>Bloating.</li>
                <li>Nausea.</li>
                <li>Vomiting.</li>
                <li>Fever.</li>
                <li>Blood in the stool.</li>
              </ul>
            </div>

            <div className="causes">
              <h3>Causes</h3>
              <ul>
                <li>Viruses.</li>
                <li>Bacteria and parasites.</li>
                <li>Medicines.</li>
                <li>Lactose intolerance.</li>
                <li>Fructose.</li>
              </ul>
            </div>
          </div>

          <div className="layer3">
            <div className="left-box">
              <h3>THE</h3>
              <h1>HEALING CORNER</h1>
              <p>
                Here in Cuidado, we provide information — from trusted prescriptions to natural herbal
                remedies, all for your wellness.
              </p>
            </div>

            <div className="right-box">
              <div className="inner-boxes">
                <a href="#" className="box-link">
                  <div className="inner-box">
                    <img src={med1} alt="Prescribed Medicine" />
                    <h4>Prescribed Medicine</h4>
                  </div>
                </a>

                <a href="#" className="box-link">
                  <div className="inner-box">
                    <img src={med3} alt="Home Treatment" />
                    <h4>Home Treatment</h4>
                  </div>
                </a>

                <a href="#" className="box-link">
                  <div className="inner-box">
                    <img src={med2} alt="Herbal Medicine" />
                    <h4>Herbal Medicine</h4>
                  </div>
                </a>
              </div>
            </div>
          </div>

          <div className="tag">
            <p>This tool provides general health information. For serious symptoms, consult a doctor.</p>
          </div>
        </div>

        {isPopupOpen && (
          <div id="popup-overlay" onClick={() => setIsPopupOpen(false)}>
            <div id="popup-content" onClick={(e) => e.stopPropagation()}>
              <iframe src="/adminedits/editInfo.html" id="popup-iframe" title="Edit Info" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}