import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders, mockRouterPush } from "../test-utils";
import { SearchBar } from "@/components/search/search-bar";

// Mock useSearchSuggestions
let mockInputValue = "";
const mockSetInputValue = vi.fn((val: string) => {
  mockInputValue = val;
});
let mockSuggestions: Array<{ type: string; textEn: string; textAr: string; url: string }> = [];
let mockIsLoading = false;
let mockIsOpen = false;

vi.mock("@/hooks/use-search-suggestions", () => ({
  useSearchSuggestions: () => ({
    inputValue: mockInputValue,
    setInputValue: mockSetInputValue,
    suggestions: mockSuggestions,
    isLoading: mockIsLoading,
    isOpen: mockIsOpen,
  }),
}));

// Mock SearchSuggestions child component to simplify testing
vi.mock("@/components/search/search-suggestions", () => ({
  SearchSuggestions: ({ suggestions, activeIndex, onSelect }: any) => (
    <div data-testid="search-suggestions" role="listbox">
      {suggestions.map((s: any, idx: number) => (
        <button
          key={s.url}
          role="option"
          aria-selected={idx === activeIndex}
          onClick={() => onSelect(s.url)}
          data-testid={`suggestion-${idx}`}
        >
          {s.textEn}
        </button>
      ))}
    </div>
  ),
}));

// Note: @/i18n/navigation is already mocked in test-utils with stable mockRouterPush

describe("SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInputValue = "";
    mockSuggestions = [];
    mockIsLoading = false;
    mockIsOpen = false;
  });

  it("renders search input with correct placeholder", () => {
    renderWithProviders(<SearchBar />);
    const input = screen.getByRole("combobox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "Search products...");
  });

  it("has combobox role and aria attributes", () => {
    renderWithProviders(<SearchBar />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("role", "combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  it("calls setInputValue when typing in the input", () => {
    renderWithProviders(<SearchBar />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "phone" } });
    expect(mockSetInputValue).toHaveBeenCalledWith("phone");
  });

  it("shows suggestions dropdown when isOpen is true", () => {
    mockIsOpen = true;
    mockSuggestions = [
      { type: "product", textEn: "Samsung Galaxy", textAr: "سامسونج", url: "/products/samsung" },
    ];
    renderWithProviders(<SearchBar />);
    expect(screen.getByTestId("search-suggestions")).toBeInTheDocument();
  });

  it("does not show suggestions dropdown when isOpen is false", () => {
    mockIsOpen = false;
    renderWithProviders(<SearchBar />);
    expect(screen.queryByTestId("search-suggestions")).not.toBeInTheDocument();
  });

  it("navigates to search page on Enter when no active suggestion", () => {
    mockInputValue = "laptop";
    renderWithProviders(<SearchBar />);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockRouterPush).toHaveBeenCalledWith("/search?q=laptop");
  });

  it("closes dropdown on Escape key", () => {
    mockIsOpen = true;
    mockSuggestions = [
      { type: "product", textEn: "Test Product", textAr: "منتج", url: "/products/test" },
    ];
    renderWithProviders(<SearchBar />);
    expect(screen.getByTestId("search-suggestions")).toBeInTheDocument();

    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "Escape" });

    // After Escape, the component sets showDropdown(false) internally
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("shows clear button when input has value and clears on click", () => {
    mockInputValue = "test query";
    renderWithProviders(<SearchBar />);
    const clearButton = screen.getByLabelText("Clear search");
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(mockSetInputValue).toHaveBeenCalledWith("");
  });

  it("does not show clear button when input is empty", () => {
    mockInputValue = "";
    renderWithProviders(<SearchBar />);
    expect(screen.queryByLabelText("Clear search")).not.toBeInTheDocument();
  });

  it("renders in Arabic locale with correct placeholder", () => {
    renderWithProviders(<SearchBar />, { locale: "ar" });
    const input = screen.getByRole("combobox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "ابحث عن منتجات...");
  });
});
