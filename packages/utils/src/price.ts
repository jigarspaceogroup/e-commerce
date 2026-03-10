const VAT_RATE = 0.15;

export interface Discount {
  type: "percentage" | "fixed_amount";
  value: number;
  maxDiscount?: number;
}

export function calculateVAT(price: number): number {
  return Math.round(price * VAT_RATE * 100) / 100;
}

export function applyDiscount(price: number, discount: Discount): number {
  let discountAmount: number;

  if (discount.type === "percentage") {
    discountAmount = (price * discount.value) / 100;
    if (discount.maxDiscount !== undefined) {
      discountAmount = Math.min(discountAmount, discount.maxDiscount);
    }
  } else {
    discountAmount = discount.value;
  }

  return Math.max(0, Math.round((price - discountAmount) * 100) / 100);
}

export interface TotalInput {
  subtotal: number;
  shippingFee?: number;
  discount?: Discount;
}

export interface TotalResult {
  subtotal: number;
  discountedSubtotal: number;
  vat: number;
  shippingFee: number;
  total: number;
}

export function calculateTotal(input: TotalInput): TotalResult {
  const discountedSubtotal = input.discount
    ? applyDiscount(input.subtotal, input.discount)
    : input.subtotal;

  const vat = calculateVAT(discountedSubtotal);
  const shippingFee = input.shippingFee ?? 0;
  const total =
    Math.round((discountedSubtotal + vat + shippingFee) * 100) / 100;

  return {
    subtotal: input.subtotal,
    discountedSubtotal,
    vat,
    shippingFee,
    total,
  };
}
