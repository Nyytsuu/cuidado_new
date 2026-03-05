import { useEffect, useRef, useState } from "react";
import "./OtpPopup.css";

type Props = {
  open: boolean;
  email: string;
  error?: string;
  loadingConfirm?: boolean;
  loadingResend?: boolean;
  onClose: () => void;
  onConfirm: (otp: string) => void;
  onResend: () => void;
};

export default function OtpPopup({
  open,
  email,
  error,
  loadingConfirm,
  loadingResend,
  onClose,
  onConfirm,
  onResend,
}: Props) {

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const otp = digits.join("");
  const isComplete = digits.every((d) => d !== "");

  // autofocus first box when popup opens
  useEffect(() => {
    if (!open) return;

    setDigits(["", "", "", "", "", ""]);

    setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 50);
  }, [open]);

  // update digit
  const setDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const next = [...digits];
    next[index] = value;

    setDigits(next);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  // keyboard navigation
  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {

    if (e.key === "Backspace") {
      if (digits[index]) {
        setDigit(index, "");
        return;
      }

      if (index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (e.key === "Enter" && isComplete && !loadingConfirm) {
      onConfirm(otp);
    }
  };

  // paste OTP
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {

    const text = e.clipboardData.getData("text").trim();

    if (!/^\d{6}$/.test(text)) return;

    e.preventDefault();

    const arr = text.split("");

    setDigits(arr);

    setTimeout(() => {
      inputsRef.current[5]?.focus();
    }, 50);
  };

  if (!open) return null;

  return (
    <div className="otp-overlay" onClick={onClose}>
      <div className="otp-card" onClick={(e) => e.stopPropagation()}>

        <button className="otp-close" onClick={onClose}>
          ✕
        </button>

        {/* icon */}
        <div className="otp-iconWrap">
          <div className="otp-icon">

            <svg viewBox="0 0 64 64" width="56" height="56">
              <path
                d="M8 18a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V18Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                d="M10 18l22 16 22-16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
            </svg>

            <span className="otp-check">✓</span>
          </div>
        </div>

        {/* text */}
        <p className="otp-text">
          We emailed you a six digit code to <b>{email}</b>.
          <br />
          Enter the code below to confirm your email address.
        </p>

        {/* OTP boxes */}
        <div className="otp-boxRow">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              className="otp-box"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={i === 0 ? onPaste : undefined}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        {/* resend */}
        <button
          className="otp-resend"
          type="button"
          onClick={onResend}
          disabled={loadingResend}
        >
          Resend code
        </button>

        {/* error */}
        {error && <div className="otp-error">{error}</div>}

        {/* confirm */}
        <button
          className="otp-confirm"
          type="button"
          onClick={() => onConfirm(otp)}
          disabled={!isComplete || loadingConfirm}
        >
          {loadingConfirm ? "CONFIRMING..." : "CONFIRM"}
        </button>

      </div>
    </div>
  );
}