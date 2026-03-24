"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShippingOption {
  id: string;
  name: string;
  cost: number;
  estimatedDays: string;
}

type CheckoutAction =
  | { type: "SET_SHIPPING_METHOD"; payload: ShippingOption }
  | { type: "SET_STEP"; payload: 1 | 2 | 3 | 4 };

interface StepShippingProps {
  dispatch: React.Dispatch<CheckoutAction>;
  cartSubtotal: number;
}

export function StepShipping({ dispatch, cartSubtotal }: StepShippingProps) {
  const t = useTranslations("checkout.shipping");

  const isFree = cartSubtotal >= 500;
  const shippingCost = isFree ? 0 : 30;

  function handleContinue() {
    dispatch({
      type: "SET_SHIPPING_METHOD",
      payload: {
        id: "standard",
        name: "standardShipping",
        cost: shippingCost,
        estimatedDays: "3-5",
      },
    });
    dispatch({ type: "SET_STEP", payload: 3 });
  }

  function handleBack() {
    dispatch({ type: "SET_STEP", payload: 1 });
  }

  return (
    <div className="border border-border rounded-lg p-6">
      <h2 className="font-heading text-heading-md font-bold text-primary mb-4">
        {t("shippingMethod")}
      </h2>

      {/* Shipping option card */}
      <div
        className={`border-2 border-primary rounded-lg p-4 bg-surface transition-colors`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-on-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-body-md font-bold text-primary">
                  {t("standard")}
                </p>
                {isFree && (
                  <span className="text-body-xs font-bold bg-primary text-on-primary px-2 py-0.5 rounded-pill">
                    {t("freeShipping")}
                  </span>
                )}
              </div>
              <p className="text-body-sm text-primary-muted mb-2">
                {t("standardDelivery", { min: 3, max: 5 })}
              </p>
              {!isFree && (
                <p className="text-body-sm text-primary-muted">
                  Shipping fee applies for orders under SAR 500
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-body-lg font-bold text-primary">
              {isFree ? t("freeShipping") : `SAR ${shippingCost}`}
            </p>
            <Check size={20} className="text-primary" />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mt-6 pt-6 border-t border-border">
        <Button onClick={handleContinue} size="full">
          Continue
        </Button>
        <Button variant="secondary" onClick={handleBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
