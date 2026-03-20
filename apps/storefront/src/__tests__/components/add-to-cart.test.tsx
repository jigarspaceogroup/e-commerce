import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { ProductDetailView } from "@/app/[locale]/products/[slug]/product-detail-view";
import type { ProductDetail } from "@/types/product";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} />,
}));

// Mock useCart
const mockAddItem = vi.fn();
let mockIsAddingItem = false;

vi.mock("@/hooks/use-cart", () => ({
  useCart: () => ({
    addItem: mockAddItem,
    isAddingItem: mockIsAddingItem,
  }),
}));

// Mock useToast
const mockShowToast = vi.fn();
vi.mock("@/components/shared/toast", () => ({
  useToast: () => ({ showToast: mockShowToast, dismissToast: vi.fn() }),
  ToastProvider: ({ children }: any) => children,
}));

// Mock embla-carousel-react (used by ImageGallery)
vi.mock("embla-carousel-react", () => ({
  default: () => [vi.fn(), { scrollTo: vi.fn(), on: vi.fn(), off: vi.fn(), selectedScrollSnap: vi.fn().mockReturnValue(0), scrollSnapList: vi.fn().mockReturnValue([0]) }],
}));

const createMockProduct = (overrides?: Partial<ProductDetail>): ProductDetail => ({
  id: "prod-1",
  titleEn: "Test Phone",
  titleAr: "هاتف تجريبي",
  descriptionEn: "A great phone for testing.",
  descriptionAr: "هاتف رائع للاختبار.",
  basePrice: 2999,
  compareAtPrice: 3499,
  brand: "TestBrand",
  weight: 0.2,
  dimensions: null,
  slug: "test-phone",
  status: "published",
  categoryId: "cat-1",
  seoTitleEn: null,
  seoTitleAr: null,
  seoDescriptionEn: null,
  seoDescriptionAr: null,
  specifications: null,
  faq: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  category: {
    id: "cat-1",
    nameEn: "Phones",
    nameAr: "هواتف",
    slug: "phones",
    parent: null,
  },
  variants: [
    {
      id: "var-1",
      productId: "prod-1",
      sku: "TP-001",
      priceOverride: null,
      stockQuantity: 10,
      safetyStock: 2,
      lowStockThreshold: 3,
      backorderEnabled: false,
      weightOverride: null,
      attributes: { color: "Black" },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  images: [
    {
      id: "img-1",
      productId: "prod-1",
      variantId: null,
      url: "/test-phone.jpg",
      altTextEn: "Test Phone",
      altTextAr: "هاتف تجريبي",
      sortOrder: 0,
      createdAt: "2026-01-01T00:00:00Z",
    },
  ],
  ...overrides,
});

describe("ProductDetailView - Add to Cart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAddingItem = false;
    mockAddItem.mockResolvedValue(undefined);
  });

  it("renders Add to Cart button when in stock", () => {
    renderWithProviders(
      <ProductDetailView product={createMockProduct()} locale="en" />,
    );
    expect(screen.getByText("Add to Cart")).toBeInTheDocument();
  });

  it("calls addItem with correct variant and quantity on click", async () => {
    renderWithProviders(
      <ProductDetailView product={createMockProduct()} locale="en" />,
    );
    const addButton = screen.getByText("Add to Cart");
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledWith("var-1", 1);
    });
  });

  it("shows Adding... text when isAddingItem is true", () => {
    mockIsAddingItem = true;
    renderWithProviders(
      <ProductDetailView product={createMockProduct()} locale="en" />,
    );
    expect(screen.getByText("Adding...")).toBeInTheDocument();
    expect(screen.queryByText("Add to Cart")).not.toBeInTheDocument();
  });

  it("renders disabled Out of Stock button when variant has 0 stock", () => {
    const outOfStockProduct = createMockProduct({
      variants: [
        {
          id: "var-1",
          productId: "prod-1",
          sku: "TP-001",
          priceOverride: null,
          stockQuantity: 0,
          safetyStock: 0,
          lowStockThreshold: null,
          backorderEnabled: false,
          weightOverride: null,
          attributes: { color: "Black" },
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    });
    renderWithProviders(
      <ProductDetailView product={outOfStockProduct} locale="en" />,
    );
    const outOfStockButton = screen.getByText("Out of Stock");
    expect(outOfStockButton.closest("button")).toBeDisabled();
  });

  it("shows Notify When Available when out of stock", () => {
    const outOfStockProduct = createMockProduct({
      variants: [
        {
          id: "var-1",
          productId: "prod-1",
          sku: "TP-001",
          priceOverride: null,
          stockQuantity: 0,
          safetyStock: 0,
          lowStockThreshold: null,
          backorderEnabled: false,
          weightOverride: null,
          attributes: { color: "Black" },
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    });
    renderWithProviders(
      <ProductDetailView product={outOfStockProduct} locale="en" />,
    );
    expect(screen.getByText("Notify When Available")).toBeInTheDocument();
  });

  it("shows success toast after addItem resolves", async () => {
    mockAddItem.mockResolvedValue(undefined);
    renderWithProviders(
      <ProductDetailView product={createMockProduct()} locale="en" />,
    );
    const addButton = screen.getByText("Add to Cart");
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Test Phone added to cart",
          variant: "success",
        }),
      );
    });
  });

  it("shows error toast when addItem rejects", async () => {
    mockAddItem.mockRejectedValue(new Error("Network error"));
    renderWithProviders(
      <ProductDetailView product={createMockProduct()} locale="en" />,
    );
    const addButton = screen.getByText("Add to Cart");
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Failed to add to cart. Please try again.",
          variant: "error",
        }),
      );
    });
  });

  it("does not show quantity selector when out of stock", () => {
    const outOfStockProduct = createMockProduct({
      variants: [
        {
          id: "var-1",
          productId: "prod-1",
          sku: "TP-001",
          priceOverride: null,
          stockQuantity: 0,
          safetyStock: 0,
          lowStockThreshold: null,
          backorderEnabled: false,
          weightOverride: null,
          attributes: { color: "Black" },
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    });
    renderWithProviders(
      <ProductDetailView product={outOfStockProduct} locale="en" />,
    );
    expect(screen.queryByLabelText("Decrease quantity")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Increase quantity")).not.toBeInTheDocument();
  });
});
