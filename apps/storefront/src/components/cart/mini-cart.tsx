"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { X, ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/components/shared/toast";
import { MiniCartItem } from "./mini-cart-item";

interface MiniCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MiniCart({ isOpen, onClose }: MiniCartProps) {
  const t = useTranslations("cart");
  const { cart, itemCount, updateQuantity, removeItem, addItem } = useCart();
  const { showToast } = useToast();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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

  if (!isOpen) return null;

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const taxAmount = cart?.taxAmount ?? 0;
  const grandTotal = cart?.grandTotal ?? 0;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="absolute inset-y-0 end-0 w-[400px] max-w-full bg-surface shadow-xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading text-heading-md font-bold text-primary">
            {t("title")} ({itemCount})
          </h2>
          <button onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        {items.length > 0 ? (
          <>
            <div className="flex-1 overflow-y-auto px-6">
              {items.map((item: any) => (
                <MiniCartItem
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

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border space-y-3">
              <div className="flex justify-between text-body-sm text-primary-muted">
                <span>{t("subtotal")}</span>
                <span className="font-bold text-primary">SAR {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-body-sm text-primary-muted">
                <span>{t("vat")}</span>
                <span className="font-bold text-primary">SAR {taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-body-md text-primary">
                <span className="font-bold">{t("total")}</span>
                <span className="font-bold">SAR {grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-3 pt-2">
                <Link href="/cart" onClick={onClose} className="flex-1">
                  <Button variant="secondary" size="full">
                    {t("continueShopping")}
                  </Button>
                </Link>
                <Link href="/checkout" onClick={onClose} className="flex-1">
                  <Button size="full">{t("checkout")}</Button>
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <ShoppingBag className="w-16 h-16 text-primary-subtle mb-4" />
            <h3 className="text-heading-md font-heading font-bold text-primary mb-2">
              {t("empty")}
            </h3>
            <p className="text-body-md text-primary-muted mb-6">{t("emptyMessage")}</p>
            <Link href="/products" onClick={onClose}>
              <Button>{t("startShopping")}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
