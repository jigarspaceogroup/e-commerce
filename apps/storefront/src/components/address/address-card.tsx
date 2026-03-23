"use client";

import { useTranslations } from "next-intl";
import { Home, Briefcase, MapPin, Pencil, Trash2, Star } from "lucide-react";
import type { Address } from "@/lib/api/addresses";

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

const labelIcons: Record<string, typeof Home> = {
  home: Home,
  work: Briefcase,
  other: MapPin,
};

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  const t = useTranslations("profile.addresses");
  const LabelIcon = labelIcons[address.label ?? "other"] ?? MapPin;

  return (
    <div
      className={`relative border rounded-lg p-4 transition-colors ${
        address.isDefault ? "border-primary border-s-2" : "border-border"
      }`}
    >
      {/* Header: label + default badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LabelIcon size={16} className="text-primary-muted" />
          <span className="text-body-sm font-medium text-primary-muted capitalize">
            {address.label
              ? t(address.label as "home" | "work" | "other")
              : ""}
          </span>
        </div>
        {address.isDefault && (
          <span className="text-body-xs font-bold bg-primary text-on-primary px-2.5 py-0.5 rounded-pill">
            {t("defaultBadge")}
          </span>
        )}
      </div>

      {/* Address details */}
      <div className="space-y-1 mb-4">
        <p className="text-body-md font-bold text-primary">
          {address.recipientName}
        </p>
        <p className="text-body-sm text-primary-muted">{address.streetLine1}</p>
        {address.streetLine2 && (
          <p className="text-body-sm text-primary-muted">
            {address.streetLine2}
          </p>
        )}
        <p className="text-body-sm text-primary-muted">
          {address.city}, {address.region} {address.postalCode}
        </p>
        <p className="text-body-sm text-primary-muted">{address.phone}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <button
          onClick={() => onEdit(address)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-xs text-primary-muted hover:bg-surface-muted hover:text-primary transition-colors"
        >
          <Pencil size={14} />
          {t("editAddress")}
        </button>
        <button
          onClick={() => onDelete(address.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-xs text-accent-red hover:bg-accent-red/5 transition-colors"
        >
          <Trash2 size={14} />
          {t("deleteAddress")}
        </button>
        {!address.isDefault && (
          <button
            onClick={() => onSetDefault(address.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-xs text-primary-muted hover:bg-surface-muted hover:text-primary transition-colors ms-auto"
          >
            <Star size={14} />
            {t("setDefault")}
          </button>
        )}
      </div>
    </div>
  );
}
