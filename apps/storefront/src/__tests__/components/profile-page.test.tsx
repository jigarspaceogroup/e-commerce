import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import ProfilePage from "@/app/[locale]/profile/page";

// Mock fetchProfile and updateProfile
const mockFetchProfile = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock("@/lib/api/profile", () => ({
  fetchProfile: (...args: any[]) => mockFetchProfile(...args),
  updateProfile: (...args: any[]) => mockUpdateProfile(...args),
}));

// Mock useToast
const mockShowToast = vi.fn();
vi.mock("@/components/shared/toast", () => ({
  useToast: () => ({ showToast: mockShowToast, dismissToast: vi.fn() }),
  ToastProvider: ({ children }: any) => children,
}));

const createMockProfile = (overrides?: Record<string, any>) => ({
  data: {
    id: "user-1",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: null,
    dateOfBirth: "1990-05-15T00:00:00Z",
    gender: "male",
    emailVerified: true,
    phoneVerified: false,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  },
});

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockResolvedValue({ data: createMockProfile().data });
  });

  it("renders loading skeleton when data is loading", () => {
    // Make fetchProfile never resolve so query stays in loading state
    mockFetchProfile.mockReturnValue(new Promise(() => {}));

    const { container } = renderWithProviders(<ProfilePage />);

    // Loading skeleton has animate-pulse elements
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders form with pre-filled data after loading", async () => {
    mockFetchProfile.mockResolvedValue(createMockProfile());

    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Personal Information")).toBeInTheDocument();
    });

    // Check first name and last name inputs are pre-filled
    const firstNameInput = screen.getByDisplayValue("John");
    const lastNameInput = screen.getByDisplayValue("Doe");
    expect(firstNameInput).toBeInTheDocument();
    expect(lastNameInput).toBeInTheDocument();
  });

  it("shows email as read-only (disabled)", async () => {
    mockFetchProfile.mockResolvedValue(createMockProfile());

    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
    });

    const emailInput = screen.getByDisplayValue("john@example.com");
    expect(emailInput).toBeDisabled();
  });

  it("shows phone only when profile has phone", async () => {
    mockFetchProfile.mockResolvedValue(
      createMockProfile({ phone: "+966512345678" })
    );

    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("+966512345678")).toBeInTheDocument();
    });

    const phoneInput = screen.getByDisplayValue("+966512345678");
    expect(phoneInput).toBeDisabled();
  });

  it("hides phone field when profile has no phone", async () => {
    mockFetchProfile.mockResolvedValue(createMockProfile({ phone: null }));

    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Personal Information")).toBeInTheDocument();
    });

    // "Phone Number" label should not be present
    expect(screen.queryByText("Phone Number")).not.toBeInTheDocument();
  });

  it("submits form with updated data", async () => {
    mockFetchProfile.mockResolvedValue(createMockProfile());
    mockUpdateProfile.mockResolvedValue({
      data: { ...createMockProfile().data, firstName: "Jane" },
    });

    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    });

    // Update first name
    const firstNameInput = screen.getByDisplayValue("John");
    fireEvent.change(firstNameInput, { target: { value: "Jane" } });

    // Verify the input value changed
    expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();

    // Submit the form
    const form = screen.getByText("Update Profile").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalled();
    });

    // React Query v5 passes mutation context as second arg; check first arg only
    expect(mockUpdateProfile.mock.calls[0][0]).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      dateOfBirth: "1990-05-15",
      gender: "male",
    });
  });

  it("shows success toast on save", async () => {
    mockFetchProfile.mockResolvedValue(createMockProfile());
    mockUpdateProfile.mockResolvedValue({
      data: createMockProfile().data,
    });

    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Update Profile")).toBeInTheDocument();
    });

    const submitButton = screen.getByText("Update Profile");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Your profile has been updated.",
          variant: "success",
        })
      );
    });
  });

  it("gender radio buttons work correctly", async () => {
    mockFetchProfile.mockResolvedValue(createMockProfile({ gender: "male" }));

    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Male")).toBeInTheDocument();
    });

    // Male should be checked initially
    const maleRadio = screen.getByDisplayValue("male") as HTMLInputElement;
    const femaleRadio = screen.getByDisplayValue("female") as HTMLInputElement;

    expect(maleRadio.checked).toBe(true);
    expect(femaleRadio.checked).toBe(false);

    // Click female
    fireEvent.click(femaleRadio);
    expect(femaleRadio.checked).toBe(true);
    expect(maleRadio.checked).toBe(false);
  });
});
