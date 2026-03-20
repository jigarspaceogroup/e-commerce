import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { SearchResultsClient } from "@/app/[locale]/search/search-results-client";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("q=Samsung"),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} />,
}));

// Mock fetchSearchResults
vi.mock("@/lib/api/search", () => ({
  fetchSearchResults: vi.fn(),
}));

// Mock query keys
vi.mock("@/lib/query-keys", () => ({
  queryKeys: {
    search: {
      results: (filters: any) => ["search", "results", filters],
      suggestions: (q: string) => ["search", "suggestions", q],
    },
  },
}));

// Track useQuery calls
let mockQueryReturn: any = {
  data: null,
  isLoading: false,
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => mockQueryReturn,
}));

// Mock SearchFilters and ActiveFilters to simplify
vi.mock("@/components/search/search-filters", () => ({
  SearchFilters: () => <div data-testid="search-filters" />,
}));

vi.mock("@/components/search/active-filters", () => ({
  ActiveFilters: () => <div data-testid="active-filters" />,
}));

// Mock ProductCard
vi.mock("@/components/product/product-card", () => ({
  ProductCard: ({ product }: any) => (
    <div data-testid="product-card">{product.titleEn}</div>
  ),
}));

const mockProducts = [
  {
    id: "p1",
    titleEn: "Samsung Galaxy S24",
    titleAr: "سامسونج جالكسي S24",
    slug: "samsung-galaxy-s24",
    basePrice: 3499,
    compareAtPrice: null,
    brand: "Samsung",
    status: "published",
    category: { id: "c1", nameEn: "Phones", nameAr: "هواتف", slug: "phones" },
    variants: [{ id: "v1", priceOverride: null, stockQuantity: 10, attributes: {} }],
    images: [{ id: "img1", url: "/test.jpg", altTextEn: "Samsung", altTextAr: "سامسونج", sortOrder: 0 }],
  },
  {
    id: "p2",
    titleEn: "Samsung Galaxy Tab",
    titleAr: "سامسونج تاب",
    slug: "samsung-galaxy-tab",
    basePrice: 2199,
    compareAtPrice: null,
    brand: "Samsung",
    status: "published",
    category: { id: "c2", nameEn: "Tablets", nameAr: "أجهزة لوحية", slug: "tablets" },
    variants: [{ id: "v2", priceOverride: null, stockQuantity: 5, attributes: {} }],
    images: [{ id: "img2", url: "/test2.jpg", altTextEn: "Tab", altTextAr: "تاب", sortOrder: 0 }],
  },
];

describe("SearchResultsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryReturn = {
      data: null,
      isLoading: false,
    };
  });

  it("renders heading with query and result count", () => {
    mockQueryReturn = {
      data: {
        data: mockProducts,
        meta: { total: 2, facets: { brands: [], categories: [], priceRange: { min: 0, max: 5000 } } },
      },
      isLoading: false,
    };
    renderWithProviders(<SearchResultsClient initialQuery="Samsung" />);
    expect(screen.getByText(/Results for "Samsung"/)).toBeInTheDocument();
    expect(screen.getByText("2 results found")).toBeInTheDocument();
  });

  it("renders product grid items", () => {
    mockQueryReturn = {
      data: {
        data: mockProducts,
        meta: { total: 2, facets: { brands: [], categories: [], priceRange: { min: 0, max: 5000 } } },
      },
      isLoading: false,
    };
    renderWithProviders(<SearchResultsClient initialQuery="Samsung" />);
    const cards = screen.getAllByTestId("product-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("Samsung Galaxy S24")).toBeInTheDocument();
    expect(screen.getByText("Samsung Galaxy Tab")).toBeInTheDocument();
  });

  it("renders empty state with no results message", () => {
    mockQueryReturn = {
      data: {
        data: [],
        meta: { total: 0, facets: { brands: [], categories: [], priceRange: { min: 0, max: 1000 } } },
      },
      isLoading: false,
    };
    renderWithProviders(<SearchResultsClient initialQuery="Samsung" />);
    expect(screen.getByText(/No results for "Samsung"/)).toBeInTheDocument();
    expect(screen.getByText("Try different keywords or check your spelling")).toBeInTheDocument();
  });

  it("renders browse all products link in empty state", () => {
    mockQueryReturn = {
      data: {
        data: [],
        meta: { total: 0, facets: { brands: [], categories: [], priceRange: { min: 0, max: 1000 } } },
      },
      isLoading: false,
    };
    renderWithProviders(<SearchResultsClient initialQuery="Samsung" />);
    const browseLink = screen.getByText("Browse all products");
    expect(browseLink).toBeInTheDocument();
    expect(browseLink.closest("a")).toHaveAttribute("href", "/products");
  });

  it("renders loading skeleton when loading", () => {
    mockQueryReturn = {
      data: null,
      isLoading: true,
    };
    const { container } = renderWithProviders(<SearchResultsClient initialQuery="Samsung" />);
    const skeletons = container.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders 0 results found when no products match", () => {
    mockQueryReturn = {
      data: {
        data: [],
        meta: { total: 0, facets: { brands: [], categories: [], priceRange: { min: 0, max: 1000 } } },
      },
      isLoading: false,
    };
    renderWithProviders(<SearchResultsClient initialQuery="Samsung" />);
    expect(screen.getByText("0 results found")).toBeInTheDocument();
  });
});
