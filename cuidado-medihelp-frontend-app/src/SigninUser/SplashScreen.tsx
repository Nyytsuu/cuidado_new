import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getActiveAuthDestination } from "../authSession";
import "./SplashScreen.css";
import logo from "../img/logo.png";
import findClinicImage from "../img/onboarding-find-clinic.png";
import symptomsImage from "../img/onboarding-symptoms.png";
import voiceImage from "../img/onboarding-voice.png";

const onboardingSlides = [
  {
    title: "Find The Right Clinic",
    text: "Now it's easy to make an appointment with the right clinic.",
    image: findClinicImage,
  },
  {
    title: "Search For Symptoms",
    text: "Get information about your possible disease.",
    image: symptomsImage,
  },
  {
    title: "Get Connected",
    text: "Use voice assistant for easier access.",
    image: voiceImage,
  },
];

export default function SplashScreen() {
  const navigate = useNavigate();
  const [destination] = useState(() => getActiveAuthDestination());
  const [introDone, setIntroDone] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const currentSlide = onboardingSlides[activeSlide];
  const isLastSlide = activeSlide === onboardingSlides.length - 1;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (destination) {
        // Already logged in — go to their dashboard
        navigate(destination, { replace: true });
        return;
      }

      setIntroDone(true);
    }, destination ? 250 : 1400);

    return () => window.clearTimeout(timer);
  }, [destination, navigate]);

  const finishOnboarding = () => {
    navigate("/signin", { replace: true });
  };

  const goToNextSlide = () => {
    if (isLastSlide) {
      finishOnboarding();
      return;
    }

    setActiveSlide((slide) => slide + 1);
  };

  if (!introDone) {
    return (
      <div className="splash-screen splash-intro">
        {!destination ? (
          <button className="skip-btn" onClick={finishOnboarding}>
            Skip
          </button>
        ) : null}

        <img src={logo} alt="CUIDADO" className="splash-logo" />
      </div>
    );
  }

  return (
    <div className="splash-screen onboarding-screen">
      <button className="skip-btn" onClick={finishOnboarding}>
        Skip
      </button>

      <main className="onboarding-content" aria-live="polite">
        <div className="onboarding-image-wrap">
          <img
            src={currentSlide.image}
            alt=""
            className="onboarding-image"
            draggable={false}
          />
        </div>

        <section className="onboarding-copy">
          <h1>{currentSlide.title}</h1>
          <p>{currentSlide.text}</p>

          <div className="onboarding-dots" aria-label="Onboarding progress">
            {onboardingSlides.map((slide, index) => (
              <button
                key={slide.title}
                className={`onboarding-dot ${
                  index === activeSlide ? "is-active" : ""
                }`}
                aria-label={`Go to ${slide.title}`}
                aria-current={index === activeSlide}
                onClick={() => setActiveSlide(index)}
                type="button"
              />
            ))}
          </div>
        </section>
      </main>

      <button className="onboarding-primary" onClick={goToNextSlide}>
        Get Started
      </button>
    </div>
  );
}
