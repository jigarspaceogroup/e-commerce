import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import OrderConfirmationPage from "@/app/[locale]/order-confirmation/[orderId]/page";

// Mock next/navigation
let mockGuestEmail: string | null = null;
vi.mock("next/navigation", () => ({
  useParams: () => ({ orderId: "order-123" }),
  useSearchParams: () => ({
    get: (key: string) => (key === "email" ? mockGuestEmail : null),
  }),
}));

// Mock auth context
let mockUser: any = { id: "user-1", name: "Test User", email: "test@test.com" };
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock API functions
const mockGetOrder = vi.fn();
const mockGetPaymentStatus = vi.fn();
vi.mock("@/lib/api/orders", () => ({
  getOrder: (...args: any[]) => mockGetOrder(...args),
}));
vi.mock("@/lib/api/checkout", () => ({
  getPaymentStatus: (...args: any[]) => mockGetPaymentStatus(...args),
}));

describe("OrderConfirmationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    // Mock API to never resolve (keep loading)
    mockGetOrder.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithProviders(<OrderConfirmationPage />);

    // Check for loading spinner with animate-spin class
    const spinner = document.querySelector("svg.animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders confirmed order with order number", async () => {
    mockGetOrder.mockResolvedValue({
      data: {
        id: "order-123",
        orderNumber: "ORD-20260324-00001",
        status: "payment_confirmed",
        currency: "SAR",
        subtotal: "100.00",
        shippingCost: "25.00",
        discountAmount: "0",
        taxAmount: "15.00",
        grandTotal: "140.00",
        items: [
          {
            id: "i1",
            productTitleSnapshot: { en: "T-Shirt" },
            quantity: 2,
            unitPrice: "50.00",
          },
        ],
        payments: [{ id: "pay-1" }],
      },
    });

    renderWithProviders(<OrderConfirmationPage />);

    await waitFor(() => {
      expect(screen.getByText("Order Confirmed!")).toBeInTheDocument();
    });

    expect(screen.getByText(/ORD-20260324-00001/)).toBeInTheDocument();
    expect(screen.getByText("View Order Details")).toBeInTheDocument();
    expect(screen.getByText("Continue Shopping")).toBeInTheDocument();
  });

  it("shows pending state for pending_payment order", async () => {
    mockGetOrder.mockResolvedValue({
      data: {
        id: "order-123",
        orderNumber: "ORD-20260324-00002",
        status: "pending_payment",
        currency: "SAR",
        subtotal: "100.00",
        shippingCost: "25.00",
        discountAmount: "0",
        taxAmount: "15.00",
        grandTotal: "140.00",
        items: [
          {
            id: "i1",
            productTitleSnapshot: { en: "T-Shirt" },
            quantity: 2,
            unitPrice: "50.00",
          },
        ],
        payments: [{ id: "pay-1" }],
      },
    });

    renderWithProviders(<OrderConfirmationPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Payment is being processed...")
      ).toBeInTheDocument();
    });
  });

  it('shows "Create an Account" for guest user', async () => {
    // Set guest context
    mockUser = null;
    mockGuestEmail = "guest@test.com";

    mockGetOrder.mockResolvedValue({
      data: {
        id: "order-123",
        orderNumber: "ORD-20260324-00003",
        status: "payment_confirmed",
        currency: "SAR",
        subtotal: "100.00",
        shippingCost: "25.00",
        discountAmount: "0",
        taxAmount: "15.00",
        grandTotal: "140.00",
        items: [
          {
            id: "i1",
            productTitleSnapshot: { en: "T-Shirt" },
            quantity: 2,
            unitPrice: "50.00",
          },
        ],
        payments: [{ id: "pay-1" }],
        oneClickRegisterUrl: "/auth/register?token=abc",
      },
    });

    renderWithProviders(<OrderConfirmationPage />);

    await waitFor(() => {
      expect(screen.getByText("Create an Account")).toBeInTheDocument();
    });

    // Restore mocks
    mockUser = { id: "user-1", name: "Test User", email: "test@test.com" };
    mockGuestEmail = null;
  });

  it('shows "Order not found" when order data is null', async () => {
    mockGetOrder.mockResolvedValue({
      data: null,
    });

    renderWithProviders(<OrderConfirmationPage />);

    await waitFor(() => {
      expect(screen.getByText("Order not found")).toBeInTheDocument();
    });
  });
});
