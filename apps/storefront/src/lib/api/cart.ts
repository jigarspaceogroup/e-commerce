import { apiClient } from "../api-client";

export async function fetchCart() {
  return apiClient.get("/cart");
}

export async function addCartItem(data: { productVariantId: string; quantity: number }) {
  return apiClient.post("/cart/items", data);
}

export async function updateCartItem(itemId: string, data: { quantity: number }) {
  return apiClient.patch(`/cart/items/${itemId}`, data);
}

export async function removeCartItem(itemId: string) {
  return apiClient.del(`/cart/items/${itemId}`);
}

export async function mergeCart() {
  return apiClient.post("/cart/merge");
}

export async function applyCoupon(code: string) {
  return apiClient.post("/cart/coupon", { code });
}

export async function removeCoupon() {
  return apiClient.del("/cart/coupon");
}
