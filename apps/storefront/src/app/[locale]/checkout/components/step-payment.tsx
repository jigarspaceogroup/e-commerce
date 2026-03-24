"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CardElement } from "@stripe/react-stripe-js";
import type { StripeCardElementChangeEvent } from "@stripe/stripe-js";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

type CheckoutAction = { type: "SET_STEP"; payload: 1 | 2 | 3 | 4 };

interface StepPaymentProps {
  dispatch: React.Dispatch<CheckoutAction>;
}

export function StepPayment({ dispatch }: StepPaymentProps) {
  const t = useTranslations("checkout.payment");
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  function handleCardChange(event: StripeCardElementChangeEvent) {
    setCardComplete(event.complete);
    setCardError(event.error ? event.error.message : null);
  }

  function handleContinue() {
    if (!cardComplete) {
      setCardError("Please enter valid card details");
      return;
    }
    dispatch({ type: "SET_STEP", payload: 4 });
  }

  function handleBack() {
    dispatch({ type: "SET_STEP", payload: 2 });
  }

  return (
    <div className="border border-border rounded-lg p-6">
      <h2 className="font-heading text-heading-md font-bold text-primary mb-4">
        {t("title")}
      </h2>

      {/* Payment method card */}
      <div className="border-2 border-primary rounded-lg p-4 bg-surface mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-on-primary" />
          </div>
          <div className="flex items-center gap-2">
            <CreditCard size={20} className="text-primary" />
            <p className="text-body-md font-bold text-primary">
              {t("creditCard")}
            </p>
          </div>
        </div>

        <p className="text-body-sm text-primary-muted mb-4 ps-8">
          Visa, Mastercard, Amex
        </p>

        {/* Stripe CardElement */}
        <div className="ps-8">
          <div
            className="w-full rounded-lg border border-border bg-surface py-3 px-4 transition-colors focus-within:border-primary"
            style={{ minHeight: "44px" }}
          >
            <CardElement
              onChange={handleCardChange}
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#000000",
                    fontFamily:
                      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    "::placeholder": {
                      color: "#00000066",
                    },
                  },
                  invalid: {
                    color: "#ff3333",
                  },
                },
                hidePostalCode: true,
              }}
            />
          </div>
          {cardError && (
            <p className="mt-2 text-body-xs text-accent-red">{cardError}</p>
          )}
        </div>

        {/* Secure payment notice */}
        <p className="text-body-xs text-primary-muted mt-4 ps-8">
          {t("securePayment")}
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-6 border-t border-border">
        <Button onClick={handleContinue} disabled={!cardComplete} size="full">
          Continue
        </Button>
        <Button variant="secondary" onClick={handleBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
