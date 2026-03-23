import { readFileSync } from "fs";
import { join } from "path";

// === SHOP.CO Design Regression Tests ===
// Source-level assertions: read component source files and run regex/string checks
// to verify SHOP.CO design system compliance.

const COMPONENTS_DIR = join(__dirname, "../../components");
const APP_DIR = join(__dirname, "../../app/[locale]");

const componentFiles = [
  join(COMPONENTS_DIR, "search/search-bar.tsx"),
  join(COMPONENTS_DIR, "search/search-suggestions.tsx"),
  join(COMPONENTS_DIR, "search/active-filters.tsx"),
  join(COMPONENTS_DIR, "cart/mini-cart.tsx"),
  join(COMPONENTS_DIR, "cart/mini-cart-item.tsx"),
  join(COMPONENTS_DIR, "shared/toast.tsx"),
  join(COMPONENTS_DIR, "layout/header.tsx"),
];

// Sprint 1.4: Cart & Profile components
const sprint14Files = [
  { path: join(APP_DIR, "profile/page.tsx"), name: "profile-page.tsx" },
  { path: join(APP_DIR, "profile/layout.tsx"), name: "profile-layout.tsx" },
  { path: join(COMPONENTS_DIR, "address/address-form.tsx"), name: "address-form.tsx" },
  { path: join(COMPONENTS_DIR, "address/address-card.tsx"), name: "address-card.tsx" },
  { path: join(COMPONENTS_DIR, "address/address-form-modal.tsx"), name: "address-form-modal.tsx" },
  { path: join(APP_DIR, "profile/addresses/page.tsx"), name: "addresses-page.tsx" },
  { path: join(COMPONENTS_DIR, "cart/coupon-input.tsx"), name: "coupon-input.tsx" },
  { path: join(COMPONENTS_DIR, "cart/order-summary.tsx"), name: "order-summary.tsx" },
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

// =============================================================================
// Sprint 1.4: Cart & Profile — Design Regression Tests
// =============================================================================

const sprint14Sources = sprint14Files.map((f) => ({
  path: f.path,
  name: f.name,
  content: readFileSync(f.path, "utf-8"),
}));

describe("SHOP.CO Design Regression — Sprint 1.4 (Cart & Profile)", () => {
  // ---------------------------------------------------------------------------
  // Cross-component: RTL compliance
  // ---------------------------------------------------------------------------
  describe("RTL compliance — logical CSS properties", () => {
    it("uses logical CSS properties (no pl-, pr-, ml-, mr-, left-, right-)", () => {
      // Physical direction pattern: pl-, pr-, ml-, mr-, left-, right- followed by a digit
      // Exceptions: text-left, text-right are OK for text alignment
      const physicalPattern = /\b(pl-|pr-|ml-|mr-|left-|right-)\d/;
      const violations: string[] = [];
      for (const src of sprint14Sources) {
        const lines = src.content.split("\n");
        lines.forEach((line, idx) => {
          if (physicalPattern.test(line)) {
            // Allow text-left and text-right (text alignment is OK)
            const stripped = line.replace(/text-left/g, "").replace(/text-right/g, "");
            if (physicalPattern.test(stripped)) {
              violations.push(`${src.name}:${idx + 1} — ${line.trim()}`);
            }
          }
        });
      }
      expect(violations).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Cross-component: No hardcoded hex colors
  // ---------------------------------------------------------------------------
  describe("Design tokens — no hardcoded hex colors in className", () => {
    it("does not use hardcoded hex colors in className attributes", () => {
      const violations: string[] = [];
      for (const src of sprint14Sources) {
        src.content.split("\n").forEach((line, idx) => {
          if (line.includes("className") && /#[0-9a-fA-F]{3,8}/.test(line)) {
            violations.push(`${src.name}:${idx + 1} has hardcoded hex color in className`);
          }
        });
      }
      expect(violations).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Cross-component: No inline SVGs
  // ---------------------------------------------------------------------------
  describe("Icon system — lucide-react only (no inline SVGs)", () => {
    it("does not use inline <svg> elements", () => {
      const violations: string[] = [];
      for (const src of sprint14Sources) {
        if (/<svg\b/.test(src.content)) {
          violations.push(`${src.name} uses inline SVG instead of lucide-react`);
        }
      }
      expect(violations).toEqual([]);
    });

    it("components that use icons import from lucide-react", () => {
      const iconUsers = sprint14Sources.filter((s) =>
        /import\s+.*\s+from\s+["']lucide-react["']/.test(s.content),
      );
      // Most Sprint 1.4 components use icons
      expect(iconUsers.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Cross-component: No raw Tailwind colors (text-black, bg-white, etc.)
  // ---------------------------------------------------------------------------
  describe("Cross-component consistency", () => {
    it("all components use SHOP.CO text-primary (not text-black or text-gray-*)", () => {
      const violations: string[] = [];
      for (const src of sprint14Sources) {
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
      for (const src of sprint14Sources) {
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
      for (const src of sprint14Sources) {
        if (/\bborder-gray-\d/.test(src.content)) {
          violations.push(`${src.name} uses border-gray-* instead of border-border`);
        }
      }
      expect(violations).toEqual([]);
    });

    it("all components use SHOP.CO font-heading or font-body (not font-sans)", () => {
      const violations: string[] = [];
      for (const src of sprint14Sources) {
        if (/\bfont-sans\b/.test(src.content)) {
          violations.push(`${src.name} uses font-sans instead of SHOP.CO font tokens`);
        }
      }
      expect(violations).toEqual([]);
    });

    it("all components use SHOP.CO rounded tokens (not arbitrary rounded values)", () => {
      const arbitraryRoundedPattern = /\brounded-\[\d+px\]/;
      const violations: string[] = [];
      for (const src of sprint14Sources) {
        if (arbitraryRoundedPattern.test(src.content)) {
          violations.push(`${src.name} uses arbitrary rounded value instead of SHOP.CO tokens`);
        }
      }
      expect(violations).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Profile page — page.tsx
  // ---------------------------------------------------------------------------
  describe("Profile page — SHOP.CO token classes", () => {
    const src = sprint14Sources.find((s) => s.name === "profile-page.tsx")!;

    it("uses font-heading for section heading", () => {
      expect(src.content).toContain("font-heading");
    });

    it("uses text-heading-lg for heading size", () => {
      expect(src.content).toContain("text-heading-lg");
    });

    it("uses text-body-sm and text-body-md typography tokens", () => {
      expect(src.content).toContain("text-body-sm");
      expect(src.content).toContain("text-body-md");
    });

    it("uses text-primary for text color", () => {
      expect(src.content).toContain("text-primary");
    });

    it("uses bg-surface-muted for skeleton/loading backgrounds", () => {
      expect(src.content).toContain("bg-surface-muted");
    });

    it("uses rounded-pill for input skeletons", () => {
      expect(src.content).toContain("rounded-pill");
    });

    it("uses design system Button component", () => {
      expect(src.content).toContain('@/components/ui/button');
      expect(src.content).toMatch(/<Button[\s>]/);
    });

    it("uses design system Input component", () => {
      expect(src.content).toContain('@/components/ui/input');
      expect(src.content).toMatch(/<Input[\s/>]/);
    });
  });

  // ---------------------------------------------------------------------------
  // Profile layout — layout.tsx
  // ---------------------------------------------------------------------------
  describe("Profile layout — SHOP.CO token classes", () => {
    const src = sprint14Sources.find((s) => s.name === "profile-layout.tsx")!;

    it("uses font-heading for page title and user name", () => {
      expect(src.content).toContain("font-heading");
    });

    it("uses text-display-md for main heading", () => {
      expect(src.content).toContain("text-display-md");
    });

    it("uses text-body-sm and text-body-md typography tokens", () => {
      expect(src.content).toContain("text-body-sm");
      expect(src.content).toContain("text-body-md");
    });

    it("uses bg-surface-muted for skeleton/loading and active backgrounds", () => {
      expect(src.content).toContain("bg-surface-muted");
    });

    it("uses border-border for sidebar border and dividers", () => {
      expect(src.content).toContain("border-border");
    });

    it("uses rounded-pill for mobile pill tabs", () => {
      expect(src.content).toContain("rounded-pill");
    });

    it("uses rounded-lg for sidebar and nav items", () => {
      expect(src.content).toContain("rounded-lg");
    });

    it("uses bg-primary text-on-primary for active tab state", () => {
      expect(src.content).toContain("bg-primary");
      expect(src.content).toContain("text-on-primary");
    });

    it("uses text-primary and text-primary-muted for text hierarchy", () => {
      expect(src.content).toContain("text-primary");
      expect(src.content).toContain("text-primary-muted");
    });

    it("imports icons from lucide-react", () => {
      expect(src.content).toMatch(/from ["']lucide-react["']/);
      expect(src.content).toContain("User");
      expect(src.content).toContain("MapPin");
      expect(src.content).toContain("Package");
      expect(src.content).toContain("Heart");
      expect(src.content).toContain("Settings");
    });

    it("uses Link from @/i18n/navigation for locale-aware routing", () => {
      expect(src.content).toContain("@/i18n/navigation");
    });
  });

  // ---------------------------------------------------------------------------
  // Address form — address-form.tsx
  // ---------------------------------------------------------------------------
  describe("Address form — SHOP.CO token classes", () => {
    const src = sprint14Sources.find((s) => s.name === "address-form.tsx")!;

    it("uses design system Button component", () => {
      expect(src.content).toContain('@/components/ui/button');
      expect(src.content).toMatch(/<Button[\s>]/);
    });

    it("uses design system Input component", () => {
      expect(src.content).toContain('@/components/ui/input');
      expect(src.content).toMatch(/<Input[\s/>]/);
    });

    it("imports icons from lucide-react", () => {
      expect(src.content).toMatch(/from ["']lucide-react["']/);
      expect(src.content).toContain("Home");
      expect(src.content).toContain("Briefcase");
      expect(src.content).toContain("MapPin");
    });

    it("uses rounded-pill for pill buttons and select", () => {
      expect(src.content).toContain("rounded-pill");
    });

    it("uses rounded-lg for textarea", () => {
      expect(src.content).toContain("rounded-lg");
    });

    it("uses bg-primary text-on-primary for active label state", () => {
      expect(src.content).toContain("bg-primary");
      expect(src.content).toContain("text-on-primary");
    });

    it("uses text-body-sm, text-body-md, text-body-xs typography tokens", () => {
      expect(src.content).toContain("text-body-sm");
      expect(src.content).toContain("text-body-md");
      expect(src.content).toContain("text-body-xs");
    });

    it("uses text-primary for labels and text-primary-subtle for placeholders", () => {
      expect(src.content).toContain("text-primary");
      expect(src.content).toContain("text-primary-subtle");
    });

    it("uses border-border for default borders and border-accent-red for errors", () => {
      expect(src.content).toContain("border-border");
      expect(src.content).toContain("border-accent-red");
    });

    it("uses text-accent-red for error messages", () => {
      expect(src.content).toContain("text-accent-red");
    });

    it("uses bg-surface for input/select backgrounds", () => {
      expect(src.content).toContain("bg-surface");
    });

    it("uses bg-surface-muted for inactive label buttons", () => {
      expect(src.content).toContain("bg-surface-muted");
    });

    it("uses ps-4 (logical) for error text indentation", () => {
      expect(src.content).toContain("ps-4");
    });
  });

  // ---------------------------------------------------------------------------
  // Address card — address-card.tsx
  // ---------------------------------------------------------------------------
  describe("Address card — SHOP.CO token classes", () => {
    const src = sprint14Sources.find((s) => s.name === "address-card.tsx")!;

    it("imports icons from lucide-react", () => {
      expect(src.content).toMatch(/from ["']lucide-react["']/);
      expect(src.content).toContain("Pencil");
      expect(src.content).toContain("Trash2");
      expect(src.content).toContain("Star");
      expect(src.content).toContain("Home");
      expect(src.content).toContain("Briefcase");
      expect(src.content).toContain("MapPin");
    });

    it("uses rounded-pill for default badge", () => {
      expect(src.content).toContain("rounded-pill");
    });

    it("uses rounded-lg for card container and action buttons", () => {
      expect(src.content).toContain("rounded-lg");
    });

    it("uses text-body-sm, text-body-md, text-body-xs typography tokens", () => {
      expect(src.content).toContain("text-body-sm");
      expect(src.content).toContain("text-body-md");
      expect(src.content).toContain("text-body-xs");
    });

    it("uses text-primary and text-primary-muted for text hierarchy", () => {
      expect(src.content).toContain("text-primary");
      expect(src.content).toContain("text-primary-muted");
    });

    it("uses bg-primary text-on-primary for default badge", () => {
      expect(src.content).toContain("bg-primary");
      expect(src.content).toContain("text-on-primary");
    });

    it("uses border-border for card borders and dividers", () => {
      expect(src.content).toContain("border-border");
    });

    it("uses border-primary for active/default card highlight", () => {
      expect(src.content).toContain("border-primary");
    });

    it("uses text-accent-red for delete button", () => {
      expect(src.content).toContain("text-accent-red");
    });

    it("uses ms-auto (logical) for set-default button alignment", () => {
      expect(src.content).toContain("ms-auto");
    });

    it("uses border-s-2 (logical) for default card start-border", () => {
      expect(src.content).toContain("border-s-2");
    });
  });

  // ---------------------------------------------------------------------------
  // Address form modal — address-form-modal.tsx
  // ---------------------------------------------------------------------------
  describe("Address form modal — SHOP.CO token classes", () => {
    const src = sprint14Sources.find((s) => s.name === "address-form-modal.tsx")!;

    it("imports X icon from lucide-react", () => {
      expect(src.content).toMatch(/from ["']lucide-react["']/);
      expect(src.content).toContain("X");
    });

    it("uses font-heading for modal title", () => {
      expect(src.content).toContain("font-heading");
    });

    it("uses text-heading-md for modal title size", () => {
      expect(src.content).toContain("text-heading-md");
    });

    it("uses bg-surface for modal background", () => {
      expect(src.content).toContain("bg-surface");
    });

    it("uses border-border for header divider", () => {
      expect(src.content).toContain("border-border");
    });

    it("uses rounded-lg for modal container and close button", () => {
      expect(src.content).toContain("rounded-lg");
    });

    it("uses text-primary for title and text-primary-muted for close icon", () => {
      expect(src.content).toContain("text-primary");
      expect(src.content).toContain("text-primary-muted");
    });

    it("uses bg-surface-muted for close button hover state", () => {
      expect(src.content).toContain("bg-surface-muted");
    });

    it("uses bg-black/50 for overlay (compliant opacity modifier)", () => {
      expect(src.content).toContain("bg-black/50");
    });
  });

  // ---------------------------------------------------------------------------
  // Address book page — addresses/page.tsx
  // ---------------------------------------------------------------------------
  describe("Address book page — SHOP.CO token classes", () => {
    const src = sprint14Sources.find((s) => s.name === "addresses-page.tsx")!;

    it("uses design system Button component", () => {
      expect(src.content).toContain('@/components/ui/button');
      expect(src.content).toMatch(/<Button[\s>]/);
    });

    it("imports icons from lucide-react", () => {
      expect(src.content).toMatch(/from ["']lucide-react["']/);
      expect(src.content).toContain("Plus");
      expect(src.content).toContain("MapPin");
    });

    it("uses font-heading for page headings", () => {
      expect(src.content).toContain("font-heading");
    });

    it("uses text-heading-lg and text-heading-md for heading sizes", () => {
      expect(src.content).toContain("text-heading-lg");
      expect(src.content).toContain("text-heading-md");
    });

    it("uses text-body-lg, text-body-md, text-body-xs typography tokens", () => {
      expect(src.content).toContain("text-body-lg");
      expect(src.content).toContain("text-body-md");
      expect(src.content).toContain("text-body-xs");
    });

    it("uses text-primary, text-primary-muted, text-primary-subtle for text hierarchy", () => {
      expect(src.content).toContain("text-primary");
      expect(src.content).toContain("text-primary-muted");
      expect(src.content).toContain("text-primary-subtle");
    });

    it("uses bg-surface-muted for skeleton/loading backgrounds", () => {
      expect(src.content).toContain("bg-surface-muted");
    });

    it("uses bg-surface for dialog background", () => {
      expect(src.content).toContain("bg-surface");
    });

    it("uses border-border for card and skeleton borders", () => {
      expect(src.content).toContain("border-border");
    });

    it("uses rounded-pill for skeleton and delete button", () => {
      expect(src.content).toContain("rounded-pill");
    });

    it("uses rounded-lg for card containers and dialogs", () => {
      expect(src.content).toContain("rounded-lg");
    });

    it("uses bg-accent-red text-on-primary for destructive delete button", () => {
      expect(src.content).toContain("bg-accent-red");
      expect(src.content).toContain("text-on-primary");
    });

    it("uses me-2 (logical) for icon spacing in buttons", () => {
      expect(src.content).toContain("me-2");
    });

    it("uses bg-black/50 for overlay (compliant opacity modifier)", () => {
      expect(src.content).toContain("bg-black/50");
    });
  });

  // ---------------------------------------------------------------------------
  // Coupon input — coupon-input.tsx
  // ---------------------------------------------------------------------------
  describe("Coupon input — SHOP.CO token classes", () => {
    const src = sprint14Sources.find((s) => s.name === "coupon-input.tsx")!;

    it("uses design system Button component", () => {
      expect(src.content).toContain('@/components/ui/button');
      expect(src.content).toMatch(/<Button[\s>]/);
    });

    it("uses design system Input component", () => {
      expect(src.content).toContain('@/components/ui/input');
      expect(src.content).toMatch(/<Input[\s/>]/);
    });

    it("imports icons from lucide-react", () => {
      expect(src.content).toMatch(/from ["']lucide-react["']/);
      expect(src.content).toContain("Tag");
      expect(src.content).toContain("X");
    });

    it("uses bg-surface-muted for applied coupon badge background", () => {
      expect(src.content).toContain("bg-surface-muted");
    });

    it("uses rounded-pill for applied coupon badge", () => {
      expect(src.content).toContain("rounded-pill");
    });

    it("uses rounded-full for remove coupon button", () => {
      expect(src.content).toContain("rounded-full");
    });

    it("uses text-body-sm and text-body-xs typography tokens", () => {
      expect(src.content).toContain("text-body-sm");
      expect(src.content).toContain("text-body-xs");
    });

    it("uses text-primary and text-primary-muted for text hierarchy", () => {
      expect(src.content).toContain("text-primary");
      expect(src.content).toContain("text-primary-muted");
    });

    it("uses text-accent-red for discount and error display", () => {
      expect(src.content).toContain("text-accent-red");
    });

    it("uses hover:bg-black/10 for remove button hover (compliant opacity modifier)", () => {
      expect(src.content).toContain("hover:bg-black/10");
    });

    it("uses ps-4 (logical) for error message indentation", () => {
      expect(src.content).toContain("ps-4");
    });
  });

  // ---------------------------------------------------------------------------
  // Order summary — order-summary.tsx
  // ---------------------------------------------------------------------------
  describe("Order summary — SHOP.CO token classes", () => {
    const src = sprint14Sources.find((s) => s.name === "order-summary.tsx")!;

    it("uses design system Button component", () => {
      expect(src.content).toContain('@/components/ui/button');
      expect(src.content).toMatch(/<Button[\s>]/);
    });

    it("uses font-heading for section heading", () => {
      expect(src.content).toContain("font-heading");
    });

    it("uses text-heading-md for heading size", () => {
      expect(src.content).toContain("text-heading-md");
    });

    it("uses text-body-md and text-body-xl typography tokens", () => {
      expect(src.content).toContain("text-body-md");
      expect(src.content).toContain("text-body-xl");
    });

    it("uses text-primary and text-primary-muted for text hierarchy", () => {
      expect(src.content).toContain("text-primary");
      expect(src.content).toContain("text-primary-muted");
    });

    it("uses text-accent-red for discount amount", () => {
      expect(src.content).toContain("text-accent-red");
    });

    it("uses border-border for card border and horizontal rule", () => {
      expect(src.content).toContain("border-border");
    });

    it("uses rounded-lg for card container", () => {
      expect(src.content).toContain("rounded-lg");
    });

    it("uses Button size='full' for checkout action", () => {
      expect(src.content).toContain('size="full"');
    });
  });

  // ---------------------------------------------------------------------------
  // Sprint 1.4 icon imports per component
  // ---------------------------------------------------------------------------
  describe("Sprint 1.4 — per-component lucide-react icon imports", () => {
    it.each([
      ["profile-layout.tsx", ["User", "MapPin", "Package", "Heart", "Settings"]],
      ["address-form.tsx", ["Home", "Briefcase", "MapPin"]],
      ["address-card.tsx", ["Home", "Briefcase", "MapPin", "Pencil", "Trash2", "Star"]],
      ["address-form-modal.tsx", ["X"]],
      ["addresses-page.tsx", ["Plus", "MapPin"]],
      ["coupon-input.tsx", ["Tag", "X"]],
    ])("%s imports required lucide-react icons: %j", (fileName, expectedIcons) => {
      const src = sprint14Sources.find((s) => s.name === fileName);
      expect(src).toBeDefined();
      for (const icon of expectedIcons) {
        expect(src!.content).toContain(icon);
      }
      expect(src!.content).toMatch(/from ["']lucide-react["']/);
    });
  });

  // ---------------------------------------------------------------------------
  // Sprint 1.4 Button component usage
  // ---------------------------------------------------------------------------
  describe("Sprint 1.4 — Button component usage", () => {
    it.each([
      "profile-page.tsx",
      "address-form.tsx",
      "addresses-page.tsx",
      "coupon-input.tsx",
      "order-summary.tsx",
    ])("%s uses <Button> component from design system", (fileName) => {
      const src = sprint14Sources.find((s) => s.name === fileName);
      expect(src).toBeDefined();
      expect(src!.content).toContain('from "@/components/ui/button"');
      expect(src!.content).toMatch(/<Button[\s>]/);
    });
  });

  // ---------------------------------------------------------------------------
  // Sprint 1.4 Input component usage
  // ---------------------------------------------------------------------------
  describe("Sprint 1.4 — Input component usage", () => {
    it.each([
      "profile-page.tsx",
      "address-form.tsx",
      "coupon-input.tsx",
    ])("%s uses <Input> component from design system", (fileName) => {
      const src = sprint14Sources.find((s) => s.name === fileName);
      expect(src).toBeDefined();
      expect(src!.content).toContain('from "@/components/ui/input"');
      expect(src!.content).toMatch(/<Input[\s/>]/);
    });
  });
});
