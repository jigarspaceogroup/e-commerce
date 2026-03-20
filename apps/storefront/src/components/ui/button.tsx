"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "default" | "small" | "full";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:opacity-[0.85] active:opacity-70 focus:outline-2 focus:outline-primary focus:outline-offset-2",
  secondary:
    "bg-transparent text-primary border border-border hover:bg-black/5 active:bg-black/10 focus:outline-2 focus:outline-primary focus:outline-offset-2",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "py-4 px-[54px] text-body-md",
  small: "py-3 px-4 text-body-sm",
  full: "py-4 px-[54px] text-body-md w-full",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "default", className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex items-center justify-center rounded-pill font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
