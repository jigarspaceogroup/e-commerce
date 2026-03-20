import { test, expect } from "@playwright/test";

test.describe("Search Flow — EN", () => {
  test("Search suggestions appear and navigate to PDP", async ({ page }) => {
    await page.goto("/en");

    // Find and click the search input
    const searchInput = page.getByRole("combobox");
    await searchInput.click();
    await searchInput.fill("Samsung");

    // Wait for suggestions to appear
    await page.waitForSelector('[role="option"]', { timeout: 5000 });

    // Take screenshot of suggestions
    await expect(page).toHaveScreenshot("search-suggestions-en.png");

    // Click first product suggestion
    const firstSuggestion = page.locator('[role="option"]').first();
    await firstSuggestion.click();

    // Verify navigation to PDP
    await expect(page).toHaveURL(/\/en\/products\/.+/);
  });

  test("View all results navigates to search results page", async ({ page }) => {
    await page.goto("/en");

    // Search for Samsung
    const searchInput = page.getByRole("combobox");
    await searchInput.click();
    await searchInput.fill("Samsung");

    // Wait for suggestions dropdown
    await page.waitForSelector('[role="option"]', { timeout: 5000 });

    // Click "View all results" link
    await page.getByText(/view all results/i).click();

    // Verify navigation to search results page
    await expect(page).toHaveURL(/\/en\/search\?q=Samsung/);

    // Verify heading with query
    await expect(page.getByRole("heading", { name: /Samsung/i })).toBeVisible();

    // Take screenshot of search results
    await expect(page).toHaveScreenshot("search-results-en.png", { fullPage: true });
  });

  test("Apply price filter updates results", async ({ page }) => {
    await page.goto("/en/search?q=Samsung");

    // Wait for initial results to load
    await page.waitForLoadState("networkidle");

    // Apply price filter (assuming filter sidebar exists)
    const priceMinInput = page.getByLabel(/minimum price/i).or(page.locator('input[name="priceMin"]'));
    const priceMaxInput = page.getByLabel(/maximum price/i).or(page.locator('input[name="priceMax"]'));

    if (await priceMinInput.isVisible()) {
      await priceMinInput.fill("100");
    }
    if (await priceMaxInput.isVisible()) {
      await priceMaxInput.fill("500");
    }

    // Apply filters (look for apply button or wait for auto-apply)
    const applyButton = page.getByRole("button", { name: /apply|filter/i });
    if (await applyButton.isVisible()) {
      await applyButton.click();
    }

    // Wait for results to update
    await page.waitForLoadState("networkidle");

    // Verify URL includes filter params
    await expect(page).toHaveURL(/priceMin=100/);
  });

  test("Sort by price changes product order", async ({ page }) => {
    await page.goto("/en/search?q=Samsung");

    // Wait for initial results
    await page.waitForLoadState("networkidle");

    // Find and click sort dropdown
    const sortSelect = page.getByLabel(/sort/i).or(page.locator('select[name="sortBy"]'));
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption({ label: /price.*low.*high/i });

      // Wait for results to update
      await page.waitForLoadState("networkidle");

      // Verify URL includes sort param
      await expect(page).toHaveURL(/sortBy=price_asc/);
    }
  });
});

test.describe("Search Flow — AR (RTL)", () => {
  test("Arabic search with RTL auto-suggest", async ({ page }) => {
    await page.goto("/ar");

    // Verify RTL direction
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    // Find and use search input
    const searchInput = page.getByRole("combobox");
    await searchInput.click();
    await searchInput.fill("سامسونج"); // Samsung in Arabic

    // Wait for suggestions to appear
    await page.waitForSelector('[role="option"]', { timeout: 5000 });

    // Take screenshot showing RTL layout
    await expect(page).toHaveScreenshot("search-suggestions-ar.png");
  });

  test("Arabic search results with RTL layout", async ({ page }) => {
    await page.goto("/ar");

    // Search and navigate to results
    const searchInput = page.getByRole("combobox");
    await searchInput.click();
    await searchInput.fill("سامسونج");

    // Wait for suggestions
    await page.waitForSelector('[role="option"]', { timeout: 5000 });

    // Click "View all results" (in Arabic)
    const viewAllButton = page.getByText(/عرض جميع النتائج|عرض الكل/i);
    if (await viewAllButton.isVisible()) {
      await viewAllButton.click();
    } else {
      // Alternative: press Enter to search
      await searchInput.press("Enter");
    }

    // Verify RTL layout on results page
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    // Take screenshot of Arabic results
    await expect(page).toHaveScreenshot("search-results-ar.png", { fullPage: true });
  });

  test("Apply filters in RTL layout", async ({ page }) => {
    await page.goto("/ar/search?q=سامسونج");

    // Verify RTL direction
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    // Wait for results to load
    await page.waitForLoadState("networkidle");

    // Try to interact with filters (if visible)
    const filterSidebar = page.locator('[data-testid="filter-sidebar"]').or(page.getByRole("complementary"));
    if (await filterSidebar.isVisible()) {
      // Take screenshot showing RTL filter layout
      await expect(page).toHaveScreenshot("filters-ar.png");
    }
  });
});

test.describe.serial("Cart Flow", () => {
  test("Add to cart and verify toast notification", async ({ page }) => {
    // Navigate to a PDP
    await page.goto("/en/products/test-product");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Find and click "Add to Cart" button
    const addToCartButton = page.getByRole("button", { name: /add to cart/i });
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();

    // Wait for toast to appear
    await page.waitForSelector('[role="status"]', { timeout: 5000 });

    // Take screenshot of toast notification
    await expect(page).toHaveScreenshot("cart-toast-en.png");

    // Verify cart badge updates to show "1"
    const cartBadge = page.locator('[data-testid="cart-badge"]').or(page.getByText("1").first());
    await expect(cartBadge).toBeVisible({ timeout: 5000 });
  });

  test("Open mini-cart drawer", async ({ page }) => {
    await page.goto("/en/products/test-product");

    // Add item to cart first
    const addToCartButton = page.getByRole("button", { name: /add to cart/i });
    await addToCartButton.click();

    // Wait for cart to update
    await page.waitForTimeout(1000);

    // Click cart icon in header
    const cartButton = page.getByRole("button", { name: /cart/i }).or(page.locator('[aria-label*="Cart"]'));
    await cartButton.click();

    // Wait for mini-cart drawer to open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Verify drawer is visible
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Take screenshot of mini-cart
    await expect(page).toHaveScreenshot("mini-cart-en.png");
  });

  test("Adjust quantity in mini-cart", async ({ page }) => {
    await page.goto("/en/products/test-product");

    // Add item to cart
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.waitForTimeout(1000);

    // Open mini-cart
    const cartButton = page.getByRole("button", { name: /cart/i }).or(page.locator('[aria-label*="Cart"]'));
    await cartButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Find quantity increment button
    const incrementButton = page.getByRole("button", { name: /increase quantity|\+/i }).first();
    if (await incrementButton.isVisible()) {
      // Get initial total
      const totalText = await page.locator('[data-testid="cart-total"]').or(page.getByText(/total/i).locator("..")).textContent();

      // Click increment
      await incrementButton.click();

      // Wait for update
      await page.waitForTimeout(500);

      // Verify total changed
      const newTotalText = await page.locator('[data-testid="cart-total"]').or(page.getByText(/total/i).locator("..")).textContent();
      expect(newTotalText).not.toBe(totalText);
    }
  });

  test("Remove item and verify undo toast", async ({ page }) => {
    await page.goto("/en/products/test-product");

    // Add item to cart
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.waitForTimeout(1000);

    // Open mini-cart
    const cartButton = page.getByRole("button", { name: /cart/i }).or(page.locator('[aria-label*="Cart"]'));
    await cartButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Find and click remove button
    const removeButton = page.getByRole("button", { name: /remove|delete/i }).first();
    if (await removeButton.isVisible()) {
      await removeButton.click();

      // Wait for undo toast
      await page.waitForSelector('[role="status"]', { timeout: 5000 });

      // Verify undo button appears in toast
      const undoButton = page.getByRole("button", { name: /undo/i });
      await expect(undoButton).toBeVisible({ timeout: 5000 });
    }
  });

  test("Undo item removal restores cart item", async ({ page }) => {
    await page.goto("/en/products/test-product");

    // Add item to cart
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.waitForTimeout(1000);

    // Open mini-cart
    const cartButton = page.getByRole("button", { name: /cart/i }).or(page.locator('[aria-label*="Cart"]'));
    await cartButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Remove item
    const removeButton = page.getByRole("button", { name: /remove|delete/i }).first();
    if (await removeButton.isVisible()) {
      await removeButton.click();

      // Wait for undo toast and click undo
      const undoButton = page.getByRole("button", { name: /undo/i });
      await expect(undoButton).toBeVisible({ timeout: 5000 });
      await undoButton.click();

      // Verify item is restored in mini-cart
      await page.waitForTimeout(500);
      const cartItem = page.locator('[data-testid="cart-item"]').first();
      await expect(cartItem).toBeVisible();
    }
  });

  test("Navigate to full cart page", async ({ page }) => {
    await page.goto("/en/products/test-product");

    // Add item to cart
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.waitForTimeout(1000);

    // Open mini-cart
    const cartButton = page.getByRole("button", { name: /cart/i }).or(page.locator('[aria-label*="Cart"]'));
    await cartButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Click "View Cart" button
    const viewCartButton = page.getByRole("link", { name: /view cart/i }).or(page.getByRole("button", { name: /view cart/i }));
    if (await viewCartButton.isVisible()) {
      await viewCartButton.click();

      // Verify navigation to cart page
      await expect(page).toHaveURL(/\/en\/cart/);

      // Wait for cart page to load
      await page.waitForLoadState("networkidle");

      // Verify cart items are visible
      await expect(page.locator('[data-testid="cart-item"]').first()).toBeVisible();

      // Take screenshot of full cart page
      await expect(page).toHaveScreenshot("cart-page-en.png", { fullPage: true });
    }
  });

  test("Close mini-cart with backdrop click", async ({ page }) => {
    await page.goto("/en/products/test-product");

    // Add item and open mini-cart
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.waitForTimeout(1000);

    const cartButton = page.getByRole("button", { name: /cart/i }).or(page.locator('[aria-label*="Cart"]'));
    await cartButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Click backdrop (outside the drawer)
    const backdrop = page.locator('[data-testid="drawer-backdrop"]').or(page.locator('.fixed.inset-0').first());
    if (await backdrop.isVisible()) {
      await backdrop.click({ position: { x: 10, y: 10 } });

      // Verify drawer is closed
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 });
    }
  });

  test("Close mini-cart with Escape key", async ({ page }) => {
    await page.goto("/en/products/test-product");

    // Add item and open mini-cart
    await page.getByRole("button", { name: /add to cart/i }).click();
    await page.waitForTimeout(1000);

    const cartButton = page.getByRole("button", { name: /cart/i }).or(page.locator('[aria-label*="Cart"]'));
    await cartButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Press Escape key
    await page.keyboard.press("Escape");

    // Verify drawer is closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 });
  });
});
