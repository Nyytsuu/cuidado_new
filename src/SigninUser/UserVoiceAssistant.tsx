import { useEffect, useRef, useState } from "react";
import "./UserVoiceAssistant.css";
import UserSidebar from "../Categories/UserSidebar";
import { analyzeVoiceTranscript, type SymptomResult } from "./voiceAssistantApi";
import VoiceAssistantResult from "./VoiceAssistantResult";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  HeartPulse,
  Thermometer,
  Wind,
  Brain,
  Activity,
  ClipboardList,
  SearchCheck,
  ShieldAlert,
  Keyboard,
  Lightbulb,
  Headphones,
  ChevronRight,
  X,
} from "lucide-react";

type VoiceStep =
  | "idle"
  | "listening"
  | "result"
  | "processing"
  | "retry"
  | "unsupported";

type SpeechRecognitionEventLike = Event & {
  results: {
    [key: number]: {
      [key: number]: { transcript: string };
      isFinal: boolean;
      length: number;
    };
    length: number;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEventLike) => void)
    | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEventLike) => void)
    | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

const LANGUAGES = [
  { label: "English (Philippines)", value: "en-PH" },
  { label: "English (US)", value: "en-US" },
  { label: "Filipino", value: "tl-PH" },
];

export default function UserVoiceAssistant() {
  const navigate = useNavigate();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const [voiceStep, setVoiceStep] = useState<VoiceStep>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [symptomResult, setSymptomResult] = useState<SymptomResult | null>(null);
  const [selectedLang, setSelectedLang] = useState("en-PH");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const suggestions = [
    { icon: Thermometer, text: "I have fever, chills, and body aches" },
    { icon: Wind, text: "I have cough and shortness of breath" },
    { icon: Brain, text: "I have headache and dizziness" },
    { icon: Activity, text: "I feel nauseous and have stomach pain" },
    { icon: HeartPulse, text: "I have chest pain and palpitations" },
    { icon: ClipboardList, text: "I have skin rash and itching" },
  ];

  const analyzeVoiceSymptoms = async (transcript: string) => {
    try {
      setVoiceStep("processing");
      setVoiceError("");
      setSymptomResult(null);
      setVoiceTranscript(transcript);

      const result = await analyzeVoiceTranscript(transcript);
      setSymptomResult(result);
      setVoiceStep("result");
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Failed to analyze symptoms.");
      setVoiceStep("retry");
    }
  };

  const startVoiceAssistant = () => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    setVoiceTranscript("");
    setVoiceError("");
    setSymptomResult(null);

    if (!SpeechRecognitionAPI) {
      setVoiceStep("unsupported");
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.lang = selectedLang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setVoiceStep("listening");

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setVoiceTranscript(transcript);

      const lastResult = event.results[event.results.length - 1];
      if (lastResult?.isFinal) {
        analyzeVoiceSymptoms(transcript.trim());
      }
    };

    recognition.onerror = (event) => {
      const selectedLanguageLabel =
        LANGUAGES.find((language) => language.value === selectedLang)?.label ||
        "the selected language";
      const errorMessages: Record<string, string> = {
        language: `${selectedLanguageLabel} is not available on this device. Try another language or type symptoms instead.`,
        "not-allowed": "Microphone permission is blocked. Allow Microphone for Cuidado, then try again.",
        "no-speech": "I did not receive microphone audio. Try again and speak clearly.",
        network: "Speech recognition could not connect. Check your internet connection and try again.",
      };

      setVoiceError(errorMessages[event.error] || "Speech recognition failed. Please try again.");
      setVoiceStep("retry");
    };

    recognition.start();
  };

  const resetVoiceAssistant = () => {
    recognitionRef.current?.abort();
    setVoiceStep("idle");
    setVoiceTranscript("");
    setVoiceError("");
    setSymptomResult(null);
  };

  const getVoiceContent = () => {
    switch (voiceStep) {
      case "listening":
        return ["Listening...", "Please describe your symptoms clearly."];
      case "processing":
        return ["Analyzing symptoms...", "Checking possible conditions based on your symptoms."];
      case "result":
        return ["Analysis complete", "Review the summary and next steps below."];
      case "retry":
        return ["Could not process", voiceError || "Please try again."];
      case "unsupported":
        return ["Voice not supported", "Your browser does not support speech recognition."];
      default:
        return ["Voice Assistant", "Tap the microphone to begin."];
    }
  };

  const [title, subtitle] = getVoiceContent();

  return (
    <div className={`user-layout ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <main className="page-content voice-page-content">
        <div className="voice-page">
          <div className="voice-main">
            <h1>Voice Assistant</h1>
            <p className="voice-subtitle">
              Describe your symptoms by voice and get possible condition matches.
            </p>

            <section className="voice-card">
              <div className="voice-fixed-top">
                <div className="voice-wave-wrap">
                  <div className="wave left-wave" />

                  <button
                    className={`mic-button ${voiceStep}`}
                    type="button"
                    onClick={startVoiceAssistant}
                  >
                    <Mic size={70} />
                  </button>

                  <div className="wave right-wave" />
                </div>

                <p className="tap-text">{title}</p>
                <p className="voice-status-text">{subtitle}</p>

                <select
                  className="language-select"
                  value={selectedLang}
                  onChange={(event) => setSelectedLang(event.target.value)}
                  disabled={voiceStep === "listening" || voiceStep === "processing"}
                >
                  {LANGUAGES.map((language) => (
                    <option key={language.value} value={language.value}>
                      {language.label}
                    </option>
                  ))}
                </select>

                {voiceStep !== "idle" && (
                  <button
                    type="button"
                    className="voice-reset-btn"
                    onClick={resetVoiceAssistant}
                  >
                    <X size={16} />
                    Reset
                  </button>
                )}
              </div>

              <div className="voice-card-content">
                {voiceTranscript && (
                  <div className="voice-transcript-preview">
                    <strong>Heard:</strong> {voiceTranscript}
                  </div>
                )}

                <div className="suggestions-section">
                  <h3>Try describing symptoms</h3>

                  <div className="suggestions-grid">
                    {suggestions.map(({ icon: Icon, text }) => (
                      <button
                        className="suggestion-btn"
                        type="button"
                        key={text}
                        onClick={() => analyzeVoiceSymptoms(text)}
                      >
                        <Icon size={21} />
                        <span>{text}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {voiceStep === "retry" && (
                  <button
                    type="button"
                    className="voice-popup-retry"
                    onClick={startVoiceAssistant}
                  >
                    Try again
                  </button>
                )}
              </div>
            </section>

            <section className="features-card">
              <h3>Symptom Voice Assistant</h3>

              <div className="features-grid">
                <div className="feature-item">
                  <div className="feature-icon teal">
                    <ClipboardList size={26} />
                  </div>
                  <h4>Symptom capture</h4>
                  <p>Describe what you feel in plain language.</p>
                </div>

                <div className="feature-item">
                  <div className="feature-icon blue">
                    <SearchCheck size={26} />
                  </div>
                  <h4>Possible matches</h4>
                  <p>Compares your symptoms with mapped conditions.</p>
                </div>

                <div className="feature-item">
                  <div className="feature-icon green">
                    <ShieldAlert size={26} />
                  </div>
                  <h4>Care guidance</h4>
                  <p>Shows self-care, consult, or urgent-care guidance.</p>
                </div>

                <div className="feature-item">
                  <div className="feature-icon purple">
                    <Keyboard size={26} />
                  </div>
                  <h4>Typed backup</h4>
                  <p>Type symptoms when the microphone is not available.</p>
                </div>
              </div>
            </section>
          </div>

          <aside className="voice-side">
            <section className="side-card">
              <h3>Quick Tips</h3>

              <div className="tip-item">
                <div className="tip-icon">
                  <Lightbulb size={18} />
                </div>
                <p>Speak clearly and slowly for better understanding.</p>
              </div>

              <div className="tip-item">
                <div className="tip-icon">
                  <Lightbulb size={18} />
                </div>
                <p>Describe symptoms like fever, cough, headache, or nausea.</p>
              </div>

              <div className="tip-item">
                <div className="tip-icon">
                  <Lightbulb size={18} />
                </div>
                <p>Voice Assistant is not a replacement for a doctor.</p>
              </div>
            </section>

            <section className="side-card help-card">
              <h3>Need Help?</h3>
              <p>If you need any assistance, our support team is here to help.</p>

              <button type="button" className="support-btn">
                <Headphones size={19} />
                Contact Support
                <ChevronRight size={19} />
              </button>
            </section>
          </aside>
        </div>
      </main>

      {voiceStep === "result" && symptomResult && (
        <div className="voice-result-overlay">
          <div className="voice-result-modal">
            <button
              type="button"
              className="voice-result-close"
              onClick={resetVoiceAssistant}
              aria-label="Close results"
            >
              ×
            </button>

            <div className="voice-result-scroll">
              <VoiceAssistantResult result={symptomResult} showTranscript />
            </div>
            <div className="voice-result-section">
              <strong>Possible conditions:</strong>
              {symptomResult.possible_conditions.length > 0 ? (
                <ol>
                  {symptomResult.possible_conditions.map((condition) => (
                    <li className="voice-condition-match" key={condition.name}>
                      {condition.name} — {(condition.score * 100).toFixed(0)}% match
                      {condition.recognizedByName && <em>recognized by name</em>}
                      {condition.matchedSymptoms.length > 0 && (
                        <small>
                          Related symptoms: {condition.matchedSymptoms.join(", ")}
                        </small>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No likely conditions found.</p>
              )}
            </div>

            <div className="voice-result-section">
              <p>
                <strong>Urgency:</strong> {symptomResult.urgency}
              </p>
              <p>
                <strong>Advice:</strong> {symptomResult.advice}
              </p>

              {symptomResult.emergency && (
                <p className="voice-emergency-text">
                  This may require urgent medical attention.
                </p>
              )}
            </div>

            <button
              type="button"
              className="voice-popup-retry"
              onClick={startVoiceAssistant}
            >
              Try again
            </button>

            <div className="voice-result-actions">
              <button
                type="button"
                className="voice-result-secondary"
                onClick={startVoiceAssistant}
              >
                Try again
              </button>
              <button
                type="button"
                className="voice-result-primary"
                onClick={() => {
                  resetVoiceAssistant();
                  navigate("/find-clinic");
                }}
              >
                Find clinics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
