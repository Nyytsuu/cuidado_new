import { useState } from "react";
import UserSidebar from "../Categories/UserSidebar";
import "./FindClinic.css";

export default function FindClinic() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const clinics = [
    {
      name: "CareClinic",
      location: "Zapote Rd - Bacoor",
      distance: "2.5 km",
      rating: "★★★★☆",
    },
    {
      name: "HealthFirst",
      location: "Zapote - Molino Rd",
      distance: "3.2 km",
      rating: "★★★★☆",
    },
    {
      name: "MedPrime",
      location: "District Imus",
      distance: "4.1 km",
      rating: "★★★★☆",
    },
  ];

  return (
    <div className={`findclinic-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <div className="findclinic-content">
        <main className="findclinic-main">
          <h1 className="fc-title">Find Clinic</h1>
          <p className="fc-sub">Calculate your Body Mass Index</p>

       <div className="fc-search-wrap">
  <div className="fc-search-bar">
    <div className="fc-search-field fc-search-location">
      <span className="fc-search-icon">
        <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        >
        <circle cx="11" cy="11" r="7"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        </span>
      <input type="text" placeholder="Bacoor" />
    </div>

    <div className="fc-search-field fc-search-select">
      <select>
        <option>Category: All</option>
      </select>
    </div>

    <div className="fc-search-field fc-search-select">
      <select>
        <option>Distance: Within 20 km</option>
      </select>
    </div>

    <button type="button" className="fc-search-btn">
      Search
    </button>
  </div>
</div>

         <div className="fc-filters">
  <button type="button" className="fc-filter-chip fc-filter-cost active">
    <span className="fc-filter-icon">📍</span>
    <span>Cost</span>
    <span className="fc-filter-arrow">▼</span>
  </button>

  <button type="button" className="fc-filter-chip fc-filter-rating">
    <span className="fc-filter-icon">↕</span>
    <span>Rating</span>
  </button>

  <button type="button" className="fc-filter-chip fc-filter-open">
    <span className="fc-filter-icon">◉</span>
    <span>Open Now</span>
  </button>

  <button type="button" className="fc-filter-chip fc-filter-offers">
    <span className="fc-filter-icon">🗓</span>
    <span>Offers</span>
  </button>
</div>

          <div className="fc-layout">
            <div className="fc-list">
              {clinics.map((clinic, i) => (
                <div className="fc-card" key={i}>
                  <div className="fc-card-left">
                    <h3>{clinic.name}</h3>

                    <div className="fc-price-row">
                      <span>$ -PPP</span>
                      <span>₱PP</span>
                      <span>₱₱20.00</span>
                    </div>

                    <div className="fc-location-row">
                      <span className="fc-location-icon">📍</span>
                      <p>{clinic.location}</p>
                    </div>
                  </div>

                  <div className="fc-right">
                    <span className="fc-rating">{clinic.rating}</span>
                    <p className="fc-distance">{clinic.distance}</p>
                    <button type="button">Book Now</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="fc-map">
              <div className="map-placeholder">Map View (Clinics Locations)</div>
            </div>
          </div>

          <div className="fc-footer">
            <span>About Us</span>
            <span>Contact</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </main>
      </div>
    </div>
  );
}