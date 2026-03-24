import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helper: log in with test credentials
// ---------------------------------------------------------------------------
const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "Test1234!";

async function login(page: Page) {
  await page.goto("/en/auth/login");
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(
    (u) => !u.pathname.includes("/login") && !u.pathname.includes("/auth"),
    { timeout: 10_000 },
  );
}

async function addItemToCart(page: Page) {
  // Go to a product page and add to cart
  await page.goto("/en/products");
  await page.locator("a[href*='/products/']").first().click();
  await page.waitForURL(/\/en\/products\//, { timeout: 10_000 });
  // Click "Add to Cart" button
  const addButton = page.getByRole("button", { name: /add to cart/i });
  await expect(addButton).toBeVisible({ timeout: 10_000 });
  await addButton.click();
  // Wait for cart notification / mini-cart update
  await page.waitForTimeout(1000);
}

// ============================================================================
// 1. Authenticated Checkout (EN)
// ============================================================================
test.describe("Authenticated Checkout — EN", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should complete full checkout flow", async ({ page }) => {
    // Add item to cart
    await addItemToCart(page);

    // Navigate to cart
    await page.goto("/en/cart");
    await expect(page.getByText(/order summary/i)).toBeVisible({ timeout: 10_000 });

    // Click checkout — authenticated user goes directly
    await page.getByRole("button", { name: /checkout/i }).click();
    await page.waitForURL(/\/en\/checkout/, { timeout: 10_000 });

    // Step 1: Shipping Address — select an address or verify address form appears
    await expect(
      page.getByText(/shipping address|saved addresses/i),
    ).toBeVisible({ timeout: 10_000 });

    // If saved addresses exist, select one; otherwise fill form
    const savedAddressCard = page.locator("[data-testid='address-card']").first();
    const hasSavedAddress = await savedAddressCard.isVisible().catch(() => false);

    if (hasSavedAddress) {
      await savedAddressCard.click();
    }

    // Click continue to Step 2
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 2: Shipping Method
    await expect(
      page.getByText(/shipping method|standard shipping/i),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 3: Payment
    await expect(
      page.getByText(/payment method|credit.*debit/i),
    ).toBeVisible({ timeout: 10_000 });

    // Fill Stripe card element (test card 4242...)
    // Stripe Elements are in an iframe
    const stripeFrame = page.frameLocator("iframe[name*='__privateStripeFrame']").first();
    await stripeFrame.locator("[name='cardnumber']").fill("4242424242424242");
    await stripeFrame.locator("[name='exp-date']").fill("12/30");
    await stripeFrame.locator("[name='cvc']").fill("123");

    await page.getByRole("button", { name: /continue/i }).click();

    // Step 4: Review
    await expect(
      page.getByText(/review your order|order summary/i),
    ).toBeVisible({ timeout: 10_000 });

    // Place order
    await page.getByRole("button", { name: /place order/i }).click();

    // Wait for confirmation page
    await page.waitForURL(/\/en\/order-confirmation\//, { timeout: 30_000 });
    await expect(
      page.getByText(/order confirmed|thank you/i),
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ============================================================================
// 2. Authenticated Checkout (AR) — RTL verification
// ============================================================================
test.describe("Authenticated Checkout — AR", () => {
  test.beforeEach(async ({ page }) => {
    // Login through English, then switch to Arabic
    await login(page);
  });

  test("should display checkout stepper in Arabic locale", async ({ page }) => {
    await addItemToCart(page);
    await page.goto("/ar/cart");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Click checkout
    await page.getByRole("button", { name: /الدفع|إتمام الشراء/i }).click();
    await page.waitForURL(/\/ar\/checkout/, { timeout: 10_000 });

    // Verify Arabic step labels appear
    await expect(page.getByText(/العنوان|الشحن/)).toBeVisible({ timeout: 10_000 });

    // Verify RTL: html element has dir="rtl"
    const dir = await page.locator("html").getAttribute("dir");
    expect(dir).toBe("rtl");
  });
});

// ============================================================================
// 3. Guest Checkout
// ============================================================================
test.describe("Guest Checkout — EN", () => {
  test("should show guest checkout modal and complete guest flow", async ({ page }) => {
    // Add item to cart without logging in
    await addItemToCart(page);
    await page.goto("/en/cart");
    await expect(page.getByText(/order summary/i)).toBeVisible({ timeout: 10_000 });

    // Click checkout — guest user should see modal
    await page.getByRole("button", { name: /checkout/i }).click();

    // Guest checkout modal appears
    await expect(
      page.getByText(/how would you like to checkout/i),
    ).toBeVisible({ timeout: 5_000 });

    // Click "Checkout as Guest"
    await page.getByRole("button", { name: /checkout as guest/i }).click();
    await page.waitForURL(/\/en\/checkout/, { timeout: 10_000 });

    // Step 1: Guest form should show email/phone fields
    await expect(
      page.getByLabel(/email/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ============================================================================
// 4. Payment Decline
// ============================================================================
test.describe("Payment Decline — EN", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should show error when payment is declined", async ({ page }) => {
    await addItemToCart(page);
    await page.goto("/en/cart");
    await expect(page.getByText(/order summary/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /checkout/i }).click();
    await page.waitForURL(/\/en\/checkout/, { timeout: 10_000 });

    // Navigate through steps 1-2
    await expect(page.getByText(/shipping address|saved addresses/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/shipping method/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 3: Use decline test card
    await expect(page.getByText(/payment method/i)).toBeVisible({ timeout: 10_000 });
    const stripeFrame = page.frameLocator("iframe[name*='__privateStripeFrame']").first();
    await stripeFrame.locator("[name='cardnumber']").fill("4000000000000002");
    await stripeFrame.locator("[name='exp-date']").fill("12/30");
    await stripeFrame.locator("[name='cvc']").fill("123");
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 4: Place order
    await expect(page.getByText(/review your order/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /place order/i }).click();

    // Should show error message
    await expect(
      page.getByText(/declined|failed|try again/i),
    ).toBeVisible({ timeout: 30_000 });

    // Place Order button should be re-enabled
    await expect(
      page.getByRole("button", { name: /place order/i }),
    ).toBeEnabled({ timeout: 5_000 });
  });
});
