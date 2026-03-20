"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag } from "lucide-react";

interface OrderSummaryProps {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  currency?: string;
}

export function OrderSummary({ subtotal, discount, deliveryFee, currency = "SAR" }: OrderSummaryProps) {
  const t = useTranslations("cart");
  const total = subtotal - discount + deliveryFee;

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
        <hr className="border-border" />
        <div className="flex items-center justify-between">
          <span className="text-body-md text-primary">{t("total")}</span>
          <span className="text-body-xl font-bold text-primary">{currency} {total.toFixed(2)}</span>
        </div>
      </div>
      <div className="mt-5 flex gap-3">
        <Input icon={<Tag size={18} />} placeholder={t("couponCode")} />
        <Button size="small">{t("applyCoupon")}</Button>
      </div>
      <div className="mt-5">
        <Button size="full">{t("checkout")}</Button>
      </div>
    </div>
  );
}
