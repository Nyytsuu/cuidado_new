import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import micIcon from "../img/mic.png";
import { analyzeVoiceTranscript, type SymptomResult } from "./voiceAssistantApi";
import VoiceAssistantResult from "./VoiceAssistantResult";
import "./VoiceAssistantPopup.css";

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
      [key: number]: {
        transcript: string;
      };
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
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

type VoiceAssistantPopupProps = {
  userId?: number | null;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
};

const getStoredUserId = () => {
  try {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    return typeof user?.id === "number" ? user.id : null;
  } catch {
    return null;
  }
};

export default function VoiceAssistantPopup({
  userId,
  className,
  ariaLabel,
  children,
}: VoiceAssistantPopupProps) {
  const [voicePopupOpen, setVoicePopupOpen] = useState(false);
  const [voiceStep, setVoiceStep] = useState<VoiceStep>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [symptomResult, setSymptomResult] = useState<SymptomResult | null>(null);
  const [textInput, setTextInput] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const effectiveUserId = useMemo(() => userId ?? getStoredUserId(), [userId]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const analyzeVoiceSymptoms = async (transcript: string) => {
    try {
      const cleanedTranscript = transcript.trim();

      if (!cleanedTranscript) {
        setVoiceError("I did not hear anything clearly. Please try again.");
        setVoiceStep("retry");
        return;
      }

      setVoiceStep("processing");
      setVoiceError("");
      setSymptomResult(null);
      setVoiceTranscript(cleanedTranscript);

      const result = await analyzeVoiceTranscript(cleanedTranscript, effectiveUserId);

      setSymptomResult(result);
      setVoiceStep("result");
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Failed to analyze symptoms.");
      setVoiceStep("retry");
    }
  };

  const getVoiceContent = () => {
    switch (voiceStep) {
      case "listening":
        return {
          title: "Listening...",
          subtitle: "Please describe your symptoms clearly.",
          micClass: "listening",
        };
      case "processing":
        return {
          title: "Analyzing symptoms...",
          subtitle: "Checking possible conditions based on your symptoms.",
          micClass: "processing",
        };
      case "result":
        return {
          title: "Analysis complete",
          subtitle: "Here are the ranked possible conditions.",
          micClass: "result",
        };
      case "retry":
        return {
          title: "Could not process",
          subtitle: "Please try again.",
          micClass: "error",
        };
      case "unsupported":
        return {
          title: "Voice not supported",
          subtitle: "Your browser does not support speech recognition.",
          micClass: "error",
        };
      default:
        return {
          title: "Voice Assistant",
          subtitle: "Tap the microphone to begin.",
          micClass: "",
        };
    }
  };

  const closeVoicePopup = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setVoicePopupOpen(false);
    setVoiceStep("idle");
    setVoiceTranscript("");
    setVoiceError("");
    setSymptomResult(null);
    setTextInput("");
  };

  const submitTextInput = () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    setTextInput("");
    void analyzeVoiceSymptoms(trimmed);
  };

  const startVoiceAssistant = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    setVoicePopupOpen(true);
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

    recognition.lang = "en-PH";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setVoiceStep("listening");
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setVoiceTranscript(transcript);

      const lastResult = event.results[event.results.length - 1];
      if (lastResult?.isFinal) {
        void analyzeVoiceSymptoms(transcript);
      }
    };

    recognition.onerror = (event) => {
      const errorMessage =
        event.error === "network"
          ? "Speech recognition could not connect. Please check your connection and try again."
          : event.error || "Speech recognition failed.";

      setVoiceError(errorMessage);
      setVoiceStep("retry");
    };

    recognition.onend = () => {
      setVoiceStep((prev) => {
        if (prev === "idle" || prev === "listening") {
          setVoiceError("Speech recognition stopped unexpectedly. Please try again.");
          return "retry";
        }
        return prev;
      });
    };

    try {
      recognition.start();
    } catch {
      setVoiceError("Speech recognition could not start. Please try again.");
      setVoiceStep("retry");
    }
  };

  const voiceContent = getVoiceContent();

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={ariaLabel}
        onClick={startVoiceAssistant}
      >
        {children}
      </button>

      {voicePopupOpen && (
        <div className="voice-assistant-popup" onClick={closeVoicePopup}>
          <div
            className={`voice-popup-card ${voiceStep === "result" ? "has-result" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="voice-popup-close" type="button" onClick={closeVoicePopup} aria-label="Close">
              ×
            </button>

            <div className="voice-popup-header">
              <div
                className={`voice-popup-mic ${voiceContent.micClass}`}
                onClick={voiceStep === "idle" ? startVoiceAssistant : undefined}
                style={voiceStep === "idle" ? { cursor: "pointer" } : undefined}
              >
                <img src={micIcon} alt="Mic" />
              </div>

              <div className="voice-popup-text">
                <h3>{voiceContent.title}</h3>
                <p>{voiceContent.subtitle}</p>
              </div>
            </div>

            {voiceTranscript && voiceStep !== "result" && (
              <div className="voice-transcript-preview">
                <strong>Heard:</strong> {voiceTranscript}
              </div>
            )}

            {voiceError && voiceStep === "retry" && (
              <div className="voice-error-text">{voiceError}</div>
            )}

            {voiceStep === "retry" && (
              <div className="voice-text-fallback">
                <p className="voice-text-fallback-label">Or type your symptoms instead:</p>
                <div className="voice-text-fallback-row">
                  <input
                    type="text"
                    className="voice-text-fallback-input"
                    placeholder="e.g. headache, fever, cough..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitTextInput(); }}
                  />
                  <button
                    type="button"
                    className="voice-text-fallback-btn"
                    onClick={submitTextInput}
                    disabled={!textInput.trim()}
                  >
                    Analyze
                  </button>
                </div>
              </div>
            )}

            {voiceStep === "result" && symptomResult && (
              <div className="voice-popup-result-scroll">
                <VoiceAssistantResult result={symptomResult} compact />
              </div>
            )}

            <div className="voice-popup-footer">
              {(voiceStep === "retry" || voiceStep === "result") && (
                <button
                  type="button"
                  className="voice-popup-retry"
                  onClick={startVoiceAssistant}
                >
                  Try again
                </button>
              )}

              <div className="voice-popup-language">English (Philippines)</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
