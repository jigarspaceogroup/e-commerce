import { apiClient } from "../api-client";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

export async function fetchProfile() {
  return apiClient.get<UserProfile>("/users/me");
}

export async function updateProfile(data: {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
}) {
  return apiClient.patch<UserProfile>("/users/me", data);
}
