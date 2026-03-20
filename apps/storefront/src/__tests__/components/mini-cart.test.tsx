import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { MiniCart } from "@/components/cart/mini-cart";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} />,
}));

// Mock useCart
const mockAddItem = vi.fn();
const mockUpdateQuantity = vi.fn();
const mockRemoveItem = vi.fn();
let mockCart: any = null;
let mockItemCount = 0;

vi.mock("@/hooks/use-cart", () => ({
  useCart: () => ({
    cart: mockCart,
    itemCount: mockItemCount,
    addItem: mockAddItem,
    updateQuantity: mockUpdateQuantity,
    removeItem: mockRemoveItem,
  }),
}));

// Mock useToast
const mockShowToast = vi.fn();
vi.mock("@/components/shared/toast", () => ({
  useToast: () => ({ showToast: mockShowToast, dismissToast: vi.fn() }),
  ToastProvider: ({ children }: any) => children,
}));

const createCartWithItems = () => ({
  items: [
    {
      id: "item-1",
      quantity: 2,
      variant: {
        id: "var-1",
        sku: "PHONE-BLK",
        attributes: { color: "Black", storage: "128GB" },
        stockQuantity: 10,
        effectivePrice: 2999,
      },
      product: {
        titleEn: "Test Phone",
        titleAr: "هاتف تجريبي",
        slug: "test-phone",
        image: { url: "/phone.jpg", altTextEn: "Phone image" },
      },
    },
    {
      id: "item-2",
      quantity: 1,
      variant: {
        id: "var-2",
        sku: "CASE-RED",
        attributes: { color: "Red" },
        stockQuantity: 20,
        effectivePrice: 99,
      },
      product: {
        titleEn: "Phone Case",
        titleAr: "غلاف هاتف",
        slug: "phone-case",
        image: { url: "/case.jpg", altTextEn: "Case image" },
      },
    },
  ],
  subtotal: 6097,
  taxAmount: 914.55,
  grandTotal: 7011.55,
});

describe("MiniCart", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCart = null;
    mockItemCount = 0;
    mockRemoveItem.mockResolvedValue(undefined);
  });

  it("returns null when isOpen is false", () => {
    const { container } = renderWithProviders(
      <MiniCart isOpen={false} onClose={mockOnClose} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders cart title with item count when open", () => {
    mockCart = createCartWithItems();
    mockItemCount = 2;
    renderWithProviders(<MiniCart isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/Shopping Cart/)).toBeInTheDocument();
    expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
  });

  it("renders cart items when open with items", () => {
    mockCart = createCartWithItems();
    mockItemCount = 2;
    renderWithProviders(<MiniCart isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText("Test Phone")).toBeInTheDocument();
    expect(screen.getByText("Phone Case")).toBeInTheDocument();
  });

  it("displays correct subtotal, VAT, and total", () => {
    mockCart = createCartWithItems();
    mockItemCount = 2;
    renderWithProviders(<MiniCart isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText("SAR 6097.00")).toBeInTheDocument();
    expect(screen.getByText("SAR 914.55")).toBeInTheDocument();
    expect(screen.getByText("SAR 7011.55")).toBeInTheDocument();
  });

  it("renders empty state when cart has no items", () => {
    mockCart = { items: [], subtotal: 0, taxAmount: 0, grandTotal: 0 };
    mockItemCount = 0;
    renderWithProviders(<MiniCart isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    expect(screen.getByText("Looks like you haven't added any items yet.")).toBeInTheDocument();
  });

  it("renders Start Shopping link in empty state pointing to /products", () => {
    mockCart = { items: [], subtotal: 0, taxAmount: 0, grandTotal: 0 };
    mockItemCount = 0;
    renderWithProviders(<MiniCart isOpen={true} onClose={mockOnClose} />);
    const startShoppingLink = screen.getByText("Start Shopping");
    expect(startShoppingLink.closest("a")).toHaveAttribute("href", "/products");
  });

  it("triggers removeItem when remove button is clicked", async () => {
    mockCart = createCartWithItems();
    mockItemCount = 2;
    renderWithProviders(<MiniCart isOpen={true} onClose={mockOnClose} />);
    const removeButtons = screen.getAllByLabelText("Remove");
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[0]);
    await waitFor(() => {
      expect(mockRemoveItem).toHaveBeenCalledWith("item-1");
    });
  });

  it("shows toast after item removal", async () => {
    mockCart = createCartWithItems();
    mockItemCount = 2;
    renderWithProviders(<MiniCart isOpen={true} onClose={mockOnClose} />);
    const removeButtons = screen.getAllByLabelText("Remove");
    fireEvent.click(removeButtons[0]);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Item removed from cart",
          variant: "success",
        }),
      );
    });
  });

  it("renders View Cart and Checkout links when cart has items", () => {
    mockCart = createCartWithItems();
    mockItemCount = 2;
    renderWithProviders(<MiniCart isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText("View Cart")).toBeInTheDocument();
    expect(screen.getByText("Checkout")).toBeInTheDocument();
  });

  it("closes on Escape key press", () => {
    mockCart = createCartWithItems();
    mockItemCount = 2;
    renderWithProviders(<MiniCart isOpen={true} onClose={mockOnClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("renders variant attribute badges for cart items", () => {
    mockCart = createCartWithItems();
    mockItemCount = 2;
    renderWithProviders(<MiniCart isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText("Black")).toBeInTheDocument();
    expect(screen.getByText("128GB")).toBeInTheDocument();
    expect(screen.getByText("Red")).toBeInTheDocument();
  });

  it("renders quantity selectors for cart items", () => {
    mockCart = createCartWithItems();
    mockItemCount = 2;
    renderWithProviders(<MiniCart isOpen={true} onClose={mockOnClose} />);
    const decreaseButtons = screen.getAllByLabelText("Decrease quantity");
    const increaseButtons = screen.getAllByLabelText("Increase quantity");
    expect(decreaseButtons).toHaveLength(2);
    expect(increaseButtons).toHaveLength(2);
  });
});
