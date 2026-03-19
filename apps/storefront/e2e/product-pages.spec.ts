import { test, expect } from "@playwright/test";

test.describe("Product Pages — EN", () => {
  test("PLP renders product grid", async ({ page }) => {
    await page.goto("/en/products");
    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
    await expect(page).toHaveScreenshot("plp-en.png", { fullPage: true });
  });

  test("PLP with filters applied", async ({ page }) => {
    await page.goto("/en/products?sortBy=price_asc&inStock=true");
    await expect(page).toHaveScreenshot("plp-filtered-en.png", { fullPage: true });
  });

  test("PLP empty state", async ({ page }) => {
    await page.goto("/en/products?priceMin=999999");
    await expect(page).toHaveScreenshot("plp-empty-en.png", { fullPage: true });
  });

  test("PDP renders product detail", async ({ page }) => {
    await page.goto("/en/products/test-product"); // requires seed data
    await expect(page).toHaveScreenshot("pdp-en.png", { fullPage: true });
  });
});

test.describe("Product Pages — AR (RTL)", () => {
  test("PLP renders product grid in RTL", async ({ page }) => {
    await page.goto("/ar/products");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page).toHaveScreenshot("plp-ar.png", { fullPage: true });
  });

  test("PDP renders product detail in RTL", async ({ page }) => {
    await page.goto("/ar/products/test-product");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page).toHaveScreenshot("pdp-ar.png", { fullPage: true });
  });
});

test.describe("Category Navigation", () => {
  test("Desktop mega menu opens", async ({ page }) => {
    await page.goto("/en/products");
    await page.click('[data-testid="categories-trigger"]');
    await expect(page.locator('[data-testid="mega-menu"]')).toBeVisible();
    await expect(page).toHaveScreenshot("mega-menu-en.png");
  });
});
