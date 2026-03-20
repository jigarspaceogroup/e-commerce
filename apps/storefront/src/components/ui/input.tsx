"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {icon && (
            <span className="absolute start-4 top-1/2 -translate-y-1/2 text-primary-subtle">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full rounded-pill border bg-surface py-3 px-4 text-body-md text-primary placeholder:text-primary-subtle transition-colors focus:border-primary focus:outline-none ${icon ? "ps-11" : ""} ${error ? "border-accent-red" : "border-border"} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 ps-4 text-body-xs text-accent-red">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
