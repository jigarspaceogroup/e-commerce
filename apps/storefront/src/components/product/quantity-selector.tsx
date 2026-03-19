"use client";

interface QuantitySelectorProps {
  value: number;
  onChange: (val: number) => void;
  max: number;
  min?: number;
}

export function QuantitySelector({ value, onChange, max, min = 1 }: QuantitySelectorProps) {
  return (
    <div data-testid="quantity-selector" className="flex items-center gap-2">
      <button
        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        type="button"
      >
        -
      </button>
      <span className="w-10 text-center text-sm font-medium">{value}</span>
      <button
        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        type="button"
      >
        +
      </button>
    </div>
  );
}
