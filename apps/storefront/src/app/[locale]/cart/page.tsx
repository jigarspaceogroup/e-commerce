"use client";

import { useTranslations } from "next-intl";
import { CartItem } from "@/components/cart/cart-item";
import { OrderSummary } from "@/components/cart/order-summary";

const PLACEHOLDER_ITEMS = [
  { name: "Gradient Graphic T-shirt", size: "Large", color: "White", price: 145, quantity: 1 },
  { name: "Checkered Shirt", size: "Medium", color: "Red", price: 180, quantity: 1 },
  { name: "Skinny Fit Jeans", size: "Large", color: "Blue", price: 240, quantity: 1 },
];

export default function CartPage() {
  const t = useTranslations("cart");

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6">
      <h1 className="font-heading text-display-md font-bold text-primary mb-6">
        {t("title")}
      </h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 lg:flex-[2] border border-border rounded-lg p-4 lg:p-6">
          <div className="divide-y divide-border">
            {PLACEHOLDER_ITEMS.map((item, i) => (
              <CartItem key={i} {...item} />
            ))}
          </div>
        </div>
        <div className="lg:flex-1">
          <OrderSummary subtotal={565} discount={113} deliveryFee={0} />
        </div>
      </div>
    </div>
  );
}
