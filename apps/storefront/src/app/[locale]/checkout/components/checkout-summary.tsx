"use client";

import { useTranslations } from "next-intl";

interface CheckoutSummaryProps {
  subtotal: number;
  discountAmount: number | null;
  shippingFee: number | null;
  taxAmount: number;
  grandTotal: number;
  couponCode: string | null;
  currency?: string;
}

export function CheckoutSummary({
  subtotal,
  discountAmount,
  shippingFee,
  taxAmount,
  grandTotal,
  couponCode,
  currency = "SAR",
}: CheckoutSummaryProps) {
  const t = useTranslations("checkout.review");

  return (
    <div className="border border-border rounded-lg p-6 lg:sticky lg:top-24">
      <h2 className="font-heading text-heading-md font-bold text-primary mb-5">
        {t("orderSummary")}
      </h2>

      <div className="space-y-4">
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-body-md text-primary-muted">{t("subtotal")}</span>
          <span className="text-body-md font-bold text-primary">
            {currency} {subtotal.toFixed(2)}
          </span>
        </div>

        {/* Discount */}
        {discountAmount && discountAmount > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-body-md text-primary-muted">{t("discount")}</span>
              {couponCode && (
                <span className="text-body-xs font-medium text-on-primary bg-primary px-2 py-0.5 rounded">
                  {couponCode}
                </span>
              )}
            </div>
            <span className="text-body-md font-bold text-accent-red">
              -{currency} {discountAmount.toFixed(2)}
            </span>
          </div>
        )}

        {/* Shipping */}
        <div className="flex items-center justify-between">
          <span className="text-body-md text-primary-muted">{t("shipping")}</span>
          <span className="text-body-md font-bold text-primary">
            {shippingFee === null
              ? "—"
              : shippingFee === 0
                ? t("../shipping.freeShipping")
                : `${currency} ${shippingFee.toFixed(2)}`}
          </span>
        </div>

        {/* VAT */}
        <div className="flex items-center justify-between">
          <span className="text-body-md text-primary-muted">{t("vat")}</span>
          <span className="text-body-md font-bold text-primary">
            {currency} {taxAmount.toFixed(2)}
          </span>
        </div>

        <hr className="border-border" />

        {/* Grand Total */}
        <div className="flex items-center justify-between">
          <span className="font-heading text-body-lg font-bold text-primary">
            {t("total")}
          </span>
          <span className="font-heading text-heading-md font-bold text-primary">
            {currency} {grandTotal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
