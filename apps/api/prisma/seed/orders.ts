import type { PrismaClient } from "../../src/generated/prisma/client.js";
import {
  OrderStatus,
  OrderItemStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../src/generated/prisma/client.js";
import { USER_IDS } from "./users.js";
import { getVariantId } from "./products.js";

// ---------------------------------------------------------------------------
// Deterministic UUIDs
// ---------------------------------------------------------------------------
function orderId(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `01000000-0000-4000-8000-${hex}`;
}

function orderItemId(orderIdx: number, itemIdx: number): string {
  const combined = orderIdx * 100 + itemIdx;
  const hex = combined.toString(16).padStart(12, "0");
  return `02000000-0000-4000-8000-${hex}`;
}

function paymentId(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `03000000-0000-4000-8000-${hex}`;
}

// Exported for reviews module (reviews need an orderId)
export { orderId };

// ---------------------------------------------------------------------------
// Shared address snapshots
// ---------------------------------------------------------------------------
const RIYADH_ADDRESS = {
  recipientName: "Ahmed Al-Rashid",
  streetLine1: "123 King Fahd Road",
  streetLine2: "Apt 4B",
  city: "Riyadh",
  region: "Riyadh",
  postalCode: "12345",
  country: "SA",
  phone: "+966500000001",
};

const JEDDAH_ADDRESS = {
  recipientName: "Fatimah Al-Saud",
  streetLine1: "789 Prince Sultan Road",
  city: "Jeddah",
  region: "Makkah",
  postalCode: "21442",
  country: "SA",
  phone: "+966500000002",
};

const ENGLISH_ADDRESS = {
  recipientName: "Sarah Johnson",
  streetLine1: "15 Al Khobar Corniche",
  city: "Khobar",
  region: "Eastern Province",
  postalCode: "31952",
  country: "SA",
  phone: "+966500000004",
};

// ---------------------------------------------------------------------------
// Order data
// ---------------------------------------------------------------------------
interface OrderItemSeed {
  productVariantIdx: [number, number]; // [productIdx, variantIdx]
  sku: string;
  titleSnapshot: string;
  unitPrice: number;
  quantity: number;
}

interface OrderSeed {
  idx: number;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  shippingAddress: Record<string, string>;
  items: OrderItemSeed[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  trackingNumber: string | null;
  notes: string | null;
}

const ORDERS: OrderSeed[] = [
  // ---- DELIVERED orders ----
  {
    idx: 1,
    userId: USER_IDS.BUYER_1,
    orderNumber: "ORD-2026-000001",
    status: OrderStatus.delivered,
    shippingAddress: RIYADH_ADDRESS,
    items: [
      { productVariantIdx: [1, 0], sku: "SGS25U-256-BLK", titleSnapshot: "Samsung Galaxy S25 Ultra - 256GB Black", unitPrice: 4999, quantity: 1 },
      { productVariantIdx: [11, 0], sku: "APP3-WHT", titleSnapshot: "AirPods Pro 3 - White", unitPrice: 999, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.credit_card,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: "SA123456789",
    notes: null,
  },
  {
    idx: 2,
    userId: USER_IDS.BUYER_1,
    orderNumber: "ORD-2026-000002",
    status: OrderStatus.delivered,
    shippingAddress: RIYADH_ADDRESS,
    items: [
      { productVariantIdx: [14, 1], sku: "THB-WHT-M", titleSnapshot: "Premium White Thobe - M", unitPrice: 450, quantity: 2 },
      { productVariantIdx: [22, 0], sku: "GSHK-GA2100-BLK", titleSnapshot: "Casio G-Shock GA-2100 - All Black", unitPrice: 449, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.mada,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: "SA234567890",
    notes: null,
  },
  {
    idx: 3,
    userId: USER_IDS.BUYER_2,
    orderNumber: "ORD-2026-000003",
    status: OrderStatus.delivered,
    shippingAddress: JEDDAH_ADDRESS,
    items: [
      { productVariantIdx: [18, 1], sku: "ABY-BLK-M", titleSnapshot: "Embroidered Black Abaya - M", unitPrice: 750, quantity: 1 },
      { productVariantIdx: [24, 1], sku: "XBAG-BLK", titleSnapshot: "Leather Crossbody Bag - Black", unitPrice: 599, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.apple_pay,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: "SA345678901",
    notes: null,
  },
  {
    idx: 4,
    userId: USER_IDS.BUYER_4,
    orderNumber: "ORD-2026-000004",
    status: OrderStatus.delivered,
    shippingAddress: ENGLISH_ADDRESS,
    items: [
      { productVariantIdx: [5, 0], sku: "IP16-128-BLK", titleSnapshot: "iPhone 16 - 128GB Black", unitPrice: 3499, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.credit_card,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: "SA456789012",
    notes: null,
  },
  {
    idx: 5,
    userId: USER_IDS.BUYER_5,
    orderNumber: "ORD-2026-000005",
    status: OrderStatus.delivered,
    shippingAddress: ENGLISH_ADDRESS,
    items: [
      { productVariantIdx: [32, 0], sku: "BRV-BE-SLV", titleSnapshot: "Breville Barista Express - Brushed Silver", unitPrice: 2499, quantity: 1 },
      { productVariantIdx: [33, 0], sku: "NSP-VN-BLK", titleSnapshot: "Nespresso Vertuo Next - Matte Black", unitPrice: 699, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.tabby,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: "SA567890123",
    notes: null,
  },

  // ---- SHIPPED orders ----
  {
    idx: 6,
    userId: USER_IDS.BUYER_1,
    orderNumber: "ORD-2026-000006",
    status: OrderStatus.shipped,
    shippingAddress: RIYADH_ADDRESS,
    items: [
      { productVariantIdx: [9, 0], sku: "MBP16-M4P-18-512", titleSnapshot: "MacBook Pro 16\" M4 Pro - 18GB 512GB Space Black", unitPrice: 9999, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.tamara,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: "SA678901234",
    notes: null,
  },
  {
    idx: 7,
    userId: USER_IDS.BUYER_2,
    orderNumber: "ORD-2026-000007",
    status: OrderStatus.shipped,
    shippingAddress: JEDDAH_ADDRESS,
    items: [
      { productVariantIdx: [20, 1], sku: "MAXI-FLR-M", titleSnapshot: "Floral Print Maxi Dress - M Floral Blue", unitPrice: 399, quantity: 1 },
      { productVariantIdx: [21, 0], sku: "BLOUSE-WHT-S", titleSnapshot: "Linen Relaxed Blouse - S White", unitPrice: 249, quantity: 2 },
      { productVariantIdx: [34, 1], sku: "CANVAS-ARABIC-LG", titleSnapshot: "Arabic Calligraphy Canvas Set - 90x60 cm", unitPrice: 550, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.mada,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: "SA789012345",
    notes: "Please deliver in the afternoon",
  },
  {
    idx: 8,
    userId: USER_IDS.BUYER_4,
    orderNumber: "ORD-2026-000008",
    status: OrderStatus.shipped,
    shippingAddress: ENGLISH_ADDRESS,
    items: [
      { productVariantIdx: [36, 0], sku: "TLAMP-MIN-WHT", titleSnapshot: "Minimalist Table Lamp - White/Oak", unitPrice: 199, quantity: 2 },
      { productVariantIdx: [45, 0], sku: "PILLOW-4P-GRY", titleSnapshot: "Throw Pillow Set (4 Pack) - Grey/White", unitPrice: 179, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.credit_card,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: "SA890123456",
    notes: null,
  },

  // ---- PROCESSING orders ----
  {
    idx: 9,
    userId: USER_IDS.BUYER_3,
    orderNumber: "ORD-2026-000009",
    status: OrderStatus.processing,
    shippingAddress: RIYADH_ADDRESS,
    items: [
      { productVariantIdx: [10, 0], sku: "SONY-XM6-BLK", titleSnapshot: "Sony WH-1000XM6 - Black", unitPrice: 1499, quantity: 1 },
      { productVariantIdx: [12, 0], sku: "JBL-CH6-BLK", titleSnapshot: "JBL Charge 6 - Black", unitPrice: 599, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.stc_pay,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: null,
    notes: null,
  },
  {
    idx: 10,
    userId: USER_IDS.BUYER_5,
    orderNumber: "ORD-2026-000010",
    status: OrderStatus.processing,
    shippingAddress: ENGLISH_ADDRESS,
    items: [
      { productVariantIdx: [8, 0], sku: "TP-X1C12-16-512", titleSnapshot: "Lenovo ThinkPad X1 Carbon Gen 12 - 16GB 512GB", unitPrice: 6499, quantity: 1 },
      { productVariantIdx: [50, 0], sku: "BTKB-SLV", titleSnapshot: "Portable Bluetooth Keyboard - Silver", unitPrice: 179, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.credit_card,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: null,
    notes: null,
  },
  {
    idx: 11,
    userId: USER_IDS.BUYER_1,
    orderNumber: "ORD-2026-000011",
    status: OrderStatus.processing,
    shippingAddress: RIYADH_ADDRESS,
    items: [
      { productVariantIdx: [26, 0], sku: "SOFA-L-GRY", titleSnapshot: "L-Shaped Sectional Sofa - Grey", unitPrice: 4500, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.tamara,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: null,
    notes: "Please call before delivery",
  },

  // ---- PENDING_PAYMENT orders ----
  {
    idx: 12,
    userId: USER_IDS.BUYER_3,
    orderNumber: "ORD-2026-000012",
    status: OrderStatus.pending_payment,
    shippingAddress: RIYADH_ADDRESS,
    items: [
      { productVariantIdx: [6, 0], sku: "ROG-G16-16-512", titleSnapshot: "ASUS ROG Strix G16 - 16GB 512GB", unitPrice: 4999, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.credit_card,
    paymentStatus: PaymentStatus.pending,
    trackingNumber: null,
    notes: null,
  },
  {
    idx: 13,
    userId: USER_IDS.BUYER_2,
    orderNumber: "ORD-2026-000013",
    status: OrderStatus.pending_payment,
    shippingAddress: JEDDAH_ADDRESS,
    items: [
      { productVariantIdx: [28, 0], sku: "BED-KNG-GRY", titleSnapshot: "King Size Platform Bed - Grey", unitPrice: 3200, quantity: 1 },
      { productVariantIdx: [41, 0], sku: "SHEET-K-WHT", titleSnapshot: "Cotton Bed Sheet Set - King White", unitPrice: 599, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.tabby,
    paymentStatus: PaymentStatus.pending,
    trackingNumber: null,
    notes: null,
  },

  // ---- CANCELLED orders ----
  {
    idx: 14,
    userId: USER_IDS.BUYER_4,
    orderNumber: "ORD-2026-000014",
    status: OrderStatus.cancelled,
    shippingAddress: ENGLISH_ADDRESS,
    items: [
      { productVariantIdx: [23, 0], sku: "TISSOT-PRX-SLV", titleSnapshot: "Tissot PRX Powermatic 80 - Silver Dial", unitPrice: 2799, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.credit_card,
    paymentStatus: PaymentStatus.voided,
    trackingNumber: null,
    notes: "Customer requested cancellation",
  },
  {
    idx: 15,
    userId: USER_IDS.BUYER_1,
    orderNumber: "ORD-2026-000015",
    status: OrderStatus.cancelled,
    shippingAddress: RIYADH_ADDRESS,
    items: [
      { productVariantIdx: [7, 0], sku: "MSI-K15-16-512", titleSnapshot: "MSI Katana 15 - 16GB 512GB", unitPrice: 3299, quantity: 1 },
      { productVariantIdx: [39, 0], sku: "WCHG-BLK", titleSnapshot: "Wireless Charging Pad - Black", unitPrice: 99, quantity: 2 },
    ],
    paymentMethod: PaymentMethod.mada,
    paymentStatus: PaymentStatus.voided,
    trackingNumber: null,
    notes: "Changed mind",
  },

  // ---- REFUNDED orders ----
  {
    idx: 16,
    userId: USER_IDS.BUYER_5,
    orderNumber: "ORD-2026-000016",
    status: OrderStatus.refunded,
    shippingAddress: ENGLISH_ADDRESS,
    items: [
      { productVariantIdx: [30, 0], sku: "VMX-E520-BLK", titleSnapshot: "Vitamix E520 Professional Blender - Black", unitPrice: 1899, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.credit_card,
    paymentStatus: PaymentStatus.refunded,
    trackingNumber: "SA111222333",
    notes: "Product was defective",
  },
  {
    idx: 17,
    userId: USER_IDS.BUYER_2,
    orderNumber: "ORD-2026-000017",
    status: OrderStatus.refunded,
    shippingAddress: JEDDAH_ADDRESS,
    items: [
      { productVariantIdx: [19, 0], sku: "OABY-BEG-S", titleSnapshot: "Modern Open Abaya - S Beige", unitPrice: 550, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.apple_pay,
    paymentStatus: PaymentStatus.refunded,
    trackingNumber: "SA222333444",
    notes: "Size did not fit",
  },

  // ---- More DELIVERED orders for review variety ----
  {
    idx: 18,
    userId: USER_IDS.BUYER_3,
    orderNumber: "ORD-2026-000018",
    status: OrderStatus.delivered,
    shippingAddress: RIYADH_ADDRESS,
    items: [
      { productVariantIdx: [16, 0], sku: "POLO-NVY-S", titleSnapshot: "Slim Fit Cotton Polo - S Navy", unitPrice: 189, quantity: 3 },
      { productVariantIdx: [17, 1], sku: "CHINO-KHK-32", titleSnapshot: "Stretch Chino Pants - 32 Khaki", unitPrice: 229, quantity: 2 },
    ],
    paymentMethod: PaymentMethod.mada,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: "SA333444555",
    notes: null,
  },
  {
    idx: 19,
    userId: USER_IDS.BUYER_4,
    orderNumber: "ORD-2026-000019",
    status: OrderStatus.delivered,
    shippingAddress: ENGLISH_ADDRESS,
    items: [
      { productVariantIdx: [13, 0], sku: "SONOS-E300-BLK", titleSnapshot: "Sonos Era 300 - Black", unitPrice: 1799, quantity: 1 },
      { productVariantIdx: [42, 0], sku: "LED-STRIP-5M", titleSnapshot: "Smart LED Strip Lights - 5 meters", unitPrice: 129, quantity: 2 },
    ],
    paymentMethod: PaymentMethod.credit_card,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: "SA444555666",
    notes: null,
  },
  {
    idx: 20,
    userId: USER_IDS.BUYER_5,
    orderNumber: "ORD-2026-000020",
    status: OrderStatus.delivered,
    shippingAddress: ENGLISH_ADDRESS,
    items: [
      { productVariantIdx: [44, 0], sku: "AIRFRY-6L-BLK", titleSnapshot: "Air Fryer 6L Digital - Black", unitPrice: 399, quantity: 1 },
      { productVariantIdx: [43, 0], sku: "KNIFE-SET-8PC", titleSnapshot: "Stainless Steel Knife Set - 8-piece", unitPrice: 499, quantity: 1 },
      { productVariantIdx: [31, 0], sku: "NINJA-PB-GRY", titleSnapshot: "Ninja Personal Blender - Grey", unitPrice: 299, quantity: 1 },
    ],
    paymentMethod: PaymentMethod.paypal,
    paymentStatus: PaymentStatus.captured,
    trackingNumber: "SA555666777",
    notes: null,
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------
export async function seedOrders(prisma: PrismaClient): Promise<void> {
  console.log("Seeding orders...");

  for (const o of ORDERS) {
    const oId = orderId(o.idx);

    // Calculate totals
    const subtotal = o.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const taxAmount = Math.round(subtotal * 0.15 * 100) / 100; // 15% VAT
    const shippingFee = subtotal >= 500 ? 0 : 25;
    const grandTotal = subtotal + taxAmount + shippingFee;

    // Upsert order
    await prisma.order.upsert({
      where: { orderNumber: o.orderNumber },
      update: { status: o.status },
      create: {
        id: oId,
        orderNumber: o.orderNumber,
        userId: o.userId,
        status: o.status,
        subtotal,
        discountAmount: 0,
        taxAmount,
        shippingFee,
        grandTotal,
        currency: "SAR",
        shippingAddress: o.shippingAddress,
        billingAddress: o.shippingAddress,
        trackingNumber: o.trackingNumber,
        notes: o.notes,
        estimatedDeliveryDate: o.status === OrderStatus.shipped
          ? new Date("2026-03-15")
          : undefined,
      },
    });

    // Create order items
    const orderItemData = o.items.map((item, ii) => {
      const lineTotal = item.unitPrice * item.quantity;
      const itemStatus =
        o.status === OrderStatus.cancelled
          ? OrderItemStatus.cancelled
          : o.status === OrderStatus.refunded
            ? OrderItemStatus.returned
            : OrderItemStatus.fulfilled;

      return {
        id: orderItemId(o.idx, ii),
        orderId: oId,
        productVariantId: getVariantId(item.productVariantIdx[0], item.productVariantIdx[1]),
        productTitleSnapshot: item.titleSnapshot,
        variantAttributesSnapshot: null,
        skuSnapshot: item.sku,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountAmount: 0,
        lineTotal,
        status: itemStatus,
      };
    });

    await prisma.orderItem.createMany({
      data: orderItemData,
      skipDuplicates: true,
    });

    // Create payment record
    const pId = paymentId(o.idx);

    await prisma.payment.upsert({
      where: { idempotencyKey: `seed-pay-${o.orderNumber}` },
      update: { status: o.paymentStatus },
      create: {
        id: pId,
        orderId: oId,
        paymentMethod: o.paymentMethod,
        gatewayTransactionId: o.paymentStatus !== PaymentStatus.pending
          ? `gw-txn-${o.orderNumber}`
          : null,
        amount: grandTotal,
        currency: "SAR",
        status: o.paymentStatus,
        idempotencyKey: `seed-pay-${o.orderNumber}`,
      },
    });
  }

  console.log(`  Created ${ORDERS.length} orders with items and payments`);
  console.log("Orders seeded");
}
