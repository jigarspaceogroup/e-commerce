import { describe, it, expect } from "vitest";
import { calculateVAT, applyDiscount, calculateTotal } from "../price";

describe("calculateVAT", () => {
  it("calculates 15% VAT on a price", () => {
    expect(calculateVAT(100)).toBe(15);
  });

  it("rounds to 2 decimal places", () => {
    expect(calculateVAT(33.33)).toBe(5);
  });

  it("returns 0 for zero price", () => {
    expect(calculateVAT(0)).toBe(0);
  });
});

describe("applyDiscount", () => {
  it("applies percentage discount", () => {
    expect(applyDiscount(100, { type: "percentage", value: 10 })).toBe(90);
  });

  it("applies fixed amount discount", () => {
    expect(applyDiscount(100, { type: "fixed_amount", value: 25 })).toBe(75);
  });

  it("does not allow price to go below zero", () => {
    expect(applyDiscount(10, { type: "fixed_amount", value: 25 })).toBe(0);
  });

  it("caps percentage discount with maximum", () => {
    expect(
      applyDiscount(1000, { type: "percentage", value: 50, maxDiscount: 100 }),
    ).toBe(900);
  });

  it("returns original price for zero discount", () => {
    expect(applyDiscount(100, { type: "percentage", value: 0 })).toBe(100);
  });
});

describe("calculateTotal", () => {
  it("calculates subtotal + VAT", () => {
    const result = calculateTotal({ subtotal: 100 });
    expect(result.vat).toBe(15);
    expect(result.total).toBe(115);
  });

  it("includes shipping fee", () => {
    const result = calculateTotal({ subtotal: 100, shippingFee: 20 });
    expect(result.total).toBe(135);
  });

  it("applies discount before VAT", () => {
    const result = calculateTotal({
      subtotal: 100,
      discount: { type: "percentage", value: 10 },
    });
    expect(result.discountedSubtotal).toBe(90);
    expect(result.vat).toBe(13.5);
    expect(result.total).toBe(103.5);
  });
});
