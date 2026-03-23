"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCart, addCartItem, updateCartItem, removeCartItem, mergeCart, applyCoupon, removeCoupon } from "./api/cart";
import { queryKeys } from "./query-keys";

interface CartContextValue {
  cart: any | null;
  itemCount: number;
  isLoading: boolean;
  addItem: (productVariantId: string, quantity: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  isAddingItem: boolean;
  merge: () => Promise<void>;
  applyCoupon: (code: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  removeCoupon: () => Promise<void>;
  isApplyingCoupon: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: cartResponse, isLoading } = useQuery({
    queryKey: queryKeys.cart.current(),
    queryFn: fetchCart,
    staleTime: 60_000,
  });

  const cart = (cartResponse?.data ?? null) as { itemCount?: number } | null;
  const itemCount = cart?.itemCount ?? 0;

  const addMutation = useMutation({
    mutationFn: (vars: { productVariantId: string; quantity: number }) =>
      addCartItem(vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { itemId: string; quantity: number }) =>
      updateCartItem(vars.itemId, { quantity: vars.quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
  });

  const mergeMutation = useMutation({
    mutationFn: mergeCart,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
  });

  const applyCouponMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await applyCoupon(code);
      if (!res.success) {
        throw res;
      }
      return res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
  });

  const removeCouponMutation = useMutation({
    mutationFn: async () => {
      const res = await removeCoupon();
      if (!res.success) {
        throw res;
      }
      return res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
  });

  const addItem = useCallback(
    async (productVariantId: string, quantity: number) => {
      await addMutation.mutateAsync({ productVariantId, quantity });
    },
    [addMutation],
  );

  const updateQuantityFn = useCallback(
    async (itemId: string, quantity: number) => {
      await updateMutation.mutateAsync({ itemId, quantity });
    },
    [updateMutation],
  );

  const removeItemFn = useCallback(
    async (itemId: string) => {
      await removeMutation.mutateAsync(itemId);
    },
    [removeMutation],
  );

  const mergeFn = useCallback(async () => {
    await mergeMutation.mutateAsync();
  }, [mergeMutation]);

  const applyCouponFn = useCallback(async (code: string) => {
    try {
      await applyCouponMutation.mutateAsync(code);
      return { success: true as const };
    } catch (err: any) {
      return { success: false as const, error: err?.error, code: err?.code };
    }
  }, [applyCouponMutation]);

  const removeCouponFn = useCallback(async () => {
    await removeCouponMutation.mutateAsync();
  }, [removeCouponMutation]);

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        isLoading,
        addItem,
        updateQuantity: updateQuantityFn,
        removeItem: removeItemFn,
        isAddingItem: addMutation.isPending,
        merge: mergeFn,
        applyCoupon: applyCouponFn,
        removeCoupon: removeCouponFn,
        isApplyingCoupon: applyCouponMutation.isPending,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
