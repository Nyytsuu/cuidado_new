import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Landingpage.css";
import logo from "../img/logo.png";
import doctorImage from "../img/doc.png";
import patientImage from "../img/doc-patient.png";
import { getActiveAuthDestination } from "../authSession";

const SUPPORT_EMAIL = "cuidadosupport@gmail.com";

const steps = [
  {
    number: "01",
    title: "Check symptoms",
    text: "Describe what you feel and review possible health topics in plain language.",
  },
  {
    number: "02",
    title: "Find nearby care",
    text: "Compare clinics, services, ratings, and availability before sending a request.",
  },
  {
    number: "03",
    title: "Manage visits",
    text: "Track requests, accepted schedules, notifications, and appointment changes.",
  },
];

const features = [
  {
    title: "Symptom checker",
    text: "Quickly match symptoms with mapped conditions and care guidance.",
  },
  {
    title: "Clinic search",
    text: "Find available clinics, services, contact details, and booking options.",
  },
  {
    title: "Appointments",
    text: "Book, review, cancel, and respond to clinic schedule changes.",
  },
  {
    title: "Health tools",
    text: "Use BMI, stress index, emergency guide, and voice-assisted health search.",
  },
];

const trustItems = [
  "Simple patient-first booking flow",
  "Clinic updates and appointment notifications",
  "Organized health topics and body systems",
  "Secure account and personal health information",
];

const contactOptions = [
  {
    label: "Patient support",
    title: "Need help with your account?",
    text: "Log in to manage your profile, appointments, notifications, and support requests.",
    action: "Log in",
    to: "/signin",
  },
  {
    label: "New to Cuidado",
    title: "Ready to start using Cuidado?",
    text: "Create a patient account to check symptoms, find clinics, and book appointments.",
    action: "Get started",
    to: "/signup",
  },
  {
    label: "General contact",
    title: "Questions about Cuidado?",
    text: "Send us a message for website questions, clinic interest, or account guidance.",
    action: "Email Cuidado",
    isEmail: true,
  },
];

const statItems = [
  {
    value: 24,
    suffix: "/7",
    label: "Access to health tools",
  },
  {
    value: 3,
    suffix: "",
    label: "Steps from symptom to visit",
  },
  {
    value: 1,
    suffix: "",
    label: "Place for care requests",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const countedStatsRef = useRef(false);
  const [isEmailPopupOpen, setIsEmailPopupOpen] = useState(false);
  const [animatedStats, setAnimatedStats] = useState(() =>
    statItems.map(() => 0)
  );

  // If the user has an active "keep me logged in" session, skip the landing
  // page entirely and send them straight to their dashboard/homepage.
  useEffect(() => {
    const destination = getActiveAuthDestination();
    if (destination) {
      navigate(destination, { replace: true });
    }
  }, [navigate]);

  const handleSupportEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const subjectInput = String(data.get("subject") || "").trim();
    const message = String(data.get("message") || "").trim();
    const subject = subjectInput || "Cuidado support request";
    const body = [
      `Name: ${name || "Not provided"}`,
      `Email: ${email || "Not provided"}`,
      "",
      message || "No message provided.",
    ].join("\n");

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    setIsEmailPopupOpen(false);
  };

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflowY;
    const prevBodyOverflow = document.body.style.overflowY;
    const prevHtmlHeight = document.documentElement.style.height;
    const prevBodyHeight = document.body.style.height;
    const prevBodyOverflowX = document.body.style.overflowX;
    const prevBodyDisplay = document.body.style.display;
    const prevBodyAlignItems = document.body.style.alignItems;
    const prevBodyJustifyContent = document.body.style.justifyContent;
    const prevRootWidth = document.getElementById("root")?.style.width || "";
    const prevRootDisplay = document.getElementById("root")?.style.display || "";

    document.documentElement.style.overflowY = "auto";
    document.body.style.overflowY = "auto";
    document.documentElement.style.height = "auto";
    document.body.style.height = "auto";
    document.body.style.overflowX = "hidden";
    document.body.style.display = "block";
    document.body.style.alignItems = "stretch";
    document.body.style.justifyContent = "flex-start";

    const root = document.getElementById("root");
    if (root) {
      root.style.width = "100%";
      root.style.display = "block";
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>(".lp-animate")
    );
    let revealObserver: IntersectionObserver | null = null;
    let statsObserver: IntersectionObserver | null = null;
    let countFrame = 0;

    revealItems.forEach((item, index) => {
      item.style.setProperty("--lp-delay", `${Math.min(index * 70, 420)}ms`);
    });

    if (prefersReducedMotion) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      setAnimatedStats(statItems.map((item) => item.value));
    } else {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver?.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.14 }
      );

      revealItems.forEach((item) => revealObserver?.observe(item));

      const statsElement = document.querySelector<HTMLElement>(".lp-stats");
      if (statsElement) {
        statsObserver = new IntersectionObserver(
          ([entry]) => {
            if (!entry?.isIntersecting || countedStatsRef.current) {
              return;
            }

            countedStatsRef.current = true;
            const duration = 1100;
            const startedAt = performance.now();

            const tick = (now: number) => {
              const progress = Math.min((now - startedAt) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);

              setAnimatedStats(
                statItems.map((item) => Math.round(item.value * eased))
              );

              if (progress < 1) {
                countFrame = requestAnimationFrame(tick);
              }
            };

            countFrame = requestAnimationFrame(tick);
            statsObserver?.disconnect();
          },
          { threshold: 0.35 }
        );

        statsObserver.observe(statsElement);
      }
    }

    const hero = document.querySelector<HTMLElement>(".lp-hero");
    const handleHeroMove = (event: MouseEvent) => {
      if (!hero || prefersReducedMotion) {
        return;
      }

      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      hero.style.setProperty("--lp-bg-x", `${x * 14}px`);
      hero.style.setProperty("--lp-bg-y", `${y * 10}px`);
      hero.style.setProperty("--lp-doctor-x", `${x * -24}px`);
      hero.style.setProperty("--lp-doctor-y", `${y * -18}px`);
    };
    const resetHeroMove = () => {
      if (!hero) {
        return;
      }

      hero.style.setProperty("--lp-bg-x", "0px");
      hero.style.setProperty("--lp-bg-y", "0px");
      hero.style.setProperty("--lp-doctor-x", "0px");
      hero.style.setProperty("--lp-doctor-y", "0px");
    };

    hero?.addEventListener("mousemove", handleHeroMove);
    hero?.addEventListener("mouseleave", resetHeroMove);

    const interactiveCards = Array.from(
      document.querySelectorAll<HTMLElement>(".lp-interactive-card")
    );
    const cardCleanups = interactiveCards.map((card) => {
      const handleCardMove = (event: MouseEvent) => {
        if (prefersReducedMotion) {
          return;
        }

        const rect = card.getBoundingClientRect();
        card.style.setProperty("--card-x", `${event.clientX - rect.left}px`);
        card.style.setProperty("--card-y", `${event.clientY - rect.top}px`);
        card.classList.add("is-hovered");
      };
      const handleCardLeave = () => {
        card.classList.remove("is-hovered");
      };

      card.addEventListener("mousemove", handleCardMove);
      card.addEventListener("mouseleave", handleCardLeave);

      return () => {
        card.removeEventListener("mousemove", handleCardMove);
        card.removeEventListener("mouseleave", handleCardLeave);
      };
    });

    return () => {
      revealObserver?.disconnect();
      statsObserver?.disconnect();
      cancelAnimationFrame(countFrame);
      hero?.removeEventListener("mousemove", handleHeroMove);
      hero?.removeEventListener("mouseleave", resetHeroMove);
      cardCleanups.forEach((cleanup) => cleanup());

      document.documentElement.style.overflowY = prevHtmlOverflow;
      document.body.style.overflowY = prevBodyOverflow;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.height = prevBodyHeight;
      document.body.style.overflowX = prevBodyOverflowX;
      document.body.style.display = prevBodyDisplay;
      document.body.style.alignItems = prevBodyAlignItems;
      document.body.style.justifyContent = prevBodyJustifyContent;

      if (root) {
        root.style.width = prevRootWidth;
        root.style.display = prevRootDisplay;
      }
    };
  }, []);

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <a className="lp-brand" href="#home" aria-label="Cuidado home">
            <img className="lp-logo" src={logo} alt="CUIDADO" />
          </a>

          <nav className="lp-links" aria-label="Landing navigation">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="lp-nav-actions">
            <Link to="/signin" className="lp-login-btn">
              Log in
            </Link>
            <Link to="/signup" className="lp-signup-btn">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="home" className="lp-hero">
          <div className="lp-hero-bg" aria-hidden="true" />
          <img
            className="lp-hero-doctor"
            src={doctorImage}
            alt="Doctor using Cuidado MediHelp"
          />

          <div className="lp-hero-inner lp-animate">
            <span className="lp-eyebrow">Patient care, organized</span>
            <h1>Cuidado MediHelp</h1>
            <p>
              Check symptoms, find clinics, and manage appointments in one calm
              healthcare workspace made for patients and local clinics.
            </p>

            <div className="lp-hero-actions">
              <Link to="/signup" className="lp-primary-btn">
                Get started
              </Link>
              <Link to="/signin" className="lp-secondary-btn">
                I already have an account
              </Link>
            </div>

            <div className="lp-stats" aria-label="Cuidado highlights">
              {statItems.map((item, index) => (
                <div
                  className="lp-stat-card lp-animate lp-interactive-card"
                  key={item.label}
                >
                  <strong>
                    {animatedStats[index]}
                    {item.suffix}
                  </strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="lp-section lp-how">
          <div className="lp-section-heading lp-animate">
            <span>How it works</span>
            <h2>From concern to clinic request without the confusion.</h2>
          </div>

          <div className="lp-steps">
            {steps.map((step) => (
              <article
                className="lp-step-card lp-animate lp-interactive-card"
                key={step.number}
              >
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="lp-section lp-features">
          <div className="lp-feature-copy lp-animate">
            <span>Everything in reach</span>
            <h2>Designed around the real patient flow.</h2>
            <p>
              Cuidado keeps the important actions close: symptom checking,
              clinic search, appointment tracking, and health references.
            </p>
            <Link to="/signup" className="lp-primary-btn">
              Create an account
            </Link>
          </div>

          <div className="lp-feature-grid">
            {features.map((feature) => (
              <article
                className="lp-feature-card lp-animate lp-interactive-card"
                key={feature.title}
              >
                <div className="lp-feature-icon" aria-hidden="true">
                  {feature.title.slice(0, 1)}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="about" className="lp-section lp-about">
          <div className="lp-about-copy lp-animate">
            <span>About Us</span>
            <h2>Helping patients move from uncertainty to care with less confusion.</h2>
            <p>
              Cuidado MediHelp is a patient-centered health companion built to
              make symptom checking, clinic discovery, and appointment requests
              easier to understand and manage.
            </p>

            <div className="lp-about-actions">
              <Link to="/signup" className="lp-primary-btn">
                Get started
              </Link>
              <a href="#contact" className="lp-secondary-btn">
                Contact us
              </a>
            </div>
          </div>

          <div className="lp-about-card lp-animate lp-interactive-card">
            <img src={patientImage} alt="Cuidado team supporting a patient" />

            <div className="lp-about-list">
              {trustItems.map((item, index) => (
                <div key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item}</strong>
                  <p>
                    Practical tools that keep health information, clinic
                    updates, and next steps easier to follow.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="lp-section lp-contact">
          <div className="lp-contact-heading lp-animate">
            <span>Contact Us</span>
            <h2>Need help, clinic information, or a place to begin?</h2>
            <p>
              Choose the path that matches what you need. Cuidado keeps account
              access, patient help, and clinic questions easy to reach.
            </p>
          </div>

          <div className="lp-contact-grid">
            {contactOptions.map((option) => (
              <article
                className="lp-contact-card lp-animate lp-interactive-card"
                key={option.label}
              >
                <span>{option.label}</span>
                <h3>{option.title}</h3>
                <p>{option.text}</p>
                {option.to ? (
                  <Link to={option.to}>{option.action}</Link>
                ) : option.isEmail ? (
                  <button type="button" onClick={() => setIsEmailPopupOpen(true)}>
                    {option.action}
                  </button>
                ) : (
                  <a href={option.to || "#"}>{option.action}</a>
                )}
              </article>
            ))}
          </div>

        </section>

        <footer className="lp-footer">
          <div className="lp-footer-ribbon">
            <div>
              <span>Cuidado MediHelp</span>
              <span>Learn about Cuidado and create an account when you are ready.</span>
            </div>

            <div className="lp-footer-ribbon-actions">
              <Link to="/signup">Get started</Link>
              <Link to="/signin">Log in</Link>
            </div>
          </div>

          <div className="lp-footer-inner">
            <div className="lp-footer-brand">
              <img src={logo} alt="CUIDADO" />
              <p>
                Cuidado MediHelp helps patients check symptoms, find clinics, and
                manage appointment requests with clearer next steps.
              </p>
            </div>

            <nav className="lp-footer-links" aria-label="Footer navigation">
              <div>
                <h3>Explore</h3>
                <a href="#home">Home</a>
                <a href="#features">Features</a>
                <a href="#how">How it works</a>
              </div>

              <div>
                <h3>Account</h3>
                <Link to="/signin">Log in</Link>
                <Link to="/signup">Create account</Link>
                <Link to="/signup">Get started</Link>
              </div>

              <div>
                <h3>Company</h3>
                <a href="#about">About us</a>
                <a href="#contact">Contact us</a>
                <a href="#home">Back to top</a>
              </div>
            </nav>
          </div>

          <div className="lp-footer-bottom">
            <span>For informational use only. For emergencies, contact local emergency services.</span>
            <span>(c) 2026 Cuidado MediHelp</span>
          </div>
        </footer>
      </main>

      {isEmailPopupOpen && (
        <div
          className="lp-email-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lp-email-title"
          onClick={() => setIsEmailPopupOpen(false)}
        >
          <div className="lp-email-card" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="lp-email-close"
              aria-label="Close email popup"
              onClick={() => setIsEmailPopupOpen(false)}
            >
              x
            </button>

            <span>Send Email</span>
            <h2 id="lp-email-title">Contact Cuidado Support</h2>
            <p>
              Your message will be prepared as an email to{" "}
              <strong>{SUPPORT_EMAIL}</strong>.
            </p>

            <form onSubmit={handleSupportEmailSubmit}>
              <label>
                Your name
                <input name="name" type="text" placeholder="Juan Dela Cruz" />
              </label>

              <label>
                Your email
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                />
              </label>

              <label>
                Subject
                <input
                  name="subject"
                  type="text"
                  placeholder="How can we help?"
                />
              </label>

              <label>
                Message
                <textarea
                  name="message"
                  rows={5}
                  placeholder="Write your message here..."
                  required
                />
              </label>

              <div className="lp-email-actions">
                <button type="button" onClick={() => setIsEmailPopupOpen(false)}>
                  Cancel
                </button>
                <button type="submit">Prepare Email</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
