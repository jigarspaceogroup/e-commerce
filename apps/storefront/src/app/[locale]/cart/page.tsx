"use client";

import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/components/shared/toast";
import { CartItem } from "@/components/cart/cart-item";
import { OrderSummary } from "@/components/cart/order-summary";
import { CouponInput } from "@/components/cart/coupon-input";

export default function CartPage() {
  const t = useTranslations("cart");
  const { cart, isLoading, itemCount, updateQuantity, removeItem, addItem } = useCart();
  const { showToast } = useToast();

  const handleRemove = async (itemId: string) => {
    const removedItem = cart?.items.find((i: any) => i.id === itemId);
    await removeItem(itemId);

    if (removedItem) {
      showToast({
        message: t("itemRemoved"),
        variant: "success",
        action: {
          label: "Undo",
          onClick: async () => {
            await addItem(removedItem.variant.id, removedItem.quantity);
          },
        },
        duration: 5000,
      });
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-6">
        <div className="h-10 w-48 bg-surface-muted rounded mb-6 animate-pulse" />
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 lg:flex-[2] border border-border rounded-lg p-4 lg:p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 py-6 border-b border-border last:border-0">
                <div className="w-[100px] h-[100px] lg:w-[124px] lg:h-[124px] bg-surface-muted rounded-lg animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-3/4 bg-surface-muted rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-surface-muted rounded animate-pulse" />
                  <div className="h-8 w-full bg-surface-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
          <div className="lg:flex-1">
            <div className="border border-border rounded-lg p-5 lg:p-6 space-y-4">
              <div className="h-6 w-32 bg-surface-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-surface-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-surface-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-surface-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (itemCount === 0) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-6">
        <h1 className="font-heading text-display-md font-bold text-primary mb-6">
          {t("title")}
        </h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="w-24 h-24 text-primary-subtle mb-6" />
          <h2 className="font-heading text-heading-lg font-bold text-primary mb-3">
            {t("empty")}
          </h2>
          <p className="text-body-lg text-primary-muted mb-8 max-w-md">
            {t("emptyMessage")}
          </p>
          <Link href="/products">
            <Button>{t("startShopping")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const taxAmount = cart?.taxAmount ?? 0;
  const shippingEstimate = cart?.shippingEstimate ?? 0;
  const discountAmount = cart?.discountAmount ?? 0;
  const grandTotal = cart?.grandTotal ?? 0;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6">
      <h1 className="font-heading text-display-md font-bold text-primary mb-6">
        {t("title")}
      </h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 lg:flex-[2] border border-border rounded-lg p-4 lg:p-6">
          <div className="divide-y divide-border">
            {items.map((item: any) => (
              <CartItem
                key={item.id}
                id={item.id}
                quantity={item.quantity}
                variant={item.variant}
                product={item.product}
                onUpdateQuantity={(id, qty) => updateQuantity(id, qty)}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </div>
        <div className="lg:flex-1">
          <OrderSummary
            subtotal={subtotal}
            discount={discountAmount}
            deliveryFee={shippingEstimate}
            taxAmount={taxAmount}
            grandTotal={grandTotal}
            couponSlot={<CouponInput />}
          />
        </div>
      </div>
    </div>
  );
}
