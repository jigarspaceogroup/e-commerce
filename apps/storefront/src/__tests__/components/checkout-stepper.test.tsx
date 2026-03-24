import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { CheckoutStepper } from "@/app/[locale]/checkout/components/checkout-stepper";

describe("CheckoutStepper", () => {
  const mockOnStepClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 4 steps with correct labels", () => {
    renderWithProviders(
      <CheckoutStepper currentStep={1} onStepClick={mockOnStepClick} />,
    );

    // Check for all 4 steps via aria-label
    expect(screen.getByLabelText("Step 1: Shipping")).toBeInTheDocument();
    expect(screen.getByLabelText("Step 2: Shipping Method")).toBeInTheDocument();
    expect(screen.getByLabelText("Step 3: Payment")).toBeInTheDocument();
    expect(screen.getByLabelText("Step 4: Review")).toBeInTheDocument();
  });

  it("highlights current step with aria-current", () => {
    renderWithProviders(
      <CheckoutStepper currentStep={2} onStepClick={mockOnStepClick} />,
    );

    const currentStepButton = screen.getByLabelText("Step 2: Shipping Method");
    expect(currentStepButton).toHaveAttribute("aria-current", "step");

    // Other steps should not have aria-current
    expect(screen.getByLabelText("Step 1: Shipping")).not.toHaveAttribute("aria-current");
    expect(screen.getByLabelText("Step 3: Payment")).not.toHaveAttribute("aria-current");
    expect(screen.getByLabelText("Step 4: Review")).not.toHaveAttribute("aria-current");
  });

  it("shows checkmark for completed steps and numbers for incomplete steps", () => {
    renderWithProviders(
      <CheckoutStepper currentStep={3} onStepClick={mockOnStepClick} />,
    );

    // Steps 1 and 2 should have checkmarks (completed)
    const step1Button = screen.getByLabelText("Step 1: Shipping");
    const step2Button = screen.getByLabelText("Step 2: Shipping Method");

    // Check for SVG checkmark in completed steps
    expect(step1Button.querySelector("svg")).toBeInTheDocument();
    expect(step2Button.querySelector("svg")).toBeInTheDocument();

    // Step 3 (current) should show number
    const step3Button = screen.getByLabelText("Step 3: Payment");
    expect(step3Button.textContent).toBe("3");
    expect(step3Button.querySelector("svg")).not.toBeInTheDocument();

    // Step 4 (future) should show number
    const step4Button = screen.getByLabelText("Step 4: Review");
    expect(step4Button.textContent).toBe("4");
    expect(step4Button.querySelector("svg")).not.toBeInTheDocument();
  });

  it("calls onStepClick when clicking a completed step", () => {
    renderWithProviders(
      <CheckoutStepper currentStep={3} onStepClick={mockOnStepClick} />,
    );

    // Step 1 is completed and should be clickable
    const step1Button = screen.getByLabelText("Step 1: Shipping");
    fireEvent.click(step1Button);
    expect(mockOnStepClick).toHaveBeenCalledWith(1);

    // Step 2 is completed and should be clickable
    const step2Button = screen.getByLabelText("Step 2: Shipping Method");
    fireEvent.click(step2Button);
    expect(mockOnStepClick).toHaveBeenCalledWith(2);

    expect(mockOnStepClick).toHaveBeenCalledTimes(2);
  });

  it("cannot click future steps (buttons are disabled)", () => {
    renderWithProviders(
      <CheckoutStepper currentStep={2} onStepClick={mockOnStepClick} />,
    );

    // Step 3 is in the future and should be disabled
    const step3Button = screen.getByLabelText("Step 3: Payment");
    expect(step3Button).toBeDisabled();
    fireEvent.click(step3Button);
    expect(mockOnStepClick).not.toHaveBeenCalled();

    // Step 4 is in the future and should be disabled
    const step4Button = screen.getByLabelText("Step 4: Review");
    expect(step4Button).toBeDisabled();
    fireEvent.click(step4Button);
    expect(mockOnStepClick).not.toHaveBeenCalled();
  });

  it("applies correct classes to active and completed steps", () => {
    renderWithProviders(
      <CheckoutStepper currentStep={2} onStepClick={mockOnStepClick} />,
    );

    const step1Button = screen.getByLabelText("Step 1: Shipping");
    const step2Button = screen.getByLabelText("Step 2: Shipping Method");
    const step3Button = screen.getByLabelText("Step 3: Payment");

    // Step 1 (completed) should have primary styling
    expect(step1Button).toHaveClass("bg-primary", "text-on-primary");

    // Step 2 (active) should have primary styling
    expect(step2Button).toHaveClass("bg-primary", "text-on-primary");

    // Step 3 (future) should have muted styling
    expect(step3Button).toHaveClass("bg-surface-muted", "text-muted");
  });

  it("does not call onStepClick when clicking current step", () => {
    renderWithProviders(
      <CheckoutStepper currentStep={2} onStepClick={mockOnStepClick} />,
    );

    const currentStepButton = screen.getByLabelText("Step 2: Shipping Method");
    expect(currentStepButton).toBeDisabled();
    fireEvent.click(currentStepButton);
    expect(mockOnStepClick).not.toHaveBeenCalled();
  });
});
