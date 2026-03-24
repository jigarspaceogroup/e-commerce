import { apiClient } from "../api-client";

export async function getOrder(orderId: string, email?: string) {
  return apiClient.get(`/orders/${orderId}`, email ? { email } : undefined);
}

export async function getOrders(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
}) {
  return apiClient.get("/orders", params as Record<string, string | number | boolean | undefined>);
}
