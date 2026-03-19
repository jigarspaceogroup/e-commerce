import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { ProductCard } from "@/components/product/product-card";
import type { ProductListItem } from "@/types/product";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} />,
}));

const mockProduct: ProductListItem = {
  id: "1",
  titleEn: "Test Product",
  titleAr: "منتج تجريبي",
  slug: "test-product",
  basePrice: 150,
  compareAtPrice: 200,
  brand: "Test Brand",
  status: "published",
  category: { id: "c1", nameEn: "Electronics", nameAr: "إلكترونيات", slug: "electronics" },
  variants: [
    { id: "v1", priceOverride: null, stockQuantity: 5, attributes: { color: "red" } },
  ],
  images: [
    { id: "img1", url: "http://localhost:4000/uploads/test.jpg", altTextEn: "Test image", altTextAr: "صورة تجريبية", sortOrder: 0 },
  ],
};

describe("ProductCard", () => {
  it("renders product title in English when locale is en", () => {
    renderWithProviders(<ProductCard product={mockProduct} locale="en" />);
    expect(screen.getByText("Test Product")).toBeInTheDocument();
  });

  it("renders product title in Arabic when locale is ar", () => {
    renderWithProviders(<ProductCard product={mockProduct} locale="ar" />, { locale: "ar" });
    expect(screen.getByText("منتج تجريبي")).toBeInTheDocument();
  });

  it("shows Out of Stock badge when all variants have 0 stock", () => {
    const outOfStockProduct = {
      ...mockProduct,
      variants: [{ id: "v1", priceOverride: null, stockQuantity: 0, attributes: {} }],
    };
    renderWithProviders(<ProductCard product={outOfStockProduct} locale="en" />);
    expect(screen.getByText("Out of Stock")).toBeInTheDocument();
  });

  it("links to product slug", () => {
    renderWithProviders(<ProductCard product={mockProduct} locale="en" />);
    const link = screen.getByTestId("product-card");
    expect(link).toHaveAttribute("href", "/products/test-product");
  });

  it("renders category name", () => {
    renderWithProviders(<ProductCard product={mockProduct} locale="en" />);
    expect(screen.getByText("Electronics")).toBeInTheDocument();
  });
});
