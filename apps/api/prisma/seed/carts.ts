import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { USER_IDS } from "./users.js";
import { getVariantId } from "./products.js";

// ---------------------------------------------------------------------------
// Deterministic UUIDs
// ---------------------------------------------------------------------------
const CART_IDS = {
  BUYER_3: "04000000-0000-4000-8000-000000000001",
  BUYER_5: "04000000-0000-4000-8000-000000000002",
} as const;

// ---------------------------------------------------------------------------
// Cart data
// ---------------------------------------------------------------------------
interface CartItemSeed {
  productVariantIdx: [number, number]; // [productIdx, variantIdx]
  quantity: number;
  unitPriceAtAddition: number;
}

interface CartSeed {
  id: string;
  userId: string;
  items: CartItemSeed[];
}

const CARTS: CartSeed[] = [
  {
    id: CART_IDS.BUYER_3,
    userId: USER_IDS.BUYER_3,
    items: [
      { productVariantIdx: [4, 0], quantity: 1, unitPriceAtAddition: 5299 },   // iPhone 16 Pro Max - 256GB Natural Titanium
      { productVariantIdx: [25, 0], quantity: 1, unitPriceAtAddition: 349 },    // Travel Laptop Backpack - Black
      { productVariantIdx: [39, 1], quantity: 2, unitPriceAtAddition: 99 },     // Wireless Charging Pad - White
    ],
  },
  {
    id: CART_IDS.BUYER_5,
    userId: USER_IDS.BUYER_5,
    items: [
      { productVariantIdx: [27, 0], quantity: 1, unitPriceAtAddition: 1200 },   // Marble Coffee Table - White Marble
      { productVariantIdx: [37, 0], quantity: 1, unitPriceAtAddition: 450 },     // Rattan Floor Lamp - Natural
      { productVariantIdx: [35, 0], quantity: 2, unitPriceAtAddition: 280 },     // Geometric Metal Wall Art - Gold
      { productVariantIdx: [42, 1], quantity: 1, unitPriceAtAddition: 199 },     // Smart LED Strip Lights - 10 meters
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------
export async function seedCarts(prisma: PrismaClient): Promise<void> {
  console.log("Seeding carts...");

  for (const cart of CARTS) {
    // Calculate totals
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.unitPriceAtAddition * item.quantity,
      0,
    );
    const taxAmount = Math.round(subtotal * 0.15 * 100) / 100;
    const shippingEstimate = subtotal >= 500 ? 0 : 25;
    const grandTotal = subtotal + taxAmount + shippingEstimate;

    // Upsert cart — userId is @unique so we can upsert on it
    await prisma.cart.upsert({
      where: { userId: cart.userId },
      update: {
        subtotal,
        taxAmount,
        shippingEstimate,
        grandTotal,
      },
      create: {
        id: cart.id,
        userId: cart.userId,
        subtotal,
        taxAmount,
        shippingEstimate,
        grandTotal,
      },
    });

    // Create cart items
    const cartItemData = cart.items.map((item) => ({
      cartId: cart.id,
      productVariantId: getVariantId(item.productVariantIdx[0], item.productVariantIdx[1]),
      quantity: item.quantity,
      unitPriceAtAddition: item.unitPriceAtAddition,
    }));

    await prisma.cartItem.createMany({
      data: cartItemData,
      skipDuplicates: true,
    });
  }

  console.log(`  Created ${CARTS.length} carts with ${CARTS.reduce((s, c) => s + c.items.length, 0)} items`);
  console.log("Carts seeded");
}
