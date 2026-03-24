"use client";

import { useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface GuestCheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

export function GuestCheckoutModal({ open, onClose }: GuestCheckoutModalProps) {
  const t = useTranslations("checkout.guest");
  const router = useRouter();

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-lg bg-white p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute end-4 top-4 text-primary-muted hover:text-primary transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="font-heading text-heading-md font-bold text-primary mb-2">
          {t("guestModalTitle")}
        </h2>
        <p className="text-body-md text-primary-muted mb-6">
          {t("guestModalDescription")}
        </p>

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="full"
            onClick={() => router.push("/checkout?guest=true")}
          >
            {t("checkoutAsGuest")}
          </Button>
          <Button
            variant="secondary"
            size="full"
            onClick={() => router.push("/auth/login?redirect=/checkout")}
          >
            {t("loginOrRegister")}
          </Button>
        </div>
      </div>
    </div>
  );
}
