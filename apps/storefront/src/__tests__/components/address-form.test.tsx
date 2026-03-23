import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { AddressForm } from "@/components/address/address-form";
import type { AddressInput } from "@/lib/api/addresses";

describe("AddressForm", () => {
  const mockOnSubmit = vi.fn<(data: AddressInput) => Promise<void>>();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it("renders all form fields", () => {
    renderWithProviders(
      <AddressForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(screen.getByText("Address Label")).toBeInTheDocument();
    expect(screen.getByText("Recipient Name")).toBeInTheDocument();
    expect(screen.getByText("Street Address")).toBeInTheDocument();
    expect(screen.getByText("Apartment, Suite, etc. (optional)")).toBeInTheDocument();
    expect(screen.getByText("City")).toBeInTheDocument();
    // Region label exists (there are two: the label and the default <option>)
    expect(screen.getAllByText("Region").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Postal Code")).toBeInTheDocument();
    expect(screen.getByText("Phone Number")).toBeInTheDocument();
    expect(screen.getByText("Delivery Instructions (optional)")).toBeInTheDocument();
    expect(screen.getByText("Save Address")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("pre-fills form when initialValues provided", () => {
    const initialValues: Partial<AddressInput> = {
      label: "work",
      recipientName: "Jane Smith",
      streetLine1: "123 Main Street",
      streetLine2: "Apt 4B",
      city: "Jeddah",
      region: "riyadh",
      postalCode: "12345",
      phone: "+966512345678",
      deliveryInstructions: "Ring the bell",
    };

    renderWithProviders(
      <AddressForm
        initialValues={initialValues}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument();
    expect(screen.getByDisplayValue("123 Main Street")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Apt 4B")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jeddah")).toBeInTheDocument();
    // Region select has value "riyadh"
    const regionSelect = screen.getByRole("combobox") as HTMLSelectElement;
    expect(regionSelect.value).toBe("riyadh");
    expect(screen.getByDisplayValue("12345")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+966512345678")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ring the bell")).toBeInTheDocument();
    // Work label should be active
    expect(screen.getByText("Work").closest("button")).toHaveClass("bg-primary");
  });

  it("shows validation errors for empty required fields", async () => {
    renderWithProviders(
      <AddressForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // Submit the form directly to bypass any browser validation
    const form = screen.getByText("Save Address").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      // Recipient name error
      expect(screen.getByText("Recipient Name is required")).toBeInTheDocument();
      // Street address error
      expect(screen.getByText("Street Address is required")).toBeInTheDocument();
      // Postal code error
      expect(screen.getByText("5 digits required")).toBeInTheDocument();
      // Phone error shows the placeholder pattern
      expect(screen.getByText("+966 5XX XXX XXXX")).toBeInTheDocument();
    });

    // onSubmit should NOT have been called
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("validates postal code format (5 digits)", async () => {
    renderWithProviders(
      <AddressForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // Fill in all required fields except postal code with valid values
    fillRequiredFields({ postalCode: "123" }); // only 3 digits

    const form = screen.getByText("Save Address").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("5 digits required")).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("validates phone format (+966 or 0 prefix)", async () => {
    renderWithProviders(
      <AddressForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    fillRequiredFields({ phone: "1234567890" }); // invalid prefix

    const form = screen.getByText("Save Address").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      // Phone error shows the placeholder text
      expect(screen.getByText("+966 5XX XXX XXXX")).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with correct data", async () => {
    renderWithProviders(
      <AddressForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    fillRequiredFields();

    const form = screen.getByText("Save Address").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        label: "home",
        recipientName: "John Doe",
        streetLine1: "456 King Road Suite 100",
        streetLine2: undefined,
        city: "Jeddah",
        region: "makkah",
        postalCode: "21577",
        phone: "+966512345678",
        country: "SA",
        deliveryInstructions: undefined,
      });
    });
  });

  it("calls onCancel when cancel button clicked", () => {
    renderWithProviders(
      <AddressForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("label selector toggles work", () => {
    renderWithProviders(
      <AddressForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // Home is selected by default
    const homeButton = screen.getByText("Home");
    const workButton = screen.getByText("Work");
    const otherButton = screen.getByText("Other");

    // Home should have primary styling (bg-primary)
    expect(homeButton.closest("button")).toHaveClass("bg-primary");

    // Click Work
    fireEvent.click(workButton);
    expect(workButton.closest("button")).toHaveClass("bg-primary");
    expect(homeButton.closest("button")).not.toHaveClass("bg-primary");

    // Click Other
    fireEvent.click(otherButton);
    expect(otherButton.closest("button")).toHaveClass("bg-primary");
    expect(workButton.closest("button")).not.toHaveClass("bg-primary");
  });

  // Helper: fill in required fields with valid data
  function fillRequiredFields(overrides?: Record<string, string>) {
    const defaults = {
      recipientName: "John Doe",
      streetLine1: "456 King Road Suite 100",
      city: "Jeddah",
      postalCode: "21577",
      phone: "+966512345678",
    };
    const values = { ...defaults, ...overrides };

    // Get inputs by their associated labels
    const recipientLabel = screen.getByText("Recipient Name");
    const recipientInput = recipientLabel
      .closest("div")
      ?.querySelector("input");
    if (recipientInput)
      fireEvent.change(recipientInput, {
        target: { value: values.recipientName },
      });

    const streetLabel = screen.getByText("Street Address");
    const streetInput = streetLabel
      .closest("div")
      ?.querySelector("input");
    if (streetInput)
      fireEvent.change(streetInput, {
        target: { value: values.streetLine1 },
      });

    const cityLabel = screen.getByText("City");
    const cityInput = cityLabel
      .closest("div")
      ?.querySelector("input");
    if (cityInput)
      fireEvent.change(cityInput, { target: { value: values.city } });

    // Region is a select element
    const regionSelect = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(regionSelect, { target: { value: "makkah" } });

    const postalLabel = screen.getByText("Postal Code");
    const postalInput = postalLabel
      .closest("div")
      ?.querySelector("input");
    if (postalInput)
      fireEvent.change(postalInput, {
        target: { value: values.postalCode },
      });

    const phoneLabel = screen.getByText("Phone Number");
    const phoneInput = phoneLabel
      .closest("div")
      ?.querySelector("input");
    if (phoneInput)
      fireEvent.change(phoneInput, { target: { value: values.phone } });
  }
});
