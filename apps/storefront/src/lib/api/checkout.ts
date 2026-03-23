import { apiClient } from "../api-client";

export async function createOrder(data: {
  shippingAddressId?: string;
  shippingAddress?: Record<string, unknown>;
  guestEmail?: string;
  saveAddress?: boolean;
  idempotencyKey: string;
}) {
  return apiClient.post("/checkout", data);
}

export async function initiatePayment(data: {
  orderId: string;
  idempotencyKey: string;
}) {
  return apiClient.post("/payments/initiate", data);
}

export async function getPaymentStatus(paymentId: string) {
  return apiClient.get(`/payments/${paymentId}/status`);
}

export async function getPaymentMethods() {
  return apiClient.get("/payments/methods");
}
