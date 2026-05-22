import { useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import UserSidebar from "../Categories/UserSidebar";
import "./StressIndex.css";

const stressQuestions = [
  { id: 1, question: "I found it hard to wind down." },
  { id: 2, question: "I tended to over-react to situations." },
  { id: 3, question: "I felt that I was using a lot of nervous energy." },
  { id: 4, question: "I found myself getting agitated." },
  { id: 5, question: "I found it difficult to relax." },
  {
    id: 6,
    question:
      "I was intolerant of anything that kept me from getting on with what I was doing.",
  },
  { id: 7, question: "I felt that I was rather touchy." },
];

const dassOptions = [
  "Did not apply to me at all",
  "Applied to me to some degree",
  "Applied to me a considerable degree",
  "Applied to me very much",
];

type QuickCardId = "learn" | "tips" | "manage";

type QuickCard = {
  id: QuickCardId;
  Icon: LucideIcon;
  title: string;
  shortText: string;
};

const quickCards: QuickCard[] = [
  {
    id: "learn",
    Icon: BookOpen,
    title: "Learn about stress",
    shortText: "Understand what your score means.",
  },
  {
    id: "tips",
    Icon: Lightbulb,
    title: "See some tips",
    shortText: "Small actions for today.",
  },
  {
    id: "manage",
    Icon: CalendarDays,
    title: "Manage your stress",
    shortText: "Build a simple plan.",
  },
];

const quickDetails: Record<
  QuickCardId,
  { title: string; body: string; items: string[] }
> = {
  learn: {
    title: "About the DASS-21 stress score",
    body:
      "This tool estimates recent stress symptoms from seven DASS-21 stress items. It can help you notice patterns, but it is not a diagnosis.",
    items: [
      "Normal or mild scores can still feel uncomfortable.",
      "Moderate or higher scores are worth tracking closely.",
      "Persistent or worsening stress should be discussed with a professional.",
    ],
  },
  tips: {
    title: "Quick reset ideas",
    body:
      "Use one short, practical action first. The goal is to lower pressure enough to think clearly.",
    items: [
      "Take five slow breaths and relax your shoulders.",
      "Step away from the screen for two minutes.",
      "Drink water, eat if needed, and write down the next smallest task.",
    ],
  },
  manage: {
    title: "Simple stress plan",
    body:
      "A useful plan is small and repeatable. Pick one habit for the next few days, then review if it helped.",
    items: [
      "Schedule sleep and meals before adding extra tasks.",
      "Break stressful work into 15-minute blocks.",
      "Ask for support if stress affects sleep, mood, appetite, or safety.",
    ],
  },
};

const scoreMap: Record<string, number> = {
  "Did not apply to me at all": 0,
  "Applied to me to some degree": 1,
  "Applied to me a considerable degree": 2,
  "Applied to me very much": 3,
};

export default function StressIndex() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [activeQuickCard, setActiveQuickCard] = useState<QuickCardId>("learn");

  const [answers, setAnswers] = useState<Record<number, string>>({
    1: "Did not apply to me at all",
    2: "Did not apply to me at all",
    3: "Did not apply to me at all",
    4: "Did not apply to me at all",
    5: "Did not apply to me at all",
    6: "Did not apply to me at all",
    7: "Did not apply to me at all",
  });

  const [showResultPopup, setShowResultPopup] = useState(false);
  const activeQuickDetail = quickDetails[activeQuickCard];

  const handleAnswerChange = (questionId: number, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const stressResult = useMemo(() => {
    const total = stressQuestions.reduce((sum, q) => {
      return sum + (scoreMap[answers[q.id]] ?? 0);
    }, 0);

    const finalScore = total * 2;

    let level = "";
    let description = "";
    let advice = "";
    let colorClass = "";

    if (finalScore <= 14) {
      level = "Normal";
      description = "Your stress level is within the normal range.";
      advice =
        "Keep maintaining healthy habits such as proper rest, regular movement, and relaxation time.";
      colorClass = "low";
    } else if (finalScore <= 18) {
      level = "Mild";
      description = "You may be experiencing mild stress symptoms.";
      advice =
        "Try simple stress-management steps like better sleep, short breaks, breathing exercises, and reducing overload.";
      colorClass = "moderate";
    } else if (finalScore <= 25) {
      level = "Moderate";
      description = "Your answers suggest a moderate level of stress.";
      advice =
        "Consider making lifestyle adjustments and seeking support if stress is affecting your mood, sleep, or daily functioning.";
      colorClass = "moderate";
    } else if (finalScore <= 33) {
      level = "Severe";
      description = "Your stress level appears to be high.";
      advice =
        "It is strongly recommended to consult a healthcare professional or counselor for proper support.";
      colorClass = "high";
    } else {
      level = "Extremely Severe";
      description = "Your stress level appears to be very high.";
      advice =
        "Please seek professional help as soon as possible, especially if stress is disrupting your daily life or wellbeing.";
      colorClass = "high";
    }

    return {
      score: finalScore,
      level,
      description,
      advice,
      colorClass,
    };
  }, [answers]);

  return (
    <div className={`stress-page ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <div className="stress-content">
        <main className="stress-main">
          <section className="stress-title-wrap">
            <h1>Stress Index</h1>
            <p>Assess your stress level using the DASS-21 Stress Scale</p>
          </section>

          <section className="stress-layout">
            <div className="stress-left">
              <div className="stress-form-card">
                <div className="stress-form-intro">
                  <span className="stress-form-intro-icon" aria-hidden="true">
                    <ClipboardList size={22} strokeWidth={2.1} />
                  </span>
                  <p>
                    Please read each statement and select how much it applied to you
                    recently.
                  </p>
                </div>

                <div className="stress-question-list">
                  {stressQuestions.map((item, index) => (
                    <div className="stress-question-item" key={item.id}>
                      <div className="stress-question-line">
                        <span className="stress-question-number">{index + 1}.</span>
                        <h3>{item.question}</h3>
                      </div>

                      <div className="stress-options-row">
                        {dassOptions.map((option) => (
                          <label key={option} className="stress-option">
                            <input
                              type="radio"
                              name={`question-${item.id}`}
                              checked={answers[item.id] === option}
                              onChange={() => handleAnswerChange(item.id, option)}
                            />
                            <span className="stress-custom-radio" />
                            <span className="stress-option-text">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="stress-action-row">
                  <p>Answer all seven items to get your DASS-21 stress result.</p>
                  <button
                    type="button"
                    className="stress-btn-primary"
                    onClick={() => setShowResultPopup(true)}
                  >
                    View Result
                  </button>
                </div>
              </div>
            </div>

            <div className="stress-right">
              <div className="stress-side-card">
                <div className="stress-side-head">
                  <span>Live Summary</span>
                  <strong>{stressResult.level}</strong>
                  <small>Score {stressResult.score}</small>
                </div>

                <div className="stress-quick-grid">
                  {quickCards.map((card) => (
                    <button
                      key={card.id}
                      className={`stress-quick-card ${
                        activeQuickCard === card.id ? "active" : ""
                      }`}
                      type="button"
                      aria-pressed={activeQuickCard === card.id}
                      onClick={() => setActiveQuickCard(card.id)}
                    >
                      <div className="stress-quick-icon">
                        <card.Icon size={22} strokeWidth={2.2} />
                      </div>
                      <span className="stress-quick-copy">
                        <span>{card.title}</span>
                        <small>{card.shortText}</small>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="stress-detail-card">
                  <h2>{activeQuickDetail.title}</h2>
                  <p>{activeQuickDetail.body}</p>
                  <ul>
                    {activeQuickDetail.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  className="stress-side-result-btn"
                  onClick={() => setShowResultPopup(true)}
                >
                  View Full Result
                </button>
              </div>
            </div>
          </section>

          <footer className="stress-footer">
            <span>About Us</span>
            <span>|</span>
            <span>Contact</span>
            <span>|</span>
            <span>Privacy Policy</span>
            <span>|</span>
            <span>Terms of Service</span>
          </footer>
        </main>
      </div>

      {showResultPopup && (
        <div
          className="stress-popup-overlay"
          onClick={() => setShowResultPopup(false)}
        >
          <div className="stress-popup-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="stress-popup-close"
              onClick={() => setShowResultPopup(false)}
            >
              x
            </button>

            <h2>DASS-21 Stress Result</h2>

            <div className={`stress-result-badge ${stressResult.colorClass}`}>
              {stressResult.level}
            </div>

            <p className="stress-result-score">
              <strong>Score:</strong> {stressResult.score}
            </p>

            <p className="stress-result-description">
              {stressResult.description}
            </p>

            <div className="stress-result-advice-box">
              <strong>Advice:</strong>
              <p>{stressResult.advice}</p>
            </div>

            <p className="stress-result-note">
              This is a screening tool, not a medical diagnosis. If your stress is
              severe or persistent, consult a licensed healthcare professional.
            </p>

            <button
              type="button"
              className="stress-popup-btn"
              onClick={() => setShowResultPopup(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
