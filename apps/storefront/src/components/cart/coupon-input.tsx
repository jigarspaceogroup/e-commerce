"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag, X } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

const KNOWN_COUPON_ERRORS = [
  "COUPON_NOT_FOUND",
  "COUPON_EXPIRED",
  "COUPON_USAGE_EXCEEDED",
  "COUPON_MIN_ORDER_NOT_MET",
  "COUPON_NOT_APPLICABLE",
  "COUPON_ALREADY_APPLIED",
  "AUTH_REQUIRED_FOR_COUPON",
];

export function CouponInput() {
  const t = useTranslations("cart");
  const { cart, applyCoupon, removeCoupon, isApplyingCoupon } = useCart();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const couponCode = cart?.couponCode;
  const discountAmount = cart?.discountAmount ?? 0;

  const handleApply = async () => {
    if (!code.trim()) return;
    setError("");
    const result = await applyCoupon(code.trim());
    if (!result.success) {
      const errorCode = result.code;
      if (errorCode && KNOWN_COUPON_ERRORS.includes(errorCode)) {
        setError(t(`couponError.${errorCode}` as any));
      } else {
        setError(t("invalidCoupon"));
      }
    } else {
      setCode("");
    }
  };

  const handleRemove = async () => {
    await removeCoupon();
    setCode("");
    setError("");
  };

  // Applied state -- show badge
  if (couponCode) {
    return (
      <div className="flex items-center justify-between bg-surface-muted rounded-pill px-4 py-3">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-primary" />
          <span className="text-body-sm font-bold text-primary">{couponCode}</span>
          {discountAmount > 0 && (
            <span className="text-body-sm text-accent-red">
              -SAR {discountAmount.toFixed(2)}
            </span>
          )}
        </div>
        <button
          onClick={handleRemove}
          className="p-1 rounded-full hover:bg-black/10 transition-colors"
          aria-label={t("removeCoupon")}
        >
          <X size={16} className="text-primary-muted" />
        </button>
      </div>
    );
  }

  // Default/Error state -- show input
  return (
    <div>
      <div className="flex gap-3">
        <Input
          icon={<Tag size={18} />}
          placeholder={t("couponPlaceholder")}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApply();
            }
          }}
          disabled={isApplyingCoupon}
        />
        <Button
          size="small"
          onClick={handleApply}
          disabled={isApplyingCoupon || !code.trim()}
        >
          {isApplyingCoupon ? "..." : t("applyCoupon")}
        </Button>
      </div>
      {error && (
        <p className="mt-2 ps-4 text-body-xs text-accent-red">{error}</p>
      )}
    </div>
  );
}
