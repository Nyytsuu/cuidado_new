import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import type { SymptomResult } from "./voiceAssistantApi";
import "./VoiceAssistantResult.css";

type VoiceAssistantResultProps = {
  result: SymptomResult;
  compact?: boolean;
  showTranscript?: boolean;
};

const urgencyContent = {
  low: {
    label: "Low urgency",
    title: "Self-care guidance",
    className: "low",
    icon: CheckCircle2,
  },
  medium: {
    label: "Needs follow-up",
    title: "Consider a clinic visit",
    className: "medium",
    icon: HeartPulse,
  },
  high: {
    label: "Urgent",
    title: "Seek care quickly",
    className: "high",
    icon: ShieldAlert,
  },
};

const clampPercent = (score: number) =>
  Math.max(0, Math.min(100, Math.round(Number(score || 0) * 100)));

const uniqueList = (items: string[]) =>
  Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

export default function VoiceAssistantResult({
  result,
  compact = false,
  showTranscript = false,
}: VoiceAssistantResultProps) {
  const topCondition = result.possible_conditions[0];
  const topPercent = topCondition ? clampPercent(topCondition.score) : 0;
  const urgency = urgencyContent[result.urgency] || urgencyContent.low;
  const UrgencyIcon = urgency.icon;
  const detectedSymptoms = uniqueList(result.symptoms);
  const recognizedConditions = uniqueList(result.recognized_conditions);

  return (
    <div className={`voice-analysis-result ${compact ? "compact" : ""}`}>
      <div className={`voice-analysis-hero ${urgency.className}`}>
        <div className="voice-analysis-hero-copy">
          <span className={`voice-urgency-pill ${urgency.className}`}>
            <UrgencyIcon size={15} />
            {urgency.label}
          </span>
          <h4>{topCondition ? topCondition.name : "No clear match yet"}</h4>
          <p>
            {topCondition
              ? topCondition.recognizedByName
                ? "Condition name was recognized from what you said."
                : "This is the strongest match based on the symptoms heard."
              : "Try saying the symptoms you feel, such as cough, fever, headache, or pain."}
          </p>
        </div>

        <div className="voice-analysis-score" aria-label="Top match score">
          <strong>{topCondition ? `${topPercent}%` : "--"}</strong>
          <span>match</span>
        </div>
      </div>

      <div className="voice-analysis-stats" aria-label="Voice analysis summary">
        <div>
          <span>{detectedSymptoms.length}</span>
          <small>symptoms</small>
        </div>
        <div>
          <span>{result.possible_conditions.length}</span>
          <small>matches</small>
        </div>
        <div>
          <span>{urgency.title}</span>
          <small>guidance</small>
        </div>
      </div>

      {showTranscript && (
        <section className="voice-analysis-panel">
          <div className="voice-analysis-panel-title">
            <MessageSquareText size={17} />
            <span>Heard</span>
          </div>
          <p className="voice-analysis-transcript">{result.transcript}</p>
        </section>
      )}

      <section className="voice-analysis-panel">
        <div className="voice-analysis-panel-title">
          <Stethoscope size={17} />
          <span>Detected Symptoms</span>
        </div>

        {detectedSymptoms.length > 0 ? (
          <div className="voice-analysis-chip-list">
            {detectedSymptoms.map((symptom) => (
              <span className="voice-analysis-chip" key={symptom}>
                {symptom}
              </span>
            ))}
          </div>
        ) : (
          <p className="voice-analysis-empty">
            No symptom words were directly matched. If you named a condition,
            the assistant can still show that condition below.
          </p>
        )}
      </section>

      {recognizedConditions.length > 0 && (
        <section className="voice-analysis-panel">
          <div className="voice-analysis-panel-title">
            <Sparkles size={17} />
            <span>Recognized Condition</span>
          </div>

          <div className="voice-analysis-chip-list">
            {recognizedConditions.map((condition) => (
              <span className="voice-analysis-chip emphasized" key={condition}>
                {condition}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="voice-analysis-panel">
        <div className="voice-analysis-panel-title">
          <ClipboardList size={17} />
          <span>Possible Conditions</span>
        </div>

        {result.possible_conditions.length > 0 ? (
          <ol className="voice-analysis-condition-list">
            {result.possible_conditions.map((condition, index) => {
              const percent = clampPercent(condition.score);
              const relatedSymptoms = uniqueList(condition.matchedSymptoms);

              return (
                <li key={`${condition.name}-${index}`} className="voice-analysis-condition">
                  <div className="voice-analysis-condition-top">
                    <strong>{condition.name}</strong>
                    <span>{percent}%</span>
                  </div>

                  <div className="voice-analysis-match-bar" aria-hidden="true">
                    <span style={{ width: `${percent}%` }} />
                  </div>

                  <div className="voice-analysis-condition-meta">
                    {condition.recognizedByName && <em>recognized by name</em>}
                    {relatedSymptoms.length > 0 && (
                      <small>Related: {relatedSymptoms.slice(0, 5).join(", ")}</small>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="voice-analysis-empty">
            No likely condition was found from that phrase. Try describing what
            you feel instead of using only one short word.
          </p>
        )}
      </section>

      <section className={`voice-analysis-advice ${urgency.className}`}>
        <div className="voice-analysis-panel-title">
          {result.emergency ? <AlertTriangle size={18} /> : <HeartPulse size={18} />}
          <span>Advice</span>
        </div>
        <p>{result.advice}</p>
        {result.emergency && (
          <strong>This may require urgent medical attention.</strong>
        )}
      </section>

      <p className="voice-analysis-note">
        This is not a diagnosis. Use it as a guide and consult a healthcare
        professional if symptoms persist, worsen, or feel severe.
      </p>
    </div>
  );
}
