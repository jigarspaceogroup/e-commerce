import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import SpecificationsTable from "@/components/product/specifications-table";

const mockSpecs: Record<string, { en: string; ar: string }> = {
  "Weight": { en: "500g", ar: "500 جرام" },
  "Material": { en: "Cotton", ar: "قطن" },
  "Color": { en: "Blue", ar: "أزرق" },
  "Dimensions": { en: "10x20x5 cm", ar: "10×20×5 سم" },
  "Country": { en: "Saudi Arabia", ar: "السعودية" },
  "Brand": { en: "Test Brand", ar: "علامة تجريبية" },
  "Warranty": { en: "1 year", ar: "سنة واحدة" },
  "Care": { en: "Machine wash", ar: "غسيل آلي" },
};

describe("SpecificationsTable", () => {
  it("renders key-value pairs in table format", () => {
    renderWithProviders(<SpecificationsTable specifications={mockSpecs} locale="en" />);
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("500g")).toBeInTheDocument();
  });

  it("uses English values when locale is en", () => {
    renderWithProviders(<SpecificationsTable specifications={mockSpecs} locale="en" />);
    expect(screen.getByText("Cotton")).toBeInTheDocument();
  });

  it("falls back to Arabic when English is empty", () => {
    const specs = { "Test": { en: "", ar: "قيمة عربية" } };
    renderWithProviders(<SpecificationsTable specifications={specs} locale="en" />);
    expect(screen.getByText("قيمة عربية")).toBeInTheDocument();
  });

  it("collapses specs beyond 6 rows with Show More button", () => {
    renderWithProviders(<SpecificationsTable specifications={mockSpecs} locale="en" />);
    // Only first 6 rows visible initially
    expect(screen.queryByText("Warranty")).not.toBeInTheDocument();
    expect(screen.queryByText("Care")).not.toBeInTheDocument();
    // Show More button exists
    expect(screen.getByText("Show More")).toBeInTheDocument();
  });

  it("expands all rows when Show More is clicked", () => {
    renderWithProviders(<SpecificationsTable specifications={mockSpecs} locale="en" />);
    fireEvent.click(screen.getByText("Show More"));
    expect(screen.getByText("Warranty")).toBeInTheDocument();
    expect(screen.getByText("1 year")).toBeInTheDocument();
    expect(screen.getByText("Show Less")).toBeInTheDocument();
  });

  it("returns null for null specs", () => {
    const { container } = renderWithProviders(<SpecificationsTable specifications={null} locale="en" />);
    expect(container.firstChild).toBeNull();
  });
});
