"use client";

import type { ReactNode } from "react";

interface DirectionalIconProps {
  children: ReactNode;
  className?: string;
}

export function DirectionalIcon({ children, className = "" }: DirectionalIconProps) {
  return (
    <span className={`inline-block rtl:scale-x-[-1] ${className}`}>
      {children}
    </span>
  );
}
