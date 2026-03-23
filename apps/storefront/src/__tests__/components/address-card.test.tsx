import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { AddressCard } from "@/components/address/address-card";
import type { Address } from "@/lib/api/addresses";

const createMockAddress = (overrides?: Partial<Address>): Address => ({
  id: "addr-1",
  label: "home",
  recipientName: "John Doe",
  streetLine1: "123 King Fahd Road",
  streetLine2: "Suite 200",
  city: "Riyadh",
  region: "riyadh",
  postalCode: "12345",
  country: "SA",
  phone: "+966512345678",
  deliveryInstructions: null,
  isDefault: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("AddressCard", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnSetDefault = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders address details correctly", () => {
    const address = createMockAddress();
    renderWithProviders(
      <AddressCard
        address={address}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSetDefault={mockOnSetDefault}
      />
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("123 King Fahd Road")).toBeInTheDocument();
    expect(screen.getByText("Suite 200")).toBeInTheDocument();
    expect(screen.getByText("Riyadh, riyadh 12345")).toBeInTheDocument();
    expect(screen.getByText("+966512345678")).toBeInTheDocument();
  });

  it("shows default badge when isDefault", () => {
    const address = createMockAddress({ isDefault: true });
    renderWithProviders(
      <AddressCard
        address={address}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSetDefault={mockOnSetDefault}
      />
    );

    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("hides Set Default button when isDefault", () => {
    const address = createMockAddress({ isDefault: true });
    renderWithProviders(
      <AddressCard
        address={address}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSetDefault={mockOnSetDefault}
      />
    );

    expect(screen.queryByText("Set as Default")).not.toBeInTheDocument();
  });

  it("shows Set Default button when not default", () => {
    const address = createMockAddress({ isDefault: false });
    renderWithProviders(
      <AddressCard
        address={address}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSetDefault={mockOnSetDefault}
      />
    );

    expect(screen.getByText("Set as Default")).toBeInTheDocument();
  });

  it("calls onEdit when edit clicked", () => {
    const address = createMockAddress();
    renderWithProviders(
      <AddressCard
        address={address}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSetDefault={mockOnSetDefault}
      />
    );

    const editButton = screen.getByText("Edit Address");
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(address);
  });

  it("calls onDelete when delete clicked", () => {
    const address = createMockAddress();
    renderWithProviders(
      <AddressCard
        address={address}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSetDefault={mockOnSetDefault}
      />
    );

    const deleteButton = screen.getByText("Delete Address");
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith("addr-1");
  });

  it("calls onSetDefault when set default clicked", () => {
    const address = createMockAddress({ isDefault: false });
    renderWithProviders(
      <AddressCard
        address={address}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSetDefault={mockOnSetDefault}
      />
    );

    const setDefaultButton = screen.getByText("Set as Default");
    fireEvent.click(setDefaultButton);

    expect(mockOnSetDefault).toHaveBeenCalledTimes(1);
    expect(mockOnSetDefault).toHaveBeenCalledWith("addr-1");
  });

  it("shows label icon and label text", () => {
    const address = createMockAddress({ label: "work" });
    renderWithProviders(
      <AddressCard
        address={address}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSetDefault={mockOnSetDefault}
      />
    );

    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("does not render streetLine2 when null", () => {
    const address = createMockAddress({ streetLine2: null });
    renderWithProviders(
      <AddressCard
        address={address}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSetDefault={mockOnSetDefault}
      />
    );

    // Only streetLine1 + city line + phone should appear as text paragraphs
    expect(screen.getByText("123 King Fahd Road")).toBeInTheDocument();
    expect(screen.queryByText("Suite 200")).not.toBeInTheDocument();
  });
});
