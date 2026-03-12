"use client";

import { useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";

interface MfaInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function MfaInput({ value, onChange, disabled = false }: MfaInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const focusInput = useCallback((index: number) => {
    const input = inputRefs.current[index];
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const handleChange = useCallback(
    (index: number, digit: string) => {
      if (!/^\d?$/.test(digit)) return;

      const newDigits = [...digits];
      newDigits[index] = digit;
      onChange(newDigits.join("").replace(/\s/g, ""));

      if (digit && index < 5) {
        focusInput(index + 1);
      }
    },
    [digits, onChange, focusInput],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        focusInput(index - 1);
      }
      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        focusInput(index - 1);
      }
      if (e.key === "ArrowRight" && index < 5) {
        e.preventDefault();
        focusInput(index + 1);
      }
    },
    [digits, focusInput],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (pasted) {
        onChange(pasted);
        focusInput(Math.min(pasted.length, 5));
      }
    },
    [onChange, focusInput],
  );

  return (
    <div className="flex justify-center gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="h-12 w-12 rounded-lg border border-gray-300 text-center text-lg font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}
