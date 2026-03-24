import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders, mockRouterPush } from "../test-utils";
import { GuestCheckoutModal } from "@/app/[locale]/checkout/components/guest-checkout-modal";
import { StepShipping } from "@/app/[locale]/checkout/components/step-shipping";

// Mock useCart
vi.mock("@/hooks/use-cart", () => ({
  useCart: () => ({
    cart: { subtotal: 600 },
  }),
}));

describe("GuestCheckoutModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    const { container } = renderWithProviders(
      <GuestCheckoutModal open={false} onClose={mockOnClose} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders modal title and description when open is true", () => {
    renderWithProviders(
      <GuestCheckoutModal open={true} onClose={mockOnClose} />,
    );
    expect(screen.getByText("How would you like to checkout?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You can checkout as a guest or log in for a faster experience.",
      ),
    ).toBeInTheDocument();
  });

  it("navigates to /checkout?guest=true when Checkout as Guest is clicked", () => {
    renderWithProviders(
      <GuestCheckoutModal open={true} onClose={mockOnClose} />,
    );
    const guestButton = screen.getByText("Checkout as Guest");
    fireEvent.click(guestButton);
    expect(mockRouterPush).toHaveBeenCalledWith("/checkout?guest=true");
  });

  it("navigates to /auth/login?redirect=/checkout when Log In / Create Account is clicked", () => {
    renderWithProviders(
      <GuestCheckoutModal open={true} onClose={mockOnClose} />,
    );
    const loginButton = screen.getByText("Log In / Create Account");
    fireEvent.click(loginButton);
    expect(mockRouterPush).toHaveBeenCalledWith("/auth/login?redirect=/checkout");
  });

  it("calls onClose when close button (X icon) is clicked", () => {
    renderWithProviders(
      <GuestCheckoutModal open={true} onClose={mockOnClose} />,
    );
    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    renderWithProviders(
      <GuestCheckoutModal open={true} onClose={mockOnClose} />,
    );
    const backdrop = screen.getByText("How would you like to checkout?").closest("div")?.parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it("does not close when clicking inside modal content", () => {
    renderWithProviders(
      <GuestCheckoutModal open={true} onClose={mockOnClose} />,
    );
    const modalContent = screen.getByText("How would you like to checkout?");
    fireEvent.click(modalContent);
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});

describe("StepShipping", () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders shipping option with Standard Shipping text", () => {
    renderWithProviders(
      <StepShipping dispatch={mockDispatch} cartSubtotal={600} />,
    );
    expect(screen.getByText("Standard Shipping")).toBeInTheDocument();
  });

  it("shows Free when subtotal >= 500", () => {
    renderWithProviders(
      <StepShipping dispatch={mockDispatch} cartSubtotal={600} />,
    );
    // "Free" appears as both badge and price text
    const freeElements = screen.getAllByText("Free");
    expect(freeElements.length).toBeGreaterThanOrEqual(2);
  });

  it("shows SAR 30 when subtotal < 500", () => {
    renderWithProviders(
      <StepShipping dispatch={mockDispatch} cartSubtotal={400} />,
    );
    expect(screen.getByText("SAR 30")).toBeInTheDocument();
  });

  it("renders delivery time information", () => {
    renderWithProviders(
      <StepShipping dispatch={mockDispatch} cartSubtotal={600} />,
    );
    expect(screen.getByText("Delivered in 3–5 business days")).toBeInTheDocument();
  });

  it("calls dispatch with SET_SHIPPING_METHOD when Continue is clicked", () => {
    renderWithProviders(
      <StepShipping dispatch={mockDispatch} cartSubtotal={600} />,
    );
    const continueButton = screen.getByText("Continue");
    fireEvent.click(continueButton);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "SET_SHIPPING_METHOD",
      payload: {
        id: "standard",
        name: "standardShipping",
        cost: 0,
        estimatedDays: "3-5",
      },
    });
  });

  it("dispatches SET_STEP with payload 3 when Continue is clicked", () => {
    renderWithProviders(
      <StepShipping dispatch={mockDispatch} cartSubtotal={600} />,
    );
    const continueButton = screen.getByText("Continue");
    fireEvent.click(continueButton);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "SET_STEP",
      payload: 3,
    });
  });

  it("calls dispatch with SET_STEP payload 1 when Back is clicked", () => {
    renderWithProviders(
      <StepShipping dispatch={mockDispatch} cartSubtotal={600} />,
    );
    const backButton = screen.getByText("Back");
    fireEvent.click(backButton);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "SET_STEP",
      payload: 1,
    });
  });

  it("displays shipping cost of 30 in dispatch payload when subtotal < 500", () => {
    renderWithProviders(
      <StepShipping dispatch={mockDispatch} cartSubtotal={400} />,
    );
    const continueButton = screen.getByText("Continue");
    fireEvent.click(continueButton);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SET_SHIPPING_METHOD",
        payload: expect.objectContaining({
          cost: 30,
        }),
      }),
    );
  });

  it("renders shipping method title", () => {
    renderWithProviders(
      <StepShipping dispatch={mockDispatch} cartSubtotal={600} />,
    );
    expect(screen.getByText("Shipping Method")).toBeInTheDocument();
  });
});
