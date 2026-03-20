"use client";

interface QuantitySelectorProps {
  value: number;
  onChange: (val: number) => void;
  max: number;
  min?: number;
}

export function QuantitySelector({ value, onChange, max, min = 1 }: QuantitySelectorProps) {
  return (
    <div className="inline-flex items-center gap-5 rounded-pill bg-surface-muted px-5 py-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="text-body-lg text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="min-w-[2ch] text-center text-body-md font-medium text-primary">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="text-body-lg text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
