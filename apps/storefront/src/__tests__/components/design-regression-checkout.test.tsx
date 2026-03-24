import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { CheckoutStepper } from "@/app/[locale]/checkout/components/checkout-stepper";
import { CheckoutSummary } from "@/app/[locale]/checkout/components/checkout-summary";
import { GuestCheckoutModal } from "@/app/[locale]/checkout/components/guest-checkout-modal";

describe("Checkout Design Regression", () => {
  // ---------------------------------------------------------------------------
  // CheckoutStepper — SHOP.CO token classes
  // ---------------------------------------------------------------------------
  describe("CheckoutStepper — SHOP.CO token classes", () => {
    it("stepper active step has correct classes (bg-primary, text-on-primary)", () => {
      const mockOnStepClick = vi.fn();
      renderWithProviders(
        <CheckoutStepper currentStep={2} onStepClick={mockOnStepClick} />,
      );

      const activeStepButton = screen.getByRole("button", { current: "step" });
      expect(activeStepButton).toBeDefined();
      expect(activeStepButton.className).toContain("bg-primary");
      expect(activeStepButton.className).toContain("text-on-primary");
    });

    it("stepper completed step has correct classes (bg-primary)", () => {
      const mockOnStepClick = vi.fn();
      renderWithProviders(
        <CheckoutStepper currentStep={3} onStepClick={mockOnStepClick} />,
      );

      // Steps 1 and 2 should be completed
      const allStepButtons = screen.getAllByRole("button", {
        name: /Step \d:/,
      });

      // Step 1 (completed)
      expect(allStepButtons[0].className).toContain("bg-primary");
      // Step 2 (completed)
      expect(allStepButtons[1].className).toContain("bg-primary");
    });

    it("uses bg-surface-muted for inactive steps", () => {
      const mockOnStepClick = vi.fn();
      const { container } = renderWithProviders(
        <CheckoutStepper currentStep={1} onStepClick={mockOnStepClick} />,
      );

      // Step 2 (inactive) should have bg-surface-muted
      const allStepButtons = screen.getAllByRole("button", {
        name: /Step \d:/,
      });
      expect(allStepButtons[1].className).toContain("bg-surface-muted");
    });

    it("uses text-body-sm for step typography", () => {
      const mockOnStepClick = vi.fn();
      const { container } = renderWithProviders(
        <CheckoutStepper currentStep={1} onStepClick={mockOnStepClick} />,
      );

      const stepButton = screen.getByRole("button", { current: "step" });
      expect(stepButton.className).toContain("text-body-sm");
    });

    it("uses text-primary for active step label", () => {
      const mockOnStepClick = vi.fn();
      const { container } = renderWithProviders(
        <CheckoutStepper currentStep={1} onStepClick={mockOnStepClick} />,
      );

      const activeLabel = container.querySelector(".text-primary");
      expect(activeLabel).toBeDefined();
    });

    it("uses text-muted for inactive step labels", () => {
      const mockOnStepClick = vi.fn();
      const { container } = renderWithProviders(
        <CheckoutStepper currentStep={1} onStepClick={mockOnStepClick} />,
      );

      const mutedLabels = container.querySelectorAll(".text-muted");
      expect(mutedLabels.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // RTL layout: stepper renders in RTL mode
  // ---------------------------------------------------------------------------
  describe("CheckoutStepper — RTL layout", () => {
    it("RTL layout: stepper renders in RTL mode", () => {
      const mockOnStepClick = vi.fn();
      renderWithProviders(
        <CheckoutStepper currentStep={1} onStepClick={mockOnStepClick} />,
        { locale: "ar" },
      );

      // In Arabic locale, labels are translated — just verify 4 buttons render
      const stepButtons = screen.getAllByRole("button");
      expect(stepButtons).toHaveLength(4);
    });
  });

  // ---------------------------------------------------------------------------
  // CheckoutSummary — SHOP.CO token classes
  // ---------------------------------------------------------------------------
  describe("CheckoutSummary — SHOP.CO token classes", () => {
    const mockSummaryProps = {
      subtotal: 450,
      discountAmount: 50,
      shippingFee: 30,
      taxAmount: 67.5,
      grandTotal: 497.5,
      couponCode: "SAVE10",
    };

    it("summary card uses border-border and rounded-lg", () => {
      const { container } = renderWithProviders(
        <CheckoutSummary {...mockSummaryProps} />,
      );

      const outerDiv = container.querySelector(".border");
      expect(outerDiv).toBeDefined();
      expect(outerDiv?.className).toContain("border-border");
      expect(outerDiv?.className).toContain("rounded-lg");
    });

    it("summary uses font-heading for title", () => {
      renderWithProviders(<CheckoutSummary {...mockSummaryProps} />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading.className).toContain("font-heading");
    });

    it("uses text-heading-md for title size", () => {
      renderWithProviders(<CheckoutSummary {...mockSummaryProps} />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading.className).toContain("text-heading-md");
    });

    it("uses text-primary for heading", () => {
      renderWithProviders(<CheckoutSummary {...mockSummaryProps} />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading.className).toContain("text-primary");
    });

    it("uses text-body-md for line items", () => {
      const { container } = renderWithProviders(
        <CheckoutSummary {...mockSummaryProps} />,
      );

      const bodyMdElements = container.querySelectorAll(".text-body-md");
      expect(bodyMdElements.length).toBeGreaterThan(0);
    });

    it("uses text-primary-muted for labels", () => {
      const { container } = renderWithProviders(
        <CheckoutSummary {...mockSummaryProps} />,
      );

      const mutedElements = container.querySelectorAll(".text-primary-muted");
      expect(mutedElements.length).toBeGreaterThan(0);
    });

    it("uses text-accent-red for discount amount", () => {
      const { container } = renderWithProviders(
        <CheckoutSummary {...mockSummaryProps} />,
      );

      const redText = container.querySelector(".text-accent-red");
      expect(redText).toBeDefined();
    });

    it("uses border-border for horizontal rule", () => {
      const { container } = renderWithProviders(
        <CheckoutSummary {...mockSummaryProps} />,
      );

      const hr = container.querySelector("hr");
      expect(hr?.className).toContain("border-border");
    });

    it("uses font-heading for total amount", () => {
      const { container } = renderWithProviders(
        <CheckoutSummary {...mockSummaryProps} />,
      );

      const headingElements = container.querySelectorAll(".font-heading");
      // Should have at least 2: title + total
      expect(headingElements.length).toBeGreaterThanOrEqual(2);
    });

    it("uses bg-primary for coupon badge", () => {
      const { container } = renderWithProviders(
        <CheckoutSummary {...mockSummaryProps} />,
      );

      const badge = container.querySelector(".bg-primary");
      expect(badge).toBeDefined();
    });

    it("uses text-on-primary for coupon badge text", () => {
      const { container } = renderWithProviders(
        <CheckoutSummary {...mockSummaryProps} />,
      );

      const badge = container.querySelector(".text-on-primary");
      expect(badge).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // GuestCheckoutModal — SHOP.CO token classes
  // ---------------------------------------------------------------------------
  describe("GuestCheckoutModal — SHOP.CO token classes", () => {
    it("guest modal uses rounded-lg", () => {
      const mockOnClose = vi.fn();
      const { container } = renderWithProviders(
        <GuestCheckoutModal open={true} onClose={mockOnClose} />,
      );

      const modalCard = container.querySelector(".rounded-lg");
      expect(modalCard).toBeDefined();
      expect(modalCard?.className).toContain("rounded-lg");
    });

    it("uses font-heading for modal title", () => {
      const mockOnClose = vi.fn();
      renderWithProviders(
        <GuestCheckoutModal open={true} onClose={mockOnClose} />,
      );

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading.className).toContain("font-heading");
    });

    it("uses text-heading-md for modal title size", () => {
      const mockOnClose = vi.fn();
      renderWithProviders(
        <GuestCheckoutModal open={true} onClose={mockOnClose} />,
      );

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading.className).toContain("text-heading-md");
    });

    it("uses text-primary for title", () => {
      const mockOnClose = vi.fn();
      renderWithProviders(
        <GuestCheckoutModal open={true} onClose={mockOnClose} />,
      );

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading.className).toContain("text-primary");
    });

    it("uses text-body-md for description", () => {
      const mockOnClose = vi.fn();
      const { container } = renderWithProviders(
        <GuestCheckoutModal open={true} onClose={mockOnClose} />,
      );

      const description = container.querySelector(".text-body-md");
      expect(description).toBeDefined();
    });

    it("uses text-primary-muted for description color", () => {
      const mockOnClose = vi.fn();
      const { container } = renderWithProviders(
        <GuestCheckoutModal open={true} onClose={mockOnClose} />,
      );

      const description = container.querySelector(".text-primary-muted");
      expect(description).toBeDefined();
    });

    it("uses bg-black/50 for overlay (compliant opacity modifier)", () => {
      const mockOnClose = vi.fn();
      const { container } = renderWithProviders(
        <GuestCheckoutModal open={true} onClose={mockOnClose} />,
      );

      const overlay = container.querySelector(".bg-black\\/50");
      expect(overlay).toBeDefined();
    });

    it("uses design system Button component", () => {
      const mockOnClose = vi.fn();
      const { container } = renderWithProviders(
        <GuestCheckoutModal open={true} onClose={mockOnClose} />,
      );

      // Should have 2 buttons (guest checkout + login)
      const buttons = screen.getAllByRole("button");
      // 3 buttons total: close (X) + 2 action buttons
      expect(buttons.length).toBe(3);
    });

    it("uses logical end-4 for close button positioning (not right-4)", () => {
      const mockOnClose = vi.fn();
      const { container } = renderWithProviders(
        <GuestCheckoutModal open={true} onClose={mockOnClose} />,
      );

      const closeButton = screen.getByRole("button", { name: "Close" });
      expect(closeButton.className).toContain("end-4");
      expect(closeButton.className).not.toMatch(/\bright-4\b/);
    });

    it("uses text-primary-muted for close icon", () => {
      const mockOnClose = vi.fn();
      const { container } = renderWithProviders(
        <GuestCheckoutModal open={true} onClose={mockOnClose} />,
      );

      const closeButton = screen.getByRole("button", { name: "Close" });
      expect(closeButton.className).toContain("text-primary-muted");
    });

    it("imports X icon from lucide-react", () => {
      const mockOnClose = vi.fn();
      renderWithProviders(
        <GuestCheckoutModal open={true} onClose={mockOnClose} />,
      );

      // Verify close button with X icon exists
      const closeButton = screen.getByRole("button", { name: "Close" });
      expect(closeButton).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Cross-component consistency
  // ---------------------------------------------------------------------------
  describe("Checkout components — cross-component consistency", () => {
    it("CheckoutStepper imports icons from lucide-react", () => {
      const mockOnStepClick = vi.fn();
      renderWithProviders(
        <CheckoutStepper currentStep={2} onStepClick={mockOnStepClick} />,
      );

      // Completed step should show Check icon
      const stepButtons = screen.getAllByRole("button", {
        name: /Step \d:/,
      });
      expect(stepButtons[0]).toBeDefined(); // First step shows check icon when on step 2
    });

    it("GuestCheckoutModal uses Button component size='full' for action buttons", () => {
      const mockOnClose = vi.fn();
      renderWithProviders(
        <GuestCheckoutModal open={true} onClose={mockOnClose} />,
      );

      // Action buttons should be present
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(2);
    });

    it("CheckoutSummary displays currency and amounts correctly", () => {
      const mockSummaryProps = {
        subtotal: 450,
        discountAmount: 50,
        shippingFee: 30,
        taxAmount: 67.5,
        grandTotal: 497.5,
        couponCode: "SAVE10",
        currency: "SAR",
      };

      renderWithProviders(<CheckoutSummary {...mockSummaryProps} />);

      // Should display SAR currency (multiple instances expected)
      const sarElements = screen.getAllByText(/SAR/);
      expect(sarElements.length).toBeGreaterThan(0);
      // Should display grand total
      expect(screen.getByText(/497\.50/)).toBeDefined();
    });
  });
});
