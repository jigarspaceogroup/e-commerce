import { readFileSync } from "fs";
import { join } from "path";

// === SHOP.CO Design Regression Tests ===
// Source-level assertions: read component source files and run regex/string checks
// to verify SHOP.CO design system compliance.

const COMPONENTS_DIR = join(__dirname, "../../components");

const componentFiles = [
  join(COMPONENTS_DIR, "search/search-bar.tsx"),
  join(COMPONENTS_DIR, "search/search-suggestions.tsx"),
  join(COMPONENTS_DIR, "search/active-filters.tsx"),
  join(COMPONENTS_DIR, "cart/mini-cart.tsx"),
  join(COMPONENTS_DIR, "cart/mini-cart-item.tsx"),
  join(COMPONENTS_DIR, "shared/toast.tsx"),
  join(COMPONENTS_DIR, "layout/header.tsx"),
];

// Read all files once
const sources = componentFiles.map((f) => ({
  path: f,
  name: f.split(/[/\\]/).pop()!,
  content: readFileSync(f, "utf-8"),
}));

describe("SHOP.CO Design Regression", () => {
  describe("RTL compliance — logical CSS properties", () => {
    it("uses logical CSS properties (no pl-, pr-, ml-, mr-, left-, right-)", () => {
      // Regex for physical Tailwind properties that should be logical equivalents
      // pl- -> ps-, pr- -> pe-, ml- -> ms-, mr- -> me-, left- -> start-, right- -> end-
      const physicalPattern = /\b(pl-|pr-|ml-|mr-|left-|right-)\d/;
      const violations: string[] = [];
      for (const src of sources) {
        const lines = src.content.split("\n");
        lines.forEach((line, idx) => {
          if (physicalPattern.test(line)) {
            violations.push(`${src.name}:${idx + 1} — ${line.trim()}`);
          }
        });
      }
      expect(violations).toEqual([]);
    });
  });

  describe("Design tokens — no hardcoded hex colors in className", () => {
    it("does not use hardcoded hex colors in className attributes", () => {
      // Match hex colors (#000, #fff, #ff3333, etc.) on lines containing className
      const violations: string[] = [];
      for (const src of sources) {
        src.content.split("\n").forEach((line, idx) => {
          if (line.includes("className") && /#[0-9a-fA-F]{3,8}/.test(line)) {
            violations.push(`${src.name}:${idx + 1} has hardcoded hex color in className`);
          }
        });
      }
      expect(violations).toEqual([]);
    });
  });

  describe("Icon system — lucide-react only (no inline SVGs)", () => {
    it("does not use inline <svg> elements", () => {
      // Known exceptions: product-detail-view.tsx has delivery/return inline SVGs
      const exceptions = ["product-detail-view.tsx"];
      const violations: string[] = [];
      for (const src of sources) {
        if (exceptions.some((ex) => src.name.includes(ex))) continue;
        if (/<svg\b/.test(src.content)) {
          violations.push(`${src.name} uses inline SVG instead of lucide-react`);
        }
      }
      expect(violations).toEqual([]);
    });

    it("imports icons from lucide-react when using icons", () => {
      const iconComponents = sources.filter((s) =>
        /import\s+.*\s+from\s+["']lucide-react["']/.test(s.content),
      );
      // All checked components use icons and should import from lucide-react
      expect(iconComponents.length).toBeGreaterThan(0);
    });

    it.each([
      ["search-bar.tsx", ["Search", "X"]],
      ["search-suggestions.tsx", ["Loader2"]],
      ["active-filters.tsx", ["X"]],
      ["mini-cart.tsx", ["X", "ShoppingBag"]],
      ["mini-cart-item.tsx", ["X"]],
      ["toast.tsx", ["X"]],
      ["header.tsx", ["ShoppingCart", "Menu", "X"]],
    ])("%s imports required lucide-react icons: %j", (fileName, expectedIcons) => {
      const src = sources.find((s) => s.name === fileName);
      expect(src).toBeDefined();
      for (const icon of expectedIcons) {
        expect(src!.content).toContain(icon);
      }
      expect(src!.content).toMatch(/from ["']lucide-react["']/);
    });
  });

  describe("Button component usage", () => {
    it("mini-cart uses <Button> component for action buttons (not raw <button>)", () => {
      const miniCart = sources.find((s) => s.name === "mini-cart.tsx");
      expect(miniCart).toBeDefined();
      expect(miniCart!.content).toContain('from "@/components/ui/button"');
      // Verify <Button is used (component, not html button)
      expect(miniCart!.content).toMatch(/<Button[\s>]/);
    });
  });

  describe("Search bar — SHOP.CO token classes", () => {
    it("uses rounded-pill for search input", () => {
      const searchBar = sources.find((s) => s.name === "search-bar.tsx");
      expect(searchBar).toBeDefined();
      expect(searchBar!.content).toContain("rounded-pill");
    });

    it("uses bg-surface-muted for search input background", () => {
      const searchBar = sources.find((s) => s.name === "search-bar.tsx");
      expect(searchBar).toBeDefined();
      expect(searchBar!.content).toContain("bg-surface-muted");
    });

    it("uses text-primary-subtle for placeholder icon color", () => {
      const searchBar = sources.find((s) => s.name === "search-bar.tsx");
      expect(searchBar).toBeDefined();
      expect(searchBar!.content).toContain("text-primary-subtle");
    });

    it("uses logical start/end positioning (not left/right)", () => {
      const searchBar = sources.find((s) => s.name === "search-bar.tsx");
      expect(searchBar).toBeDefined();
      expect(searchBar!.content).toContain("start-4");
      expect(searchBar!.content).toContain("end-4");
      expect(searchBar!.content).toContain("ps-12");
      expect(searchBar!.content).toContain("pe-10");
    });
  });

  describe("Search suggestions — SHOP.CO token classes", () => {
    it("uses bg-surface for dropdown background", () => {
      const suggestions = sources.find((s) => s.name === "search-suggestions.tsx");
      expect(suggestions).toBeDefined();
      expect(suggestions!.content).toContain("bg-surface");
    });

    it("uses border-border for dropdown border", () => {
      const suggestions = sources.find((s) => s.name === "search-suggestions.tsx");
      expect(suggestions).toBeDefined();
      expect(suggestions!.content).toContain("border-border");
    });

    it("uses text-start for RTL-safe text alignment", () => {
      const suggestions = sources.find((s) => s.name === "search-suggestions.tsx");
      expect(suggestions).toBeDefined();
      expect(suggestions!.content).toContain("text-start");
    });

    it("uses SHOP.CO typography tokens", () => {
      const suggestions = sources.find((s) => s.name === "search-suggestions.tsx");
      expect(suggestions).toBeDefined();
      expect(suggestions!.content).toContain("text-body-sm");
      expect(suggestions!.content).toContain("text-body-xs");
      expect(suggestions!.content).toContain("text-primary");
      expect(suggestions!.content).toContain("text-primary-muted");
    });
  });

  describe("Active filters — SHOP.CO token classes", () => {
    it("uses rounded-pill for filter chips", () => {
      const activeFilters = sources.find((s) => s.name === "active-filters.tsx");
      expect(activeFilters).toBeDefined();
      expect(activeFilters!.content).toContain("rounded-pill");
    });

    it("uses bg-surface-muted for filter chip background", () => {
      const activeFilters = sources.find((s) => s.name === "active-filters.tsx");
      expect(activeFilters).toBeDefined();
      expect(activeFilters!.content).toContain("bg-surface-muted");
    });

    it("uses text-accent-red for clear-all action", () => {
      const activeFilters = sources.find((s) => s.name === "active-filters.tsx");
      expect(activeFilters).toBeDefined();
      expect(activeFilters!.content).toContain("text-accent-red");
    });
  });

  describe("Mini-cart — SHOP.CO token classes", () => {
    it("uses bg-surface for drawer background", () => {
      const miniCart = sources.find((s) => s.name === "mini-cart.tsx");
      expect(miniCart).toBeDefined();
      expect(miniCart!.content).toContain("bg-surface");
    });

    it("uses border-border for section dividers", () => {
      const miniCart = sources.find((s) => s.name === "mini-cart.tsx");
      expect(miniCart).toBeDefined();
      expect(miniCart!.content).toContain("border-border");
    });

    it("uses font-heading for cart title", () => {
      const miniCart = sources.find((s) => s.name === "mini-cart.tsx");
      expect(miniCart).toBeDefined();
      expect(miniCart!.content).toContain("font-heading");
    });

    it("uses logical end-0 for drawer positioning (not right-0)", () => {
      const miniCart = sources.find((s) => s.name === "mini-cart.tsx");
      expect(miniCart).toBeDefined();
      expect(miniCart!.content).toContain("end-0");
      expect(miniCart!.content).not.toMatch(/\bright-0\b/);
    });

    it("uses text-heading-md and text-body-md typography tokens", () => {
      const miniCart = sources.find((s) => s.name === "mini-cart.tsx");
      expect(miniCart).toBeDefined();
      expect(miniCart!.content).toContain("text-heading-md");
      expect(miniCart!.content).toContain("text-body-md");
    });
  });

  describe("Mini-cart item — SHOP.CO token classes", () => {
    it("uses border-border for item separator", () => {
      const miniCartItem = sources.find((s) => s.name === "mini-cart-item.tsx");
      expect(miniCartItem).toBeDefined();
      expect(miniCartItem!.content).toContain("border-border");
    });

    it("uses bg-surface-warm and bg-surface-muted for image/attribute backgrounds", () => {
      const miniCartItem = sources.find((s) => s.name === "mini-cart-item.tsx");
      expect(miniCartItem).toBeDefined();
      expect(miniCartItem!.content).toContain("bg-surface-warm");
      expect(miniCartItem!.content).toContain("bg-surface-muted");
    });

    it("uses text-primary and text-primary-muted for typography", () => {
      const miniCartItem = sources.find((s) => s.name === "mini-cart-item.tsx");
      expect(miniCartItem).toBeDefined();
      expect(miniCartItem!.content).toContain("text-primary");
      expect(miniCartItem!.content).toContain("text-primary-muted");
    });

    it("uses hover:text-accent-red for remove button hover", () => {
      const miniCartItem = sources.find((s) => s.name === "mini-cart-item.tsx");
      expect(miniCartItem).toBeDefined();
      expect(miniCartItem!.content).toContain("hover:text-accent-red");
    });
  });

  describe("Toast — SHOP.CO token classes", () => {
    it("uses bg-primary text-on-primary for success variant", () => {
      const toast = sources.find((s) => s.name === "toast.tsx");
      expect(toast).toBeDefined();
      expect(toast!.content).toContain("bg-primary");
      expect(toast!.content).toContain("text-on-primary");
    });

    it("uses bg-accent-red for error variant", () => {
      const toast = sources.find((s) => s.name === "toast.tsx");
      expect(toast).toBeDefined();
      expect(toast!.content).toContain("bg-accent-red");
    });

    it("uses logical end-4 for RTL-safe positioning", () => {
      const toast = sources.find((s) => s.name === "toast.tsx");
      expect(toast).toBeDefined();
      expect(toast!.content).toContain("end-4");
    });

    it("uses SHOP.CO typography token text-body-sm", () => {
      const toast = sources.find((s) => s.name === "toast.tsx");
      expect(toast).toBeDefined();
      expect(toast!.content).toContain("text-body-sm");
    });
  });

  describe("Header — SHOP.CO token classes", () => {
    it("uses font-heading for logo text", () => {
      const header = sources.find((s) => s.name === "header.tsx");
      expect(header).toBeDefined();
      expect(header!.content).toContain("font-heading");
    });

    it("uses bg-primary text-on-primary rounded-full for cart badge", () => {
      const header = sources.find((s) => s.name === "header.tsx");
      expect(header).toBeDefined();
      expect(header!.content).toContain("bg-primary");
      expect(header!.content).toContain("text-on-primary");
      expect(header!.content).toContain("rounded-full");
    });

    it("uses bg-surface and border-border for header container", () => {
      const header = sources.find((s) => s.name === "header.tsx");
      expect(header).toBeDefined();
      expect(header!.content).toContain("bg-surface");
      expect(header!.content).toContain("border-border");
    });

    it("uses logical -end-1 for badge positioning (not -right-1)", () => {
      const header = sources.find((s) => s.name === "header.tsx");
      expect(header).toBeDefined();
      expect(header!.content).toContain("-end-1");
      expect(header!.content).not.toMatch(/-right-1/);
    });

    it("uses text-body-md for navigation links", () => {
      const header = sources.find((s) => s.name === "header.tsx");
      expect(header).toBeDefined();
      expect(header!.content).toContain("text-body-md");
    });

    it("uses text-heading-lg for logo size", () => {
      const header = sources.find((s) => s.name === "header.tsx");
      expect(header).toBeDefined();
      expect(header!.content).toContain("text-heading-lg");
    });
  });

  describe("Cross-component consistency", () => {
    it("all components use SHOP.CO text-primary (not text-black or text-gray-*)", () => {
      const violations: string[] = [];
      for (const src of sources) {
        if (/\btext-black\b/.test(src.content)) {
          violations.push(`${src.name} uses text-black instead of text-primary`);
        }
        if (/\btext-gray-\d/.test(src.content)) {
          violations.push(`${src.name} uses text-gray-* instead of SHOP.CO tokens`);
        }
      }
      expect(violations).toEqual([]);
    });

    it("all components use SHOP.CO bg-surface (not bg-white or bg-gray-*)", () => {
      const violations: string[] = [];
      for (const src of sources) {
        if (/\bbg-white\b/.test(src.content)) {
          violations.push(`${src.name} uses bg-white instead of bg-surface`);
        }
        if (/\bbg-gray-\d/.test(src.content)) {
          violations.push(`${src.name} uses bg-gray-* instead of SHOP.CO tokens`);
        }
      }
      expect(violations).toEqual([]);
    });

    it("all components use SHOP.CO border-border (not border-gray-*)", () => {
      const violations: string[] = [];
      for (const src of sources) {
        if (/\bborder-gray-\d/.test(src.content)) {
          violations.push(`${src.name} uses border-gray-* instead of border-border`);
        }
      }
      expect(violations).toEqual([]);
    });

    it("all components use SHOP.CO font-heading or font-body (not font-sans)", () => {
      const violations: string[] = [];
      for (const src of sources) {
        if (/\bfont-sans\b/.test(src.content)) {
          violations.push(`${src.name} uses font-sans instead of SHOP.CO font tokens`);
        }
      }
      expect(violations).toEqual([]);
    });

    it("all components use SHOP.CO rounded tokens (not arbitrary rounded values)", () => {
      // Check for non-standard rounded values like rounded-[10px]
      const arbitraryRoundedPattern = /\brounded-\[\d+px\]/;
      const violations: string[] = [];
      for (const src of sources) {
        if (arbitraryRoundedPattern.test(src.content)) {
          violations.push(`${src.name} uses arbitrary rounded value instead of SHOP.CO tokens`);
        }
      }
      expect(violations).toEqual([]);
    });
  });
});
