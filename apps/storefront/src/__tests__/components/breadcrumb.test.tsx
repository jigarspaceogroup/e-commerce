import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { Breadcrumb } from "@/components/shared/breadcrumb";

describe("Breadcrumb", () => {
  const items = [
    { label: "Home", href: "/" },
    { label: "Electronics", href: "/category/electronics" },
    { label: "Phones" },
  ];

  it("renders all items with correct labels", () => {
    renderWithProviders(<Breadcrumb items={items} />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Phones")).toBeInTheDocument();
  });

  it("last item is not a link", () => {
    renderWithProviders(<Breadcrumb items={items} />);
    const phones = screen.getByText("Phones");
    expect(phones.tagName).not.toBe("A");
    expect(phones.closest("a")).toBeNull();
  });

  it("other items are links", () => {
    renderWithProviders(<Breadcrumb items={items} />);
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");
    const electronicsLink = screen.getByText("Electronics").closest("a");
    expect(electronicsLink).toHaveAttribute("href", "/category/electronics");
  });

  it("renders separator between items", () => {
    renderWithProviders(<Breadcrumb items={items} />);
    // SVG separators between items (should have items.length - 1 separators)
    const nav = screen.getByTestId("breadcrumb");
    const svgs = nav.querySelectorAll("svg");
    expect(svgs.length).toBe(items.length - 1);
  });
});
