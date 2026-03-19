import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { PriceDisplay } from "@/components/shared/price-display";

describe("PriceDisplay", () => {
  it("renders base price formatted as SAR", () => {
    renderWithProviders(<PriceDisplay basePrice={100} locale="en" />);
    const priceEl = screen.getByTestId("price-display");
    expect(priceEl.textContent).toContain("100");
    expect(priceEl.textContent).toContain("SAR");
  });

  it("shows discount when compareAtPrice exists", () => {
    renderWithProviders(<PriceDisplay basePrice={80} compareAtPrice={100} locale="en" />);
    const priceEl = screen.getByTestId("price-display");
    // Should show 20% OFF
    expect(priceEl.textContent).toContain("20");
    expect(priceEl.textContent).toContain("OFF");
  });

  it("shows struck-through compare-at price", () => {
    renderWithProviders(<PriceDisplay basePrice={80} compareAtPrice={100} locale="en" />);
    const lineThrough = screen.getByTestId("price-display").querySelector(".line-through");
    expect(lineThrough).not.toBeNull();
    expect(lineThrough!.textContent).toContain("100");
  });

  it("does not show discount when no compareAtPrice", () => {
    renderWithProviders(<PriceDisplay basePrice={80} locale="en" />);
    const priceEl = screen.getByTestId("price-display");
    expect(priceEl.textContent).not.toContain("OFF");
    expect(priceEl.querySelector(".line-through")).toBeNull();
  });
});
