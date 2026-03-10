import { Gender, PreferredLanguage, UserStatus } from "../enums";

export interface User {
  id: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  gender: Gender | null;
  preferredLanguage: PreferredLanguage;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Address {
  id: string;
  userId: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSocialAccount {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  email: string | null;
  createdAt: Date;
}
