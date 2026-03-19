import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { VariantSelector } from "@/components/product/variant-selector";
import type { ProductDetailVariant } from "@/types/product";

const mockVariants: ProductDetailVariant[] = [
  {
    id: "v1", productId: "p1", sku: "SKU-001", priceOverride: null,
    stockQuantity: 10, safetyStock: 2, lowStockThreshold: 5, backorderEnabled: false,
    weightOverride: null, attributes: { color: "Red", size: "M" }, createdAt: "", updatedAt: "",
  },
  {
    id: "v2", productId: "p1", sku: "SKU-002", priceOverride: 120,
    stockQuantity: 2, safetyStock: 1, lowStockThreshold: 5, backorderEnabled: false,
    weightOverride: null, attributes: { color: "Blue", size: "M" }, createdAt: "", updatedAt: "",
  },
  {
    id: "v3", productId: "p1", sku: "SKU-003", priceOverride: null,
    stockQuantity: 0, safetyStock: 0, lowStockThreshold: null, backorderEnabled: false,
    weightOverride: null, attributes: { color: "Red", size: "L" }, createdAt: "", updatedAt: "",
  },
];

describe("VariantSelector", () => {
  it("renders attribute groups", () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <VariantSelector variants={mockVariants} basePrice={100} selectedVariantId="v1" onSelect={onSelect} locale="en" />
    );
    expect(screen.getByText(/color/i)).toBeInTheDocument();
    expect(screen.getByText(/size/i)).toBeInTheDocument();
  });

  it("calls onSelect when a variant is clicked", () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <VariantSelector variants={mockVariants} basePrice={100} selectedVariantId="v1" onSelect={onSelect} locale="en" />
    );
    const blueButton = screen.getByRole("button", { name: "Blue" });
    fireEvent.click(blueButton);
    expect(onSelect).toHaveBeenCalled();
  });

  it("shows In Stock for variant with sufficient stock", () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <VariantSelector variants={mockVariants} basePrice={100} selectedVariantId="v1" onSelect={onSelect} locale="en" />
    );
    expect(screen.getByText("In Stock")).toBeInTheDocument();
  });

  it("shows low stock warning for low-stock variant", () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <VariantSelector variants={mockVariants} basePrice={100} selectedVariantId="v2" onSelect={onSelect} locale="en" />
    );
    expect(screen.getByText(/Only 2 left/)).toBeInTheDocument();
  });

  it("displays SKU for selected variant", () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <VariantSelector variants={mockVariants} basePrice={100} selectedVariantId="v1" onSelect={onSelect} locale="en" />
    );
    expect(screen.getByText(/SKU-001/)).toBeInTheDocument();
  });
});
