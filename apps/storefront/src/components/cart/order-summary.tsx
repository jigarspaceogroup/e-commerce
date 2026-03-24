"use client";

import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface OrderSummaryProps {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  taxAmount: number;
  grandTotal: number;
  currency?: string;
  couponSlot?: ReactNode;
  onCheckout?: () => void;
}

export function OrderSummary({ subtotal, discount, deliveryFee, taxAmount, grandTotal, currency = "SAR", couponSlot, onCheckout }: OrderSummaryProps) {
  const t = useTranslations("cart");

  return (
    <div className="border border-border rounded-lg p-5 lg:p-6">
      <h2 className="font-heading text-heading-md font-bold text-primary mb-5">
        {t("orderSummary", { defaultValue: "Order Summary" })}
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-body-md text-primary-muted">{t("subtotal")}</span>
          <span className="text-body-md font-bold text-primary">{currency} {subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-body-md text-primary-muted">{t("discount")}</span>
            <span className="text-body-md font-bold text-accent-red">-{currency} {discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-body-md text-primary-muted">{t("estimatedShipping")}</span>
          <span className="text-body-md font-bold text-primary">
            {deliveryFee === 0 ? t("freeShipping") : `${currency} ${deliveryFee.toFixed(2)}`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-body-md text-primary-muted">{t("vat")}</span>
          <span className="text-body-md font-bold text-primary">{currency} {taxAmount.toFixed(2)}</span>
        </div>
        <hr className="border-border" />
        <div className="flex items-center justify-between">
          <span className="text-body-md text-primary">{t("total")}</span>
          <span className="text-body-xl font-bold text-primary">{currency} {grandTotal.toFixed(2)}</span>
        </div>
      </div>
      {couponSlot && <div className="mt-5">{couponSlot}</div>}
      <div className="mt-5">
        <Button size="full" onClick={onCheckout}>{t("checkout")}</Button>
      </div>
    </div>
  );
}
