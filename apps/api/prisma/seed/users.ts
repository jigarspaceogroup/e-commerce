import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { Language } from "../../src/generated/prisma/client.js";
import { hashPassword } from "../../src/services/auth.js";
import { ROLE_IDS } from "./roles.js";

// ---------------------------------------------------------------------------
// Deterministic UUIDs
// ---------------------------------------------------------------------------
export const USER_IDS = {
  BUYER_1: "c0000000-0000-4000-8000-000000000001",
  BUYER_2: "c0000000-0000-4000-8000-000000000002",
  BUYER_3: "c0000000-0000-4000-8000-000000000003",
  BUYER_4: "c0000000-0000-4000-8000-000000000004",
  BUYER_5: "c0000000-0000-4000-8000-000000000005",
  ADMIN: "c0000000-0000-4000-8000-000000000010",
  PRODUCT_MANAGER: "c0000000-0000-4000-8000-000000000011",
  ORDER_MANAGER: "c0000000-0000-4000-8000-000000000012",
} as const;

export const ADDRESS_IDS = {
  BUYER_1_HOME: "d0000000-0000-4000-8000-000000000001",
  BUYER_1_WORK: "d0000000-0000-4000-8000-000000000002",
  BUYER_2_HOME: "d0000000-0000-4000-8000-000000000003",
} as const;

const DEFAULT_PASSWORD = "Password123!";

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------
export async function seedUsers(prisma: PrismaClient): Promise<void> {
  console.log("Seeding users...");

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const now = new Date();

  // ---- Buyer 1: Arabic, verified, 2 addresses ----
  await prisma.user.upsert({
    where: { email: "buyer1@example.com" },
    update: {},
    create: {
      id: USER_IDS.BUYER_1,
      email: "buyer1@example.com",
      phone: "+966500000001",
      passwordHash,
      firstName: "Ahmed",
      lastName: "Al-Rashid",
      preferredLanguage: Language.ar,
      emailVerifiedAt: now,
      phoneVerifiedAt: now,
      lastLoginAt: now,
    },
  });

  // ---- Buyer 2: Arabic, verified, 1 address ----
  await prisma.user.upsert({
    where: { email: "buyer2@example.com" },
    update: {},
    create: {
      id: USER_IDS.BUYER_2,
      email: "buyer2@example.com",
      phone: "+966500000002",
      passwordHash,
      firstName: "Fatimah",
      lastName: "Al-Saud",
      preferredLanguage: Language.ar,
      emailVerifiedAt: now,
      phoneVerifiedAt: now,
      lastLoginAt: new Date("2026-03-08"),
    },
  });

  // ---- Buyer 3: Arabic, unverified phone ----
  await prisma.user.upsert({
    where: { email: "buyer3@example.com" },
    update: {},
    create: {
      id: USER_IDS.BUYER_3,
      email: "buyer3@example.com",
      phone: "+966500000003",
      passwordHash,
      firstName: "Mohammed",
      lastName: "Al-Qahtani",
      preferredLanguage: Language.ar,
      emailVerifiedAt: now,
      // phoneVerifiedAt intentionally omitted
      lastLoginAt: new Date("2026-03-01"),
    },
  });

  // ---- Buyer 4: English, verified, social login linked ----
  await prisma.user.upsert({
    where: { email: "buyer4@example.com" },
    update: {},
    create: {
      id: USER_IDS.BUYER_4,
      email: "buyer4@example.com",
      phone: "+966500000004",
      passwordHash,
      firstName: "Sarah",
      lastName: "Johnson",
      preferredLanguage: Language.en,
      emailVerifiedAt: now,
      phoneVerifiedAt: now,
      lastLoginAt: now,
    },
  });

  // ---- Buyer 5: English, verified ----
  await prisma.user.upsert({
    where: { email: "buyer5@example.com" },
    update: {},
    create: {
      id: USER_IDS.BUYER_5,
      email: "buyer5@example.com",
      phone: "+966500000005",
      passwordHash,
      firstName: "David",
      lastName: "Williams",
      preferredLanguage: Language.en,
      emailVerifiedAt: now,
      phoneVerifiedAt: now,
      lastLoginAt: new Date("2026-02-20"),
    },
  });

  // ---- Super Admin ----
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      id: USER_IDS.ADMIN,
      email: "admin@example.com",
      phone: "+966500000010",
      passwordHash,
      firstName: "Admin",
      lastName: "Super",
      preferredLanguage: Language.en,
      emailVerifiedAt: now,
      phoneVerifiedAt: now,
      lastLoginAt: now,
    },
  });

  // ---- Product Manager ----
  await prisma.user.upsert({
    where: { email: "products@example.com" },
    update: {},
    create: {
      id: USER_IDS.PRODUCT_MANAGER,
      email: "products@example.com",
      phone: "+966500000011",
      passwordHash,
      firstName: "Nora",
      lastName: "Al-Harbi",
      preferredLanguage: Language.ar,
      emailVerifiedAt: now,
      phoneVerifiedAt: now,
      lastLoginAt: now,
    },
  });

  // ---- Order Manager ----
  await prisma.user.upsert({
    where: { email: "orders@example.com" },
    update: {},
    create: {
      id: USER_IDS.ORDER_MANAGER,
      email: "orders@example.com",
      phone: "+966500000012",
      passwordHash,
      firstName: "Omar",
      lastName: "Al-Mutairi",
      preferredLanguage: Language.ar,
      emailVerifiedAt: now,
      phoneVerifiedAt: now,
      lastLoginAt: now,
    },
  });

  console.log("  Created 8 user accounts");

  // ---- Addresses ----
  console.log("Seeding addresses...");

  // Buyer 1 — Home (default)
  await prisma.address.upsert({
    where: { id: ADDRESS_IDS.BUYER_1_HOME },
    update: {},
    create: {
      id: ADDRESS_IDS.BUYER_1_HOME,
      userId: USER_IDS.BUYER_1,
      label: "Home",
      recipientName: "Ahmed Al-Rashid",
      streetLine1: "123 King Fahd Road",
      streetLine2: "Apt 4B",
      city: "Riyadh",
      region: "Riyadh",
      postalCode: "12345",
      country: "SA",
      phone: "+966500000001",
      isDefault: true,
    },
  });

  // Buyer 1 — Work
  await prisma.address.upsert({
    where: { id: ADDRESS_IDS.BUYER_1_WORK },
    update: {},
    create: {
      id: ADDRESS_IDS.BUYER_1_WORK,
      userId: USER_IDS.BUYER_1,
      label: "Work",
      recipientName: "Ahmed Al-Rashid",
      streetLine1: "456 Olaya Street",
      streetLine2: "Tower C, Floor 12",
      city: "Riyadh",
      region: "Riyadh",
      postalCode: "12346",
      country: "SA",
      phone: "+966500000099",
      deliveryInstructions: "Deliver to reception desk",
      isDefault: false,
    },
  });

  // Buyer 2 — Home (default)
  await prisma.address.upsert({
    where: { id: ADDRESS_IDS.BUYER_2_HOME },
    update: {},
    create: {
      id: ADDRESS_IDS.BUYER_2_HOME,
      userId: USER_IDS.BUYER_2,
      label: "Home",
      recipientName: "Fatimah Al-Saud",
      streetLine1: "789 Prince Sultan Road",
      city: "Jeddah",
      region: "Makkah",
      postalCode: "21442",
      country: "SA",
      phone: "+966500000002",
      isDefault: true,
    },
  });

  console.log("  Created 3 addresses");

  // ---- Social accounts (Buyer 4) ----
  console.log("Seeding social accounts...");

  await prisma.userSocialAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: "google-oauth2|112233445566",
      },
    },
    update: {},
    create: {
      userId: USER_IDS.BUYER_4,
      provider: "google",
      providerAccountId: "google-oauth2|112233445566",
      email: "buyer4@example.com",
    },
  });

  console.log("  Linked 1 social account");

  // ---- User roles (admin users) ----
  console.log("Seeding user role assignments...");

  await prisma.userRole.createMany({
    data: [
      {
        userId: USER_IDS.ADMIN,
        roleId: ROLE_IDS.SUPER_ADMIN,
        assignedBy: USER_IDS.ADMIN,
      },
      {
        userId: USER_IDS.PRODUCT_MANAGER,
        roleId: ROLE_IDS.PRODUCT_MANAGER,
        assignedBy: USER_IDS.ADMIN,
      },
      {
        userId: USER_IDS.ORDER_MANAGER,
        roleId: ROLE_IDS.ORDER_MANAGER,
        assignedBy: USER_IDS.ADMIN,
      },
    ],
    skipDuplicates: true,
  });

  console.log("  Assigned 3 user roles");
  console.log("Users seeded");
}
