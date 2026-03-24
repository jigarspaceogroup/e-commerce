"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressForm } from "@/components/address/address-form";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/shared/toast";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchAddresses,
  createAddress,
  type AddressInput,
} from "@/lib/api/addresses";

type CheckoutAction =
  | {
      type: "SET_ADDRESS";
      payload: {
        address: Record<string, unknown>;
        addressId?: string;
        isNew: boolean;
        save: boolean;
      };
    }
  | { type: "SET_GUEST_INFO"; payload: { email: string; phone: string } }
  | { type: "SET_STEP"; payload: 1 | 2 | 3 | 4 };

interface StepAddressProps {
  dispatch: React.Dispatch<CheckoutAction>;
  isGuest: boolean;
}

export function StepAddress({ dispatch, isGuest }: StepAddressProps) {
  const t = useTranslations("checkout.shipping");
  const tGuest = useTranslations("checkout.guest");
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [showAddNew, setShowAddNew] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [saveToAddressBook, setSaveToAddressBook] = useState(false);

  // Guest fields
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestAddress, setGuestAddress] = useState<AddressInput | null>(null);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Fetch addresses for authenticated users
  const { data: addresses = [], isLoading } = useQuery({
    queryKey: queryKeys.profile.addresses(),
    queryFn: fetchAddresses,
    enabled: !isGuest && !!user,
  });

  // Create address mutation
  const createMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.addresses() });
      showToast({ message: "Address saved", variant: "success" });
      setShowAddNew(false);
    },
    onError: () => {
      showToast({ message: "Failed to save address", variant: "error" });
    },
  });

  // Set default address on mount
  useState(() => {
    const addressesData = Array.isArray(addresses) ? addresses : [];
    if (!isGuest && addressesData.length > 0 && !selectedAddressId) {
      const defaultAddr: any = addressesData.find((a: any) => a.isDefault) ?? addressesData[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }
    }
  });

  function handleAddressSelect(addressId: string) {
    setSelectedAddressId(addressId);
    setShowAddNew(false);
  }

  async function handleNewAddressSubmit(data: AddressInput) {
    if (isGuest) {
      setGuestAddress(data);
      setShowAddNew(false);
    } else {
      await createMutation.mutateAsync(data);
    }
  }

  function validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) {
      setEmailError(t("email") + " is required");
      return false;
    }
    setEmailError("");
    return true;
  }

  function validatePhone(phone: string): boolean {
    if (!/^(\+966|0)\d{9}$/.test(phone)) {
      setPhoneError(t("phone") + " must start with +966 or 0");
      return false;
    }
    setPhoneError("");
    return true;
  }

  function handleContinue() {
    if (isGuest) {
      // Validate guest fields
      const emailValid = validateEmail(guestEmail);
      const phoneValid = validatePhone(guestPhone);

      if (!emailValid || !phoneValid || !guestAddress) {
        return;
      }

      // Dispatch guest info and address
      dispatch({
        type: "SET_GUEST_INFO",
        payload: { email: guestEmail, phone: guestPhone },
      });

      dispatch({
        type: "SET_ADDRESS",
        payload: {
          address: guestAddress as unknown as Record<string, unknown>,
          isNew: true,
          save: false,
        },
      });
    } else {
      // Authenticated user
      const addressesData = Array.isArray(addresses) ? addresses : [];
      const selected = addressesData.find((a: any) => a.id === selectedAddressId);
      if (!selected) return;

      dispatch({
        type: "SET_ADDRESS",
        payload: {
          address: selected as Record<string, unknown>,
          addressId: (selected as any).id,
          isNew: false,
          save: false,
        },
      });
    }

    dispatch({ type: "SET_STEP", payload: 2 });
  }

  const canContinue = isGuest
    ? guestEmail && guestPhone && guestAddress
    : selectedAddressId !== null;

  if (!isGuest && isLoading) {
    return (
      <div className="border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-muted rounded w-1/3" />
          <div className="h-32 bg-surface-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-6">
      <h2 className="font-heading text-heading-md font-bold text-primary mb-4">
        {t("title")}
      </h2>

      {isGuest ? (
        <div className="space-y-5">
          <h3 className="font-heading text-heading-sm font-semibold text-primary">
            {tGuest("guestInfo")}
          </h3>

          {/* Email */}
          <div>
            <label className="block text-body-sm font-medium text-primary mb-1.5">
              {t("email")}
            </label>
            <Input
              type="email"
              value={guestEmail}
              onChange={(e) => {
                setGuestEmail(e.target.value);
                setEmailError("");
              }}
              error={emailError}
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-body-sm font-medium text-primary mb-1.5">
              {t("phone")}
            </label>
            <Input
              value={guestPhone}
              onChange={(e) => {
                setGuestPhone(e.target.value);
                setPhoneError("");
              }}
              error={phoneError}
              placeholder="+966XXXXXXXXX"
              required
            />
          </div>

          {/* Address Form */}
          {!guestAddress && (
            <div className="pt-4 border-t border-border">
              <h3 className="font-heading text-heading-sm font-semibold text-primary mb-4">
                {t("title")}
              </h3>
              <AddressForm
                onSubmit={handleNewAddressSubmit}
                onCancel={() => {}}
                isSubmitting={false}
                translationNamespace="checkout.shipping"
              />
            </div>
          )}

          {guestAddress && (
            <div className="border border-border rounded-lg p-4 bg-surface">
              <div className="flex items-start justify-between mb-2">
                <p className="text-body-md font-bold text-primary">
                  {guestAddress.recipientName}
                </p>
                <button
                  onClick={() => setGuestAddress(null)}
                  className="text-body-sm text-primary-muted hover:text-primary"
                >
                  {t("editAddress")}
                </button>
              </div>
              <p className="text-body-sm text-primary-muted">
                {guestAddress.streetLine1}
              </p>
              {guestAddress.streetLine2 && (
                <p className="text-body-sm text-primary-muted">
                  {guestAddress.streetLine2}
                </p>
              )}
              <p className="text-body-sm text-primary-muted">
                {guestAddress.city}, {guestAddress.region}{" "}
                {guestAddress.postalCode}
              </p>
              <p className="text-body-sm text-primary-muted">
                {guestAddress.phone}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-body-sm text-primary-muted">
            {tGuest("selectAddress")}
          </p>

          {/* Saved addresses */}
          <div className="space-y-3">
            {(Array.isArray(addresses) ? addresses : []).map((address: any) => (
              <button
                key={address.id}
                onClick={() => handleAddressSelect(address.id)}
                className={`w-full text-start border rounded-lg p-4 transition-colors ${
                  selectedAddressId === address.id
                    ? "border-2 border-primary bg-surface"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-body-md font-bold text-primary">
                        {address.recipientName}
                      </p>
                      {address.isDefault && (
                        <span className="text-body-xs font-bold bg-primary text-on-primary px-2 py-0.5 rounded-pill">
                          {t("defaultAddress")}
                        </span>
                      )}
                    </div>
                    <p className="text-body-sm text-primary-muted">
                      {address.streetLine1}
                    </p>
                    {address.streetLine2 && (
                      <p className="text-body-sm text-primary-muted">
                        {address.streetLine2}
                      </p>
                    )}
                    <p className="text-body-sm text-primary-muted">
                      {address.city}, {address.region} {address.postalCode}
                    </p>
                    <p className="text-body-sm text-primary-muted">
                      {address.phone}
                    </p>
                  </div>
                  {selectedAddressId === address.id && (
                    <Check size={20} className="text-primary flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Add new address toggle */}
          {!showAddNew && (
            <Button
              variant="secondary"
              onClick={() => setShowAddNew(true)}
              size="default"
            >
              <Plus size={16} className="me-2" />
              {t("addNewAddress")}
            </Button>
          )}

          {showAddNew && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="saveAddress"
                  checked={saveToAddressBook}
                  onChange={(e) => setSaveToAddressBook(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <label
                  htmlFor="saveAddress"
                  className="text-body-sm text-primary"
                >
                  {tGuest("saveToAddressBook")}
                </label>
              </div>
              <AddressForm
                onSubmit={handleNewAddressSubmit}
                onCancel={() => setShowAddNew(false)}
                isSubmitting={createMutation.isPending}
                translationNamespace="checkout.shipping"
              />
            </div>
          )}
        </div>
      )}

      {/* Continue button */}
      <div className="mt-6 pt-6 border-t border-border">
        <Button onClick={handleContinue} disabled={!canContinue} size="full">
          Continue
        </Button>
      </div>
    </div>
  );
}
