"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/shared/toast";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  type Address,
  type AddressInput,
} from "@/lib/api/addresses";
import { AddressCard } from "@/components/address/address-card";
import { AddressFormModal } from "@/components/address/address-form-modal";

export default function AddressBookPage() {
  const t = useTranslations("profile.addresses");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: addressesRes, isLoading } = useQuery({
    queryKey: queryKeys.profile.addresses(),
    queryFn: fetchAddresses,
  });

  const addresses = addressesRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.addresses(),
      });
      showToast({ message: t("addressSaved"), variant: "success" });
      setModalOpen(false);
    },
    onError: () => {
      showToast({ message: t("addressSaved"), variant: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddressInput }) =>
      updateAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.addresses(),
      });
      showToast({ message: t("addressUpdated"), variant: "success" });
      setEditingAddress(null);
    },
    onError: () => {
      showToast({ message: t("addressUpdated"), variant: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.addresses(),
      });
      showToast({ message: t("addressDeleted"), variant: "success" });
      setDeletingId(null);
    },
    onError: () => {
      showToast({ message: t("addressDeleted"), variant: "error" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.addresses(),
      });
      showToast({ message: t("defaultSet"), variant: "success" });
    },
    onError: () => {
      showToast({ message: t("defaultSet"), variant: "error" });
    },
  });

  const handleCreate = async (data: AddressInput) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: AddressInput) => {
    if (!editingAddress) return;
    await updateMutation.mutateAsync({ id: editingAddress.id, data });
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    await deleteMutation.mutateAsync(deletingId);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-32 bg-surface-muted rounded animate-pulse" />
          <div className="h-10 w-40 bg-surface-muted rounded-pill animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-border rounded-lg p-4 space-y-3"
            >
              <div className="h-4 w-16 bg-surface-muted rounded animate-pulse" />
              <div className="h-5 w-3/4 bg-surface-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-surface-muted rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-surface-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (addresses.length === 0) {
    return (
      <div>
        <h2 className="font-heading text-heading-lg font-bold text-primary mb-6">
          {t("title")}
        </h2>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MapPin className="w-20 h-20 text-primary-subtle mb-6" />
          <h3 className="font-heading text-heading-md font-bold text-primary mb-3">
            {t("noAddresses")}
          </h3>
          <p className="text-body-md text-primary-muted mb-8 max-w-md">
            {t("noAddressesMessage")}
          </p>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={18} className="me-2" />
            {t("addAddress")}
          </Button>
        </div>

        {/* Add Modal */}
        <AddressFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreate}
          isSubmitting={createMutation.isPending}
          title={t("addAddress")}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-heading-lg font-bold text-primary">
          {t("title")}
        </h2>
        <Button
          size="small"
          onClick={() => setModalOpen(true)}
          disabled={addresses.length >= 10}
        >
          <Plus size={16} className="me-2" />
          {t("addAddress")}
        </Button>
      </div>
      {addresses.length >= 10 && (
        <p className="text-body-xs text-primary-muted mb-4">
          {t("maxAddresses")}
        </p>
      )}

      {/* Address grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((address: Address) => (
          <AddressCard
            key={address.id}
            address={address}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSetDefault={(id) => setDefaultMutation.mutate(id)}
          />
        ))}
      </div>

      {/* Add Modal */}
      <AddressFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
        title={t("addAddress")}
      />

      {/* Edit Modal */}
      <AddressFormModal
        isOpen={!!editingAddress}
        onClose={() => setEditingAddress(null)}
        initialValues={
          editingAddress
            ? {
                label: editingAddress.label ?? undefined,
                recipientName: editingAddress.recipientName,
                streetLine1: editingAddress.streetLine1,
                streetLine2: editingAddress.streetLine2 ?? undefined,
                city: editingAddress.city,
                region: editingAddress.region,
                postalCode: editingAddress.postalCode,
                phone: editingAddress.phone,
                deliveryInstructions:
                  editingAddress.deliveryInstructions ?? undefined,
              }
            : undefined
        }
        onSubmit={handleUpdate}
        isSubmitting={updateMutation.isPending}
        title={t("editAddress")}
      />

      {/* Delete confirmation dialog */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDeletingId(null)}
        >
          <div
            className="bg-surface w-full max-w-sm rounded-lg shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-body-lg font-bold text-primary mb-3">
              {t("deleteAddress")}
            </h3>
            <p className="text-body-md text-primary-muted mb-6">
              {t("deleteConfirm")}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="small"
                onClick={() => setDeletingId(null)}
              >
                {t("cancel")}
              </Button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-3 rounded-pill text-body-sm font-medium bg-accent-red text-on-primary hover:opacity-85 transition-opacity disabled:opacity-40"
              >
                {deleteMutation.isPending ? "..." : t("deleteAddress")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
