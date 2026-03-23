"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

interface CheckoutStepperProps {
  currentStep: 1 | 2 | 3 | 4;
  onStepClick: (step: number) => void;
}

export function CheckoutStepper({ currentStep, onStepClick }: CheckoutStepperProps) {
  const t = useTranslations("checkout.steps");

  const steps = [
    { number: 1, label: t("shipping") },
    { number: 2, label: t("shippingMethod") },
    { number: 3, label: t("payment") },
    { number: 4, label: t("review") },
  ];

  return (
    <div className="w-full py-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-0">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const isClickable = isCompleted;

          return (
            <div key={step.number} className="flex items-center w-full md:w-auto">
              {/* Step circle and label */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(step.number)}
                  disabled={!isClickable}
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-body-sm font-bold transition-colors ${
                    isActive || isCompleted
                      ? "bg-primary text-on-primary"
                      : "bg-surface-muted text-muted"
                  } ${isClickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                  aria-label={`Step ${step.number}: ${step.label}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : step.number}
                </button>
                <span
                  className={`text-body-sm font-medium ${
                    isActive ? "text-primary" : "text-muted"
                  } md:hidden lg:inline`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line (except after last step) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block flex-1 mx-4 h-[2px]">
                  <div
                    className={`h-full transition-colors ${
                      isCompleted ? "bg-primary" : "bg-surface-muted"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
