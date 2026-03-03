import { useEffect } from "react";
import "./LandingPage.css";

export default function LandingPage() {
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflowY;
    const prevBodyOverflow = document.body.style.overflowY;
    const prevHtmlHeight = document.documentElement.style.height;
    const prevBodyHeight = document.body.style.height;
    const prevBodyOverflowX = document.body.style.overflowX;

    document.documentElement.style.overflowY = "auto";
    document.body.style.overflowY = "auto";
    document.documentElement.style.height = "auto";
    document.body.style.height = "auto";
    document.body.style.overflowX = "hidden";

    return () => {
      document.documentElement.style.overflowY = prevHtmlOverflow;
      document.body.style.overflowY = prevBodyOverflow;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.height = prevBodyHeight;
      document.body.style.overflowX = prevBodyOverflowX;
    };
  }, []);

  return (
    <div className="lp">
      {/* NAVBAR */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-brand">
            <img className="lp-logo" src="/src/img/logo.png" alt="CUIDADO" />
          </div>

          <nav className="lp-links">
            <a href="#home">Home</a>
            <a href="#contact">Contact Us</a>
            <a href="#about">About Us</a>
          </nav>

          <button className="lp-login-btn">LOGIN</button>
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="lp-hero">
        <div className="lp-hero-bg" />

        <div className="lp-hero-inner">
          <div className="lp-hero-left">
            <h1 className="lp-hero-title">
              Know your symptoms.
              <br />
              Book with confidence.
            </h1>

            <p className="lp-hero-text">
              Not feeling well and unsure what it means? Our website helps you
              identify possible symptoms and connect with the right healthcare
              services. With just a few clicks, you can learn more about your
              condition and book a checkup at a time that works best for you.Not
              feeling well and unsure what it means? Our website helps you
              identify possible symptoms and connect with the right healthcare
              services. With just a few clicks, you can learn more about your
              condition and book a checkup at a time that works best for you.
            </p>

            <div className="lp-hero-actions">
              <button className="lp-cta">LOGIN</button>

              <div className="lp-social">
                <a href="#" className="lp-social-btn" aria-label="Facebook">
                  <span className="fb">f</span>
                </a>

                <a href="#" className="lp-social-btn ig" aria-label="Instagram">
                  <img src="/src/img/instagram.png" alt="Instagram" />
                </a>

                <a href="#" className="lp-social-btn" aria-label="Twitter">
                  <span className="x">𝕏</span>
                </a>
              </div>
            </div>
          </div>

          <div className="lp-hero-right">
            <img
              className="lp-hero-img"
              src="/src/img/doc.png"
              alt="Doctor illustration"
            />
          </div>
        </div>

        {/* TOP WAVE (SVG) */}
        <svg
          className="lp-wave-top"
          viewBox="-60 0 1560 180"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="
              M-60,120
              C120,150 260,80 420,110
              C600,145 760,155 900,120
              C1040,85 1160,25 1290,35
              C1400,55 1460,25 1500,15
              L1500,180
              L-60,180
              Z
            "
            fill="var(--teal-2)"
          />
        </svg>
      </section>

      {/* HOW IT WORKS */}
      <section className="how">
   
        <div className="how-bg" aria-hidden="true" />

        {/* ✅ top wave image */}
        <div className="how-wave how-wave-top" aria-hidden="true" />

        <h2 className="how-title">How it works:</h2>
        <p className="how-sub">Follow these simple steps</p>

        <div className="how-steps">
          <div className="how-step">
            <div className="how-step-label">Step 1</div>
            <div className="how-card">
              <div className="how-card-head">ENTER YOUR SYMPTOMS</div>
              <div className="how-card-body">
                Type in what you’re feeling and answer a few simple questions.
              </div>
              <div className="how-arrow">
                <span>→</span>
              </div>
            </div>
          </div>

          <div className="how-step">
            <div className="how-step-label">Step 2</div>
            <div className="how-card">
              <div className="how-card-head">GET POSSIBLE HEALTH INSIGHTS</div>
              <div className="how-card-body">
                Receive information about possible conditions based on your
                symptoms.
              </div>
              <div className="how-arrow">
                <span>→</span>
              </div>
            </div>
          </div>

          <div className="how-step">
            <div className="how-step-label">Step 3</div>
            <div className="how-card">
              <div className="how-card-head">BOOK A CHECKUP</div>
              <div className="how-card-body">
                Choose a doctor and schedule your appointment in just a few
                clicks.
              </div>
            </div>
          </div>
        </div>

        <div className="how-slogan">EVERYTHING YOU NEED IN ONE PLACE</div>

        <div className="how-mini-grid">
          <div className="how-mini">
            <div className="how-mini-title">SYMPTOMS CHECKER</div>
            <div className="how-mini-text">
              Quickly check your symptoms and receive helpful health insights.
            </div>
          </div>

          <div className="how-mini">
            <div className="how-mini-title">EASY APPOINTMENT BOOKING</div>
            <div className="how-mini-text">
              Schedule your checkup online in just a few simple steps.
            </div>
          </div>

          <div className="how-mini">
            <div className="how-mini-title">DOCTOR OR CLINIC SELECTION</div>
            <div className="how-mini-text">
              Choose the doctor or clinic that best fits your needs.
            </div>
          </div>

          <div className="how-mini">
            <div className="how-mini-title">SCHEDULE MANAGEMENT</div>
            <div className="how-mini-text">
              View, reschedule, or cancel appointments with ease.
            </div>
          </div>

          <div className="how-mini">
            <div className="how-mini-title">SECURE PATIENT INFORMATION</div>
            <div className="how-mini-text">
              Your personal and medical data is protected and kept confidential.
            </div>
          </div>
        </div>

        {/* ✅ bottom waves (2 layered images) */}
        <div className="how-wave-bottom" aria-hidden="true">
          <div className="how-wave how2"></div>
          <div className="how-wave how3"></div>
        </div>
      </section>

      {/* TRUST */}
      <section id="about" className="lp-section lp-trust">
        <div className="lp-trust-bg">
        <div className="lp-trust-inner">
          <div className="lp-photo-wrap">
            <img
              className="lp-photo"
              src="/src/img/doc-patient.png"
              alt="Doctors helping patient"
            />
          </div>

          <div className="trust-card">
            <h3 className="trust-title">Why Patients Trust Us</h3>

            <ul className="trust-list">
              <li>
                <span className="trust-check">✓</span>
                <div>
                  <strong>Fast and Simple Process</strong>
                  <p>Check symptoms and book appointments in minutes.</p>
                </div>
              </li>

              <li>
                <span className="trust-check">✓</span>
                <div>
                  <strong>Reliable Health Information</strong>
                  <p>Get helpful and easy-to-understand health guidance.</p>
                </div>
              </li>

              <li>
                <span className="trust-check">✓</span>
                <div>
                  <strong>User-Friendly Interface</strong>
                  <p>Designed to be simple, clear, and easy for everyone to use.</p>
                </div>
              </li>

              <li>
                <span className="trust-check">✓</span>
                <div>
                  <strong>Book Anytime, Anywhere</strong>
                  <p>Access the system on your phone or computer, 24/7.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
        </div>
        
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <img src="/src/img/logo.png" alt="CUIDADO" />
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <a href="#">Home</a>
              <a href="#">FAQ</a>
              <a href="#">Contact Us</a>
            </div>

            <div className="footer-col">
              <a href="#">About Us</a>
              <a href="#">Terms and Condition</a>
              <a href="#">Privacy and Policy</a>
            </div>

            <div className="footer-col">
              <span className="footer-follow">Follow Us</span>
              <div className="footer-socials">
                <a href="#" className="social">
                  <span className="fb">f</span>
                </a>

                <a href="#" className="social ig" aria-label="Instagram">
                  <img src="/src/img/instagram.png" alt="Instagram" />
                </a>

                <a href="#" className="social">
                  <span className="x">𝕏</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}