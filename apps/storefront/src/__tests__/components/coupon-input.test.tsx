import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { CouponInput } from "@/components/cart/coupon-input";

// Mock useCart
const mockApplyCoupon = vi.fn();
const mockRemoveCoupon = vi.fn();
let mockCart: any = null;
let mockIsApplyingCoupon = false;

vi.mock("@/hooks/use-cart", () => ({
  useCart: () => ({
    cart: mockCart,
    applyCoupon: mockApplyCoupon,
    removeCoupon: mockRemoveCoupon,
    isApplyingCoupon: mockIsApplyingCoupon,
  }),
}));

describe("CouponInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCart = null;
    mockIsApplyingCoupon = false;
    mockApplyCoupon.mockResolvedValue({ success: true });
    mockRemoveCoupon.mockResolvedValue(undefined);
  });

  it("renders input and apply button by default", () => {
    mockCart = { couponCode: null, discountAmount: 0 };
    renderWithProviders(<CouponInput />);

    expect(
      screen.getByPlaceholderText("Enter coupon code")
    ).toBeInTheDocument();
    expect(screen.getByText("Apply")).toBeInTheDocument();
  });

  it("shows applied coupon badge when cart has couponCode", () => {
    mockCart = { couponCode: "SAVE20", discountAmount: 50 };
    renderWithProviders(<CouponInput />);

    expect(screen.getByText("SAVE20")).toBeInTheDocument();
    expect(screen.getByText("-SAR 50.00")).toBeInTheDocument();
    // Input should not be visible
    expect(
      screen.queryByPlaceholderText("Enter coupon code")
    ).not.toBeInTheDocument();
  });

  it("calls applyCoupon with entered code", async () => {
    mockCart = { couponCode: null, discountAmount: 0 };
    renderWithProviders(<CouponInput />);

    const input = screen.getByPlaceholderText("Enter coupon code");
    fireEvent.change(input, { target: { value: "SUMMER2026" } });

    const applyButton = screen.getByText("Apply");
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockApplyCoupon).toHaveBeenCalledWith("SUMMER2026");
    });
  });

  it("shows error message on failed apply", async () => {
    mockCart = { couponCode: null, discountAmount: 0 };
    mockApplyCoupon.mockResolvedValue({
      success: false,
      code: "COUPON_NOT_FOUND",
    });

    renderWithProviders(<CouponInput />);

    const input = screen.getByPlaceholderText("Enter coupon code");
    fireEvent.change(input, { target: { value: "BADCODE" } });

    const applyButton = screen.getByText("Apply");
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText("Coupon code not found")).toBeInTheDocument();
    });
  });

  it("shows generic error for unknown error codes", async () => {
    mockCart = { couponCode: null, discountAmount: 0 };
    mockApplyCoupon.mockResolvedValue({
      success: false,
      code: "UNKNOWN_ERROR",
    });

    renderWithProviders(<CouponInput />);

    const input = screen.getByPlaceholderText("Enter coupon code");
    fireEvent.change(input, { target: { value: "BADCODE" } });

    const applyButton = screen.getByText("Apply");
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid coupon code")).toBeInTheDocument();
    });
  });

  it("calls removeCoupon when X clicked on applied badge", async () => {
    mockCart = { couponCode: "SAVE20", discountAmount: 50 };
    renderWithProviders(<CouponInput />);

    const removeButton = screen.getByLabelText("Remove");
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockRemoveCoupon).toHaveBeenCalledTimes(1);
    });
  });

  it("disables input during loading", () => {
    mockCart = { couponCode: null, discountAmount: 0 };
    mockIsApplyingCoupon = true;

    renderWithProviders(<CouponInput />);

    const input = screen.getByPlaceholderText("Enter coupon code");
    expect(input).toBeDisabled();
  });

  it("shows loading indicator on apply button during loading", () => {
    mockCart = { couponCode: null, discountAmount: 0 };
    mockIsApplyingCoupon = true;

    renderWithProviders(<CouponInput />);

    expect(screen.getByText("...")).toBeInTheDocument();
    expect(screen.queryByText("Apply")).not.toBeInTheDocument();
  });

  it("disables apply button when input is empty", () => {
    mockCart = { couponCode: null, discountAmount: 0 };
    renderWithProviders(<CouponInput />);

    const applyButton = screen.getByText("Apply");
    expect(applyButton.closest("button")).toBeDisabled();
  });

  it("does not call applyCoupon when input is empty and apply clicked", async () => {
    mockCart = { couponCode: null, discountAmount: 0 };
    renderWithProviders(<CouponInput />);

    const applyButton = screen.getByText("Apply");
    fireEvent.click(applyButton);

    // Wait a tick and verify applyCoupon was not called
    await waitFor(() => {
      expect(mockApplyCoupon).not.toHaveBeenCalled();
    });
  });
});
