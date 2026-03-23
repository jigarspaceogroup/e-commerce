"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { AddressForm } from "./address-form";
import type { AddressInput } from "@/lib/api/addresses";

interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValues?: Partial<AddressInput>;
  onSubmit: (data: AddressInput) => Promise<void>;
  isSubmitting?: boolean;
  title: string;
}

export function AddressFormModal({
  isOpen,
  onClose,
  initialValues,
  onSubmit,
  isSubmitting,
  title,
}: AddressFormModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-surface w-full max-w-lg rounded-lg shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading text-heading-md font-bold text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-muted transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-primary-muted" />
          </button>
        </div>
        {/* Body (scrollable) */}
        <div className="overflow-y-auto px-6 py-5">
          <AddressForm
            initialValues={initialValues}
            onSubmit={onSubmit}
            onCancel={onClose}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
