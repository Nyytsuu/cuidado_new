import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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

const LISTENING_TIMEOUT_MS = 12000;

const LANGUAGES = [
  { label: "English (Philippines)", value: "en-PH" },
  { label: "English (US)", value: "en-US" },
  { label: "Filipino", value: "fil-PH" },
];

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
  const [typedSymptoms, setTypedSymptoms] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [symptomResult, setSymptomResult] = useState<SymptomResult | null>(null);
  const [selectedLang, setSelectedLang] = useState("en-PH");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningTimeoutRef = useRef<number | null>(null);
  const latestTranscriptRef = useRef("");
  const heardSpeechRef = useRef(false);
  const recognitionSettledRef = useRef(false);

  const effectiveUserId = useMemo(() => userId ?? getStoredUserId(), [userId]);

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
          subtitle: voiceError || "Please try again.",
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
    clearListeningTimer();
    recognitionSettledRef.current = true;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setVoicePopupOpen(false);
    setVoiceStep("idle");
    setVoiceTranscript("");
    setTypedSymptoms("");
    setVoiceError("");
    setSymptomResult(null);
  };

  const startVoiceAssistant = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    setVoicePopupOpen(true);
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
          void analyzeVoiceSymptoms(transcript);
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
        void analyzeVoiceSymptoms(transcript);
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
        client: "Android speech recognition could not start on this emulator. Restart the emulator or try typed symptoms below.",
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
        void analyzeVoiceSymptoms(transcript);
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

  const submitTypedSymptoms = () => {
    void analyzeVoiceSymptoms(typedSymptoms);
  };

  const voiceContent = getVoiceContent();
  const popup = voicePopupOpen ? (
    <div className="voice-assistant-popup" onClick={closeVoicePopup}>
      <div
        className={`voice-popup-card ${voiceStep === "result" ? "has-result" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="voice-popup-close" type="button" onClick={closeVoicePopup}>
          x
        </button>

        <div className={`voice-popup-mic ${voiceContent.micClass}`}>
          <img src={micIcon} alt="Mic" />
        </div>

        <div className="voice-popup-text">
          <h3>{voiceContent.title}</h3>
          <p>{voiceContent.subtitle}</p>
        </div>

        {voiceTranscript && (
          <div className="voice-transcript-preview">
            <strong>Heard:</strong> {voiceTranscript}
          </div>
        )}

        {(voiceStep === "retry" || voiceStep === "unsupported") && (
          <div className="voice-manual-entry">
            <label htmlFor="voice-manual-symptoms">Type symptoms instead</label>
            <textarea
              id="voice-manual-symptoms"
              value={typedSymptoms}
              onChange={(event) => setTypedSymptoms(event.target.value)}
              placeholder={
                selectedLang === "fil-PH"
                  ? "Halimbawa: May lagnat, ubo, at sakit ng ulo ako"
                  : "Example: I have cough, fever, and headache"
              }
              rows={3}
            />
            <button
              type="button"
              className="voice-manual-submit"
              onClick={submitTypedSymptoms}
              disabled={!typedSymptoms.trim()}
            >
              Analyze symptoms
            </button>
          </div>
        )}

        {voiceStep === "result" && symptomResult && (
          <div className="voice-popup-result-scroll">
            <VoiceAssistantResult result={symptomResult} compact />
          </div>
        )}

        {(voiceStep === "retry" || voiceStep === "result") && (
          <button
            type="button"
            className="voice-popup-retry"
            onClick={startVoiceAssistant}
          >
            Try again
          </button>
        )}

        <label className="voice-popup-language">
          <span>Language</span>
          <select
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
        </label>
      </div>
    </div>
  ) : null;

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

      {popup ? createPortal(popup, document.body) : null}
    </>
  );
}
