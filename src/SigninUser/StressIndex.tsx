import { useState } from "react";
import UserSidebar from "../Categories/UserSidebar";
import "./StressIndex.css";

const stressQuestions = [
  {
    id: 1,
    question: "How often do you feel overwhelmed by your daily responsibilities?",
    options: ["Rarely", "Sometimes", "Often", "Very Often"],
  },
  {
    id: 2,
    question: "Have your sleep patterns changed recently?",
    options: ["No change", "Occasionally disrupted", "Disrupted", "Severely disrupted"],
  },
  {
    id: 3,
    question: "Do you find it difficult to relax and unwind?",
    options: ["Not at all", "Sometimes", "Often", "Very much"],
  },
  {
    id: 4,
    question: "How often do you feel irritable or lose your temper?",
    options: ["Rarely", "Sometimes", "Often", "Very Often"],
  },
  {
    id: 5,
    question: "Have you experienced physical symptoms such as headaches, fatigue, or muscle tension?",
    options: ["Rarely", "Sometimes", "Often", "Very Often"],
  },
];

const quickCards = [
  {
    id: "learn",
    icon: "📖",
    title: "Learn about stress",
  },
  {
    id: "tips",
    icon: "💡",
    title: "See some tips",
  },
  {
    id: "manage",
    icon: "🧰",
    title: "Manage your stress",
  },
];

export default function StressIndex() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [answers, setAnswers] = useState<Record<number, string>>({
    1: "Sometimes",
    2: "No change",
    3: "Sometimes",
    4: "Rarely",
    5: "Rarely",
  });

  const handleAnswerChange = (questionId: number, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

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
            <p>Assess your stress level</p>
          </section>

          <section className="stress-layout">
            <div className="stress-left">
              <div className="stress-form-card">
                <p className="stress-form-intro">
                  Answer the following questions to assess your current stress level:
                </p>

                <div className="stress-question-list">
                  {stressQuestions.map((item, index) => (
                    <div className="stress-question-item" key={item.id}>
                      <div className="stress-question-line">
                        <span className="stress-question-number">{index + 1}.</span>
                        <h3>{item.question}</h3>
                      </div>

                      <div className="stress-options-row">
                        {item.options.map((option) => (
                          <label key={option} className="stress-option">
                            <input
                              type="radio"
                              name={`question-${item.id}`}
                              checked={answers[item.id] === option}
                              onChange={() => handleAnswerChange(item.id, option)}
                            />
                            <span className="stress-custom-radio"></span>
                            <span className="stress-option-text">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="stress-action-row">
                  <p>Answer a few questions to assess your current stress level.</p>
                  <button type="button" className="stress-btn-primary">
                    View Result
                  </button>
                </div>
              </div>
            </div>

            <div className="stress-right">
              <div className="stress-side-card">
                <p>
                  Answer a few questions to assess your current stress level.
                </p>

                <div className="stress-quick-grid">
                  {quickCards.map((card) => (
                    <button key={card.id} className="stress-quick-card" type="button">
                      <div className="stress-quick-icon">{card.icon}</div>
                      <span>{card.title}</span>
                    </button>
                  ))}
                </div>
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
    </div>
  );
}