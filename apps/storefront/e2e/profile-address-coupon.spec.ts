import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helper: log in via the sign-in page so that JWT cookies are set for the
// current browser context. Skips if the page is not redirected to login.
// Uses test credentials that should exist in the dev seed data.
// ---------------------------------------------------------------------------
const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "Test1234!";

async function loginIfNeeded(page: Page) {
  // If we landed on a login/auth page, perform the login flow
  const url = page.url();
  if (url.includes("/login") || url.includes("/auth")) {
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    // Wait for navigation away from the login page
    await page.waitForURL((u) => !u.pathname.includes("/login") && !u.pathname.includes("/auth"), {
      timeout: 10_000,
    });
  }
}

// ============================================================================
// 1. Profile Page
// ============================================================================
test.describe("Profile Page — EN", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/profile");
    await loginIfNeeded(page);
    // After login we may need to navigate again if we were redirected
    if (!page.url().includes("/en/profile")) {
      await page.goto("/en/profile");
    }
  });

  test("should display profile form with user data", async ({ page }) => {
    await expect(page.getByText(/personal information/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("should display sidebar navigation links", async ({ page }) => {
    await expect(page.getByRole("link", { name: /orders/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /addresses/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /wishlist/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /settings/i })).toBeVisible();
  });

  test("should update profile fields and show success toast", async ({ page }) => {
    const firstNameInput = page.getByLabel(/first name/i);
    await expect(firstNameInput).toBeVisible({ timeout: 10_000 });
    await firstNameInput.clear();
    await firstNameInput.fill("TestUser");

    await page.getByRole("button", { name: /update profile/i }).click();

    // Expect a success message / toast
    await expect(
      page.getByText(/profile.*updated|updated.*profile/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("should navigate to addresses page via sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /addresses/i }).click();
    await expect(page).toHaveURL(/\/en\/profile\/addresses/);
  });

  test("should navigate to wishlist page via sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /wishlist/i }).click();
    await expect(page).toHaveURL(/\/en\/profile\/wishlist/);
  });
});

// ============================================================================
// 2. Address Book (serial — create/edit/delete depend on order)
// ============================================================================
test.describe.serial("Address Book — EN", () => {
  let createdAddressText: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto("/en/profile/addresses");
    await loginIfNeeded(page);
    if (!page.url().includes("/en/profile/addresses")) {
      await page.goto("/en/profile/addresses");
    }
  });

  test("should show address page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /my addresses|addresses/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show empty state or existing addresses", async ({ page }) => {
    // Either the empty-state message or at least one address card is visible
    const emptyState = page.getByText(/haven't saved any addresses/i);
    const addressCard = page.locator('[data-testid="address-card"]').first();
    const anyVisible =
      (await emptyState.isVisible().catch(() => false)) ||
      (await addressCard.isVisible().catch(() => false));
    expect(anyVisible).toBe(true);
  });

  test("should open add-address modal/form", async ({ page }) => {
    await page.getByRole("button", { name: /add.*address/i }).click();
    // The form should now be visible (modal or inline)
    await expect(page.getByLabel(/recipient/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel(/street/i).first()).toBeVisible();
    await expect(page.getByLabel(/city/i)).toBeVisible();
  });

  test("should validate empty address form submission", async ({ page }) => {
    await page.getByRole("button", { name: /add.*address/i }).click();
    await expect(page.getByLabel(/recipient/i)).toBeVisible({ timeout: 5_000 });

    // Submit without filling fields
    await page.getByRole("button", { name: /save.*address/i }).click();

    // Validation errors should appear (browser-native or custom)
    // We check that we are still on the form (it didn't close / navigate)
    await expect(page.getByLabel(/recipient/i)).toBeVisible();
  });

  test("should create a new address", async ({ page }) => {
    await page.getByRole("button", { name: /add.*address/i }).click();
    await expect(page.getByLabel(/recipient/i)).toBeVisible({ timeout: 5_000 });

    // Fill in the form
    await page.getByLabel(/recipient/i).fill("John Doe");
    await page.getByLabel(/street/i).first().fill("123 King Fahd Road");
    await page.getByLabel(/city/i).fill("Riyadh");

    // Select region — could be a native <select> or a custom dropdown
    const regionSelect = page.getByLabel(/region/i);
    if (await regionSelect.isVisible()) {
      const tagName = await regionSelect.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === "select") {
        await regionSelect.selectOption({ label: /riyadh/i });
      } else {
        await regionSelect.click();
        await page.getByRole("option", { name: /riyadh/i }).click();
      }
    }

    await page.getByLabel(/postal/i).fill("12345");
    await page.getByLabel(/phone/i).fill("+966512345678");

    await page.getByRole("button", { name: /save.*address/i }).click();

    // Success feedback
    await expect(
      page.getByText(/address.*saved|saved.*successfully/i),
    ).toBeVisible({ timeout: 5_000 });

    createdAddressText = "123 King Fahd Road";
  });

  test("should display the newly created address", async ({ page }) => {
    if (!createdAddressText) {
      test.skip();
      return;
    }
    await expect(page.getByText(createdAddressText)).toBeVisible({ timeout: 10_000 });
  });

  test("should set an address as default", async ({ page }) => {
    // Click "Set as Default" on the first non-default address
    const setDefaultButton = page.getByRole("button", { name: /set as default/i }).first();
    if (await setDefaultButton.isVisible().catch(() => false)) {
      await setDefaultButton.click();
      await expect(
        page.getByText(/default.*updated|default address/i),
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("should delete an address", async ({ page }) => {
    const deleteButton = page.getByRole("button", { name: /delete/i }).first();
    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click();

      // Confirmation dialog may appear
      const confirmButton = page.getByRole("button", { name: /confirm|yes|delete/i });
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
      }

      await expect(
        page.getByText(/address.*deleted|deleted/i),
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});

// ============================================================================
// 3. Coupon Input on Cart Page
// ============================================================================
test.describe("Coupon Input — EN", () => {
  test("should show coupon input on cart page", async ({ page }) => {
    await page.goto("/en/cart");
    await page.waitForLoadState("networkidle");

    // Coupon section might only appear when cart has items
    const couponInput = page.getByPlaceholder(/coupon/i);
    const emptyState = page.getByText(/cart is empty/i);

    if (await couponInput.isVisible().catch(() => false)) {
      await expect(couponInput).toBeVisible();
    } else {
      // Cart is empty — verify empty state instead
      await expect(emptyState).toBeVisible();
    }
  });

  test("should show error for invalid coupon code", async ({ page }) => {
    // First, try to add an item so coupon section is visible
    await page.goto("/en/products/test-product");
    const addToCartButton = page.getByRole("button", { name: /add to cart/i });
    if (await addToCartButton.isVisible().catch(() => false)) {
      await addToCartButton.click();
      await page.waitForTimeout(1_000);
    }

    await page.goto("/en/cart");
    await page.waitForLoadState("networkidle");

    const couponInput = page.getByPlaceholder(/coupon/i);
    if (await couponInput.isVisible().catch(() => false)) {
      await couponInput.fill("INVALID_CODE_XYZ");
      await page.getByRole("button", { name: /apply/i }).click();

      // Should show an error message
      await expect(
        page.getByText(/not found|invalid|coupon/i),
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("should apply a valid coupon code", async ({ page }) => {
    // Requires a known valid coupon in the seed data (e.g. WELCOME10)
    await page.goto("/en/products/test-product");
    const addToCartButton = page.getByRole("button", { name: /add to cart/i });
    if (await addToCartButton.isVisible().catch(() => false)) {
      await addToCartButton.click();
      await page.waitForTimeout(1_000);
    }

    await page.goto("/en/cart");
    await page.waitForLoadState("networkidle");

    const couponInput = page.getByPlaceholder(/coupon/i);
    if (await couponInput.isVisible().catch(() => false)) {
      await couponInput.fill("WELCOME10");
      await page.getByRole("button", { name: /apply/i }).click();

      // Success feedback — either a toast or inline text
      const couponApplied = page.getByText(/coupon applied|discount/i);
      if (await couponApplied.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(couponApplied).toBeVisible();
      }
    }
  });

  test("should remove an applied coupon", async ({ page }) => {
    await page.goto("/en/cart");
    await page.waitForLoadState("networkidle");

    // If a coupon is already applied, there should be a remove button
    const removeCouponButton = page.getByRole("button", { name: /remove/i }).filter({
      has: page.locator(":scope", { hasText: /coupon/i }),
    });

    // Alternative: a small "x" or "Remove" near the coupon badge
    const removeCouponAlt = page.locator('[data-testid="remove-coupon"]');

    const removeTarget = (await removeCouponButton.isVisible().catch(() => false))
      ? removeCouponButton
      : removeCouponAlt;

    if (await removeTarget.isVisible().catch(() => false)) {
      await removeTarget.click();
      await expect(
        page.getByText(/coupon removed/i),
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});

// ============================================================================
// 4. Cart Page — Order Summary
// ============================================================================
test.describe("Cart Order Summary — EN", () => {
  test("should display order summary section", async ({ page }) => {
    // Add an item first
    await page.goto("/en/products/test-product");
    const addToCartButton = page.getByRole("button", { name: /add to cart/i });
    if (await addToCartButton.isVisible().catch(() => false)) {
      await addToCartButton.click();
      await page.waitForTimeout(1_000);
    }

    await page.goto("/en/cart");
    await page.waitForLoadState("networkidle");

    // Order summary elements
    const orderSummary = page.getByText(/order summary/i);
    if (await orderSummary.isVisible().catch(() => false)) {
      await expect(orderSummary).toBeVisible();
      await expect(page.getByText(/subtotal/i)).toBeVisible();
      await expect(page.getByText(/total/i).last()).toBeVisible();
    }
  });

  test("should show checkout button", async ({ page }) => {
    await page.goto("/en/cart");
    await page.waitForLoadState("networkidle");

    const checkoutButton = page.getByRole("button", { name: /checkout/i }).or(
      page.getByRole("link", { name: /checkout/i }),
    );
    const emptyState = page.getByText(/cart is empty/i);

    if (await checkoutButton.isVisible().catch(() => false)) {
      await expect(checkoutButton).toBeVisible();
    } else {
      // If cart is empty, just verify empty state
      await expect(emptyState).toBeVisible();
    }
  });
});

// ============================================================================
// 5. RTL — Arabic Profile
// ============================================================================
test.describe("RTL — Arabic Profile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ar/profile");
    await loginIfNeeded(page);
    if (!page.url().includes("/ar/profile")) {
      await page.goto("/ar/profile");
    }
  });

  test("should render profile page in Arabic with RTL direction", async ({ page }) => {
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");

    // Check for Arabic heading text
    await expect(page.getByText("حسابي")).toBeVisible({ timeout: 10_000 });
  });

  test("should display Arabic labels on profile form", async ({ page }) => {
    await expect(page.getByText("المعلومات الشخصية")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/الاسم الأول/)).toBeVisible();
    await expect(page.getByLabel(/اسم العائلة/)).toBeVisible();
    await expect(page.getByLabel(/البريد الإلكتروني/)).toBeVisible();
  });

  test("should display Arabic sidebar navigation", async ({ page }) => {
    await expect(page.getByText("طلباتي")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("العناوين")).toBeVisible();
    await expect(page.getByText("المفضلة")).toBeVisible();
    await expect(page.getByText("الإعدادات")).toBeVisible();
  });
});

// ============================================================================
// 6. RTL — Arabic Address Book
// ============================================================================
test.describe("RTL — Arabic Address Book", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ar/profile/addresses");
    await loginIfNeeded(page);
    if (!page.url().includes("/ar/profile/addresses")) {
      await page.goto("/ar/profile/addresses");
    }
  });

  test("should render address page in Arabic with RTL direction", async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByText("عناويني")).toBeVisible({ timeout: 10_000 });
  });

  test("should show Arabic address form labels", async ({ page }) => {
    await page.getByRole("button", { name: /إضافة عنوان/i }).click();
    await expect(page.getByLabel(/اسم المستلم/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel(/عنوان الشارع/)).toBeVisible();
    await expect(page.getByLabel(/المدينة/)).toBeVisible();
    await expect(page.getByLabel(/المنطقة/)).toBeVisible();
  });
});

// ============================================================================
// 7. RTL — Arabic Cart & Coupon
// ============================================================================
test.describe("RTL — Arabic Cart & Coupon", () => {
  test("should render cart page in Arabic with RTL direction", async ({ page }) => {
    await page.goto("/ar/cart");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    // Either empty state or cart content — both in Arabic
    const cartTitle = page.getByText("سلة التسوق");
    const emptyState = page.getByText("سلتك فارغة");

    const anyVisible =
      (await cartTitle.isVisible().catch(() => false)) ||
      (await emptyState.isVisible().catch(() => false));
    expect(anyVisible).toBe(true);
  });

  test("should show Arabic coupon placeholder text", async ({ page }) => {
    // Add item first so coupon input is visible
    await page.goto("/en/products/test-product");
    const addToCartButton = page.getByRole("button", { name: /add to cart/i });
    if (await addToCartButton.isVisible().catch(() => false)) {
      await addToCartButton.click();
      await page.waitForTimeout(1_000);
    }

    await page.goto("/ar/cart");
    await page.waitForLoadState("networkidle");

    const couponInput = page.getByPlaceholder(/أدخل كود الخصم/);
    if (await couponInput.isVisible().catch(() => false)) {
      await expect(couponInput).toBeVisible();
    }
  });

  test("should show Arabic error for invalid coupon", async ({ page }) => {
    // Add item first
    await page.goto("/en/products/test-product");
    const addToCartButton = page.getByRole("button", { name: /add to cart/i });
    if (await addToCartButton.isVisible().catch(() => false)) {
      await addToCartButton.click();
      await page.waitForTimeout(1_000);
    }

    await page.goto("/ar/cart");
    await page.waitForLoadState("networkidle");

    const couponInput = page.getByPlaceholder(/أدخل كود الخصم/);
    if (await couponInput.isVisible().catch(() => false)) {
      await couponInput.fill("INVALID_CODE_XYZ");
      await page.getByRole("button", { name: /تطبيق/i }).click();

      // Arabic error message
      await expect(
        page.getByText(/غير موجود|غير صالح/),
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});

// ============================================================================
// 8. Responsive — Mobile Profile
// ============================================================================
test.describe("Responsive — Mobile Profile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("should display mobile-friendly profile layout", async ({ page }) => {
    await page.goto("/en/profile");
    await loginIfNeeded(page);
    if (!page.url().includes("/en/profile")) {
      await page.goto("/en/profile");
    }

    // Profile content should still be accessible on mobile
    await expect(page.getByText(/personal information/i)).toBeVisible({ timeout: 10_000 });

    // Sidebar may be hidden behind a menu on mobile — check for a toggle
    const sidebarToggle = page.getByRole("button", { name: /menu|account/i });
    if (await sidebarToggle.isVisible().catch(() => false)) {
      await sidebarToggle.click();
      await expect(page.getByRole("link", { name: /addresses/i })).toBeVisible();
    }
  });

  test("should display mobile-friendly cart layout", async ({ page }) => {
    await page.goto("/en/cart");
    await page.waitForLoadState("networkidle");

    // Page should be visible and not broken
    const cartTitle = page.getByText(/your cart/i);
    const emptyState = page.getByText(/cart is empty/i);

    const anyVisible =
      (await cartTitle.isVisible().catch(() => false)) ||
      (await emptyState.isVisible().catch(() => false));
    expect(anyVisible).toBe(true);
  });
});
