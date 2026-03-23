"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Briefcase, MapPin } from "lucide-react";
import type { AddressInput } from "@/lib/api/addresses";

const SAUDI_REGIONS = [
  "riyadh",
  "makkah",
  "madinah",
  "eastern",
  "asir",
  "tabuk",
  "hail",
  "northern_borders",
  "jazan",
  "najran",
  "bahah",
  "jawf",
  "qassim",
] as const;

interface AddressFormProps {
  initialValues?: Partial<AddressInput>;
  onSubmit: (data: AddressInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AddressForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: AddressFormProps) {
  const t = useTranslations("profile.addresses");

  const [label, setLabel] = useState(initialValues?.label ?? "home");
  const [recipientName, setRecipientName] = useState(
    initialValues?.recipientName ?? ""
  );
  const [streetLine1, setStreetLine1] = useState(
    initialValues?.streetLine1 ?? ""
  );
  const [streetLine2, setStreetLine2] = useState(
    initialValues?.streetLine2 ?? ""
  );
  const [city, setCity] = useState(initialValues?.city ?? "");
  const [region, setRegion] = useState(initialValues?.region ?? "");
  const [postalCode, setPostalCode] = useState(
    initialValues?.postalCode ?? ""
  );
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    initialValues?.deliveryInstructions ?? ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (recipientName.length < 2) {
      newErrors.recipientName = t("recipientName") + " is required";
    }
    if (streetLine1.length < 5) {
      newErrors.streetLine1 = t("streetLine1") + " is required";
    }
    if (!city) {
      newErrors.city = t("city") + " is required";
    }
    if (!region) {
      newErrors.region = t("region") + " is required";
    }
    if (!/^\d{5}$/.test(postalCode)) {
      newErrors.postalCode = "5 digits required";
    }
    if (!/^(\+966|0)\d{9}$/.test(phone)) {
      newErrors.phone = t("phonePlaceholder");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      label,
      recipientName,
      streetLine1,
      streetLine2: streetLine2 || undefined,
      city,
      region,
      postalCode,
      phone,
      country: "SA",
      deliveryInstructions: deliveryInstructions || undefined,
    });
  }

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  const labelOptions = [
    { value: "home", icon: Home, label: t("home") },
    { value: "work", icon: Briefcase, label: t("work") },
    { value: "other", icon: MapPin, label: t("other") },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Label selector - pill buttons */}
      <div>
        <label className="block text-body-sm font-medium text-primary mb-2">
          {t("addressLabel")}
        </label>
        <div className="flex gap-2">
          {labelOptions.map(({ value, icon: Icon, label: labelText }) => (
            <button
              key={value}
              type="button"
              onClick={() => setLabel(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-pill text-body-sm transition-colors ${
                label === value
                  ? "bg-primary text-on-primary"
                  : "bg-surface-muted text-primary hover:bg-black/10"
              }`}
            >
              <Icon size={16} />
              {labelText}
            </button>
          ))}
        </div>
      </div>

      {/* Recipient name - full width */}
      <div>
        <label className="block text-body-sm font-medium text-primary mb-1.5">
          {t("recipientName")}
        </label>
        <Input
          value={recipientName}
          onChange={(e) => {
            setRecipientName(e.target.value);
            clearError("recipientName");
          }}
          error={errors.recipientName}
          required
        />
      </div>

      {/* Street address line 1 */}
      <div>
        <label className="block text-body-sm font-medium text-primary mb-1.5">
          {t("streetLine1")}
        </label>
        <Input
          value={streetLine1}
          onChange={(e) => {
            setStreetLine1(e.target.value);
            clearError("streetLine1");
          }}
          error={errors.streetLine1}
          required
        />
      </div>

      {/* Street address line 2 */}
      <div>
        <label className="block text-body-sm font-medium text-primary mb-1.5">
          {t("streetLine2")}
        </label>
        <Input
          value={streetLine2}
          onChange={(e) => setStreetLine2(e.target.value)}
        />
      </div>

      {/* City + Region - 2 cols */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-body-sm font-medium text-primary mb-1.5">
            {t("city")}
          </label>
          <Input
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              clearError("city");
            }}
            error={errors.city}
            required
          />
        </div>
        <div>
          <label className="block text-body-sm font-medium text-primary mb-1.5">
            {t("region")}
          </label>
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              clearError("region");
            }}
            className={`w-full rounded-pill border bg-surface py-3 px-4 text-body-md text-primary transition-colors focus:border-primary focus:outline-none ${
              errors.region ? "border-accent-red" : "border-border"
            }`}
            required
          >
            <option value="">{t("region")}</option>
            {SAUDI_REGIONS.map((r) => (
              <option key={r} value={r}>
                {t(`regions.${r}`)}
              </option>
            ))}
          </select>
          {errors.region && (
            <p className="mt-1 ps-4 text-body-xs text-accent-red">
              {errors.region}
            </p>
          )}
        </div>
      </div>

      {/* Postal code + Phone - 2 cols */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-body-sm font-medium text-primary mb-1.5">
            {t("postalCode")}
          </label>
          <Input
            value={postalCode}
            onChange={(e) => {
              setPostalCode(e.target.value);
              clearError("postalCode");
            }}
            error={errors.postalCode}
            maxLength={5}
            inputMode="numeric"
            required
          />
        </div>
        <div>
          <label className="block text-body-sm font-medium text-primary mb-1.5">
            {t("phone")}
          </label>
          <Input
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearError("phone");
            }}
            error={errors.phone}
            placeholder={t("phonePlaceholder")}
            required
          />
        </div>
      </div>

      {/* Delivery instructions */}
      <div>
        <label className="block text-body-sm font-medium text-primary mb-1.5">
          {t("deliveryInstructions")}
        </label>
        <textarea
          value={deliveryInstructions}
          onChange={(e) => setDeliveryInstructions(e.target.value)}
          placeholder={t("deliveryInstructionsPlaceholder")}
          maxLength={500}
          rows={3}
          className="w-full rounded-lg border border-border bg-surface py-3 px-4 text-body-md text-primary placeholder:text-primary-subtle transition-colors focus:border-primary focus:outline-none resize-none"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "..." : t("saveAddress")}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
