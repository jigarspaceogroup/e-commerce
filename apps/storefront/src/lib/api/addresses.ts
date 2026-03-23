import { apiClient } from "../api-client";

export interface Address {
  id: string;
  label: string | null;
  recipientName: string;
  streetLine1: string;
  streetLine2: string | null;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  deliveryInstructions: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddressInput {
  label?: string;
  recipientName: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  region: string;
  postalCode: string;
  phone: string;
  country?: string;
  deliveryInstructions?: string;
}

export async function fetchAddresses() {
  return apiClient.get<Address[]>("/users/me/addresses");
}

export async function createAddress(data: AddressInput) {
  return apiClient.post<Address>("/users/me/addresses", data);
}

export async function updateAddress(id: string, data: AddressInput) {
  return apiClient.put<Address>(`/users/me/addresses/${id}`, data);
}

export async function deleteAddress(id: string) {
  return apiClient.del(`/users/me/addresses/${id}`);
}

export async function setDefaultAddress(id: string) {
  return apiClient.patch<Address>(`/users/me/addresses/${id}/default`);
}
