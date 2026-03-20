"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCart, addCartItem, updateCartItem, removeCartItem, mergeCart } from "./api/cart";
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
