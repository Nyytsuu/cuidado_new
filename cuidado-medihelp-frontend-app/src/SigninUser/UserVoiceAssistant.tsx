import { useEffect, useRef, useState } from "react";
import "./UserVoiceAssistant.css";
import UserSidebar from "../Categories/UserSidebar";
import { analyzeVoiceTranscript, type SymptomResult } from "./voiceAssistantApi";
import VoiceAssistantResult from "./VoiceAssistantResult";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  Thermometer,
  Wind,
  Brain,
  Activity,
  HeartPulse,
  Scan,
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

const LISTENING_TIMEOUT_MS = 12000;

const LANGUAGES = [
  { label: "English (Philippines)", value: "en-PH" },
  { label: "English (US)", value: "en-US" },
  { label: "Filipino", value: "fil-PH" },
];

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
  const [typedFallback, setTypedFallback] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningTimeoutRef = useRef<number | null>(null);
  const latestTranscriptRef = useRef("");
  const heardSpeechRef = useRef(false);
  const recognitionSettledRef = useRef(false);

  const clearListeningTimer = () => {
    if (listeningTimeoutRef.current !== null) {
      window.clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearListeningTimer();
      recognitionRef.current?.abort();
    };
  }, []);

  const suggestions = [
    { icon: Thermometer,  text: "I have fever, chills, and body aches" },
    { icon: Wind,         text: "I have cough and shortness of breath" },
    { icon: Brain,        text: "I have headache and dizziness" },
    { icon: Activity,     text: "I feel nauseous and have stomach pain" },
    { icon: HeartPulse,   text: "I have chest pain and palpitations" },
    { icon: Scan,         text: "I have skin rash and itching" },
  ];

  const analyzeVoiceSymptoms = async (transcript: string) => {
    try {
      const cleanedTranscript = transcript.trim();
      clearListeningTimer();
      recognitionSettledRef.current = true;

      if (!cleanedTranscript) {
        setVoiceError("I did not receive microphone audio. Check the emulator microphone input, then try again.");
        setVoiceStep("retry");
        return;
      }

      setVoiceStep("processing");
      setVoiceError("");
      setSymptomResult(null);
      setVoiceTranscript(cleanedTranscript);

      const result = await analyzeVoiceTranscript(cleanedTranscript);
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
    latestTranscriptRef.current = "";
    heardSpeechRef.current = false;
    recognitionSettledRef.current = false;

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

    recognition.onstart = () => {
      clearListeningTimer();
      heardSpeechRef.current = false;
      latestTranscriptRef.current = "";
      recognitionSettledRef.current = false;
      setVoiceStep("listening");

      listeningTimeoutRef.current = window.setTimeout(() => {
        if (recognitionSettledRef.current) {
          return;
        }

        recognitionSettledRef.current = true;
        const transcript = latestTranscriptRef.current.trim();
        recognition.abort();

        if (transcript) {
          analyzeVoiceSymptoms(transcript);
          return;
        }

        setVoiceError("I could not hear microphone audio. Make sure the emulator microphone is enabled, then try again.");
        setVoiceStep("retry");
      }, LISTENING_TIMEOUT_MS);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      latestTranscriptRef.current = transcript;
      if (transcript.trim()) {
        heardSpeechRef.current = true;
      }
      setVoiceTranscript(transcript);

      const lastResult = event.results[event.results.length - 1];
      if (lastResult?.isFinal) {
        recognitionSettledRef.current = true;
        clearListeningTimer();
        analyzeVoiceSymptoms(transcript.trim());
      }
    };

    recognition.onerror = (event) => {
      recognitionSettledRef.current = true;
      clearListeningTimer();
      const selectedLanguageLabel =
        LANGUAGES.find((language) => language.value === selectedLang)?.label ||
        "The selected language";
      const isFilipino = selectedLang.toLowerCase().startsWith("fil");
      const errorMessages: Record<string, string> = {
        network: isFilipino
          ? "Filipino speech recognition is not available in this browser right now. Your internet is fine; try English (Philippines) or type symptoms below."
          : "The browser speech service could not start. Try again, choose another language, or type symptoms below.",
        "not-allowed": "Microphone permission is blocked. Allow Microphone for Cuidado, then try again.",
        "no-speech": "I did not receive microphone audio. Check the emulator microphone input, then try again and speak clearly.",
        "not-supported": "Speech recognition is not available on this device.",
        audio: "Android could not open the microphone audio stream. Check the emulator microphone setting and try again.",
        client: "Android speech recognition could not start on this emulator. Restart the emulator or try one of the typed suggestions below.",
        service: "The Android speech recognition service stopped unexpectedly. Restart the emulator and try again.",
        language: `${selectedLanguageLabel} is not available on this device. Try another language or type symptoms instead.`,
        busy: "The microphone is already listening. Please wait a moment and try again.",
      };

      setVoiceError(errorMessages[event.error] || "Speech recognition failed. Please try again.");
      setVoiceStep("retry");
    };

    recognition.onend = () => {
      clearListeningTimer();

      if (recognitionSettledRef.current) {
        return;
      }

      recognitionSettledRef.current = true;
      const transcript = latestTranscriptRef.current.trim();

      if (transcript) {
        analyzeVoiceSymptoms(transcript);
        return;
      }

      setVoiceError("I could not hear microphone audio. Check the emulator microphone input, then try again.");
      setVoiceStep("retry");
    };

    try {
      recognition.start();
    } catch {
      setVoiceError("Speech recognition could not start. Please try again.");
      setVoiceStep("retry");
    }
  };

  const resetVoiceAssistant = () => {
    clearListeningTimer();
    recognitionSettledRef.current = true;
    recognitionRef.current?.abort();
    setVoiceStep("idle");
    setVoiceTranscript("");
    setVoiceError("");
    setSymptomResult(null);
    setTypedFallback("");
    latestTranscriptRef.current = "";
    heardSpeechRef.current = false;
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
    <div className={`voice-assistant-page user-layout ${sidebarExpanded ? "sidebar-expanded" : ""}`}>
      <UserSidebar
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        profileOpen={profileOpen}
        setProfileOpen={setProfileOpen}
        headerProfileOpen={headerProfileOpen}
        setHeaderProfileOpen={setHeaderProfileOpen}
      />

      <main className="page-content">
        <div className="voice-page">
          <div className="voice-main">
            <h1>Voice Assistant</h1>
            <p className="voice-subtitle">Your health companion, just a voice away.</p>

            <section className="voice-card">
              <div className="voice-fixed-top">
                <div className={`voice-wave-wrap ${voiceStep}`}>
                  <div className="wave left-wave" />

                  <button
                    className={`mic-button ${voiceStep}`}
                    type="button"
                    onClick={voiceStep === "idle" || voiceStep === "retry" || voiceStep === "unsupported" ? startVoiceAssistant : undefined}
                    aria-label={voiceStep === "listening" ? "Listening..." : voiceStep === "processing" ? "Processing..." : "Start voice assistant"}
                  >
                    <Mic size={70} />
                  </button>

                  <div className="wave right-wave" />
                </div>

                <div className={`voice-bars ${voiceStep === "listening" ? "active" : ""}`} aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <span key={i} style={{ "--bar-i": i } as React.CSSProperties} />
                  ))}
                </div>

                <p className="tap-text">{title}</p>
                <p className="voice-status-text">{subtitle}</p>

                <div className="voice-controls-row">
                  <select
                    className="language-select"
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    disabled={voiceStep === "listening" || voiceStep === "processing"}
                  >
                    {LANGUAGES.map(({ label, value }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>

                  {voiceStep !== "idle" && (
                    <button
                      type="button"
                      className="voice-reset-btn"
                      onClick={resetVoiceAssistant}
                    >
                      <X size={15} />
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="voice-card-content">
                {voiceTranscript && (
                  <div className="voice-transcript-preview">
                    <strong>Heard:</strong> {voiceTranscript}
                  </div>
                )}

                {voiceStep === "retry" && (
                  <div className="voice-typed-fallback">
                    <p className="voice-fallback-label">Or type your symptoms below:</p>
                    <textarea
                      className="voice-fallback-textarea"
                      value={typedFallback}
                      onChange={(e) => setTypedFallback(e.target.value)}
                      placeholder="e.g. I have a fever, headache and sore throat..."
                      rows={3}
                    />
                    <div className="voice-fallback-actions">
                      <button
                        type="button"
                        className="voice-popup-retry"
                        onClick={startVoiceAssistant}
                      >
                        Try voice again
                      </button>
                      <button
                        type="button"
                        className="voice-analyze-typed-btn"
                        onClick={() => { if (typedFallback.trim()) analyzeVoiceSymptoms(typedFallback.trim()); }}
                        disabled={!typedFallback.trim()}
                      >
                        Analyze symptoms
                      </button>
                    </div>
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

              <button
                type="button"
                className="support-btn"
                onClick={() => navigate("/help")}
              >
                <Headphones size={19} />
                Contact Support
                <ChevronRight size={19} />
              </button>
            </section>
          </aside>
        </div>
      </main>

      {voiceStep === "result" && symptomResult && (
        <div className="voice-result-overlay" onClick={resetVoiceAssistant}>
          <div className="voice-result-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="voice-result-close"
              onClick={resetVoiceAssistant}
              aria-label="Close results"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="voice-result-scroll">
              <VoiceAssistantResult result={symptomResult} showTranscript />
            </div>

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
