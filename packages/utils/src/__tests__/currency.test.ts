import { describe, it, expect } from "vitest";
import { formatCurrency } from "../currency";

describe("formatCurrency", () => {
  it("formats price in SAR with EN locale", () => {
    expect(formatCurrency(100, "en")).toBe("SAR 100.00");
  });

  it("formats price in SAR with AR locale", () => {
    const result = formatCurrency(100, "ar");
    expect(result).toContain("١٠٠");
    expect(result).toContain("ر.س");
  });

  it("formats decimal amounts correctly", () => {
    expect(formatCurrency(49.99, "en")).toBe("SAR 49.99");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0, "en")).toBe("SAR 0.00");
  });

  it("formats large numbers with grouping", () => {
    const result = formatCurrency(1000000, "en");
    expect(result).toBe("SAR 1,000,000.00");
  });

  it("defaults to EN locale when not specified", () => {
    expect(formatCurrency(50)).toBe("SAR 50.00");
  });
});
