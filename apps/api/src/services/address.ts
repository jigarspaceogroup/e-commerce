import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../middleware/error-handler.js";

// ─── Validation Schemas ────────────────────────────────────────────────────────

export const createAddressSchema = z.object({
  label: z.string().optional(),
  recipientName: z.string().min(1).max(100),
  streetLine1: z.string().min(1).max(200),
  streetLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  region: z.string().min(1).max(100),
  postalCode: z.string().regex(/^\d{5}$/, "Postal code must be 5 digits"),
  country: z.string().default("SA"),
  phone: z.string().regex(/^(\+966|0)[0-9]{9}$/, "Invalid Saudi phone number"),
  deliveryInstructions: z.string().max(500).optional(),
});

export const updateAddressSchema = createAddressSchema.partial();

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

const MAX_ADDRESSES = 10;

// ─── List Addresses ────────────────────────────────────────────────────────────

export async function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

// ─── Get Address ───────────────────────────────────────────────────────────────

export async function getAddress(userId: string, addressId: string) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!address) throw notFound("Address not found");
  return address;
}

// ─── Create Address ────────────────────────────────────────────────────────────

export async function createAddress(userId: string, data: CreateAddressInput) {
  const count = await prisma.address.count({ where: { userId } });
  if (count >= MAX_ADDRESSES) {
    throw badRequest("Maximum of 10 addresses allowed");
  }

  const isFirst = count === 0;

  return prisma.address.create({
    data: {
      userId,
      label: data.label,
      recipientName: data.recipientName,
      streetLine1: data.streetLine1,
      streetLine2: data.streetLine2,
      city: data.city,
      region: data.region,
      postalCode: data.postalCode,
      country: data.country,
      phone: data.phone,
      deliveryInstructions: data.deliveryInstructions,
      isDefault: isFirst,
    },
  });
}

// ─── Update Address ────────────────────────────────────────────────────────────

export async function updateAddress(
  userId: string,
  addressId: string,
  data: UpdateAddressInput,
) {
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!existing) throw notFound("Address not found");

  return prisma.address.update({
    where: { id: addressId },
    data: {
      ...(data.label !== undefined ? { label: data.label } : {}),
      ...(data.recipientName !== undefined ? { recipientName: data.recipientName } : {}),
      ...(data.streetLine1 !== undefined ? { streetLine1: data.streetLine1 } : {}),
      ...(data.streetLine2 !== undefined ? { streetLine2: data.streetLine2 } : {}),
      ...(data.city !== undefined ? { city: data.city } : {}),
      ...(data.region !== undefined ? { region: data.region } : {}),
      ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
      ...(data.country !== undefined ? { country: data.country } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.deliveryInstructions !== undefined
        ? { deliveryInstructions: data.deliveryInstructions }
        : {}),
    },
  });
}

// ─── Delete Address ────────────────────────────────────────────────────────────

export async function deleteAddress(userId: string, addressId: string) {
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!existing) throw notFound("Address not found");

  await prisma.address.delete({ where: { id: addressId } });

  // If deleted address was default, reassign default to most recent remaining
  if (existing.isDefault) {
    const mostRecent = await prisma.address.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    if (mostRecent) {
      await prisma.address.update({
        where: { id: mostRecent.id },
        data: { isDefault: true },
      });
    }
  }

  return existing;
}

// ─── Set Default ───────────────────────────────────────────────────────────────

export async function setDefault(userId: string, addressId: string) {
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!existing) throw notFound("Address not found");

  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    }),
    prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    }),
  ]);

  return prisma.address.findFirst({ where: { id: addressId, userId } });
}
