import { test, expect } from "@playwright/test";

test.describe("Client User Journey", () => {
  test("should login as client and access portal", async ({ page }) => {
    // Navigate to home page
    await page.goto("/");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Find and click login button
    const loginButton = page
      .locator('[data-testid="login-button"], button:has-text("Log In"), a:has-text("Log In")')
      .first();
    await loginButton.click();

    // Wait for login form
    await page.waitForSelector('[data-testid="email-input"], input[type="email"]', {
      timeout: 10000,
    });

    // Fill in demo client credentials
    await page.locator('[data-testid="email-input"], input[type="email"]').fill("client@demo.hive");
    await page.locator('[data-testid="password-input"], input[type="password"]').fill("demo123");

    // Click submit button
    await page.locator('[data-testid="submit-button"], button[type="submit"]').click();

    // Wait for redirect to portal/dashboard
    await page.waitForURL(/\/(portal|dashboard|home)/, { timeout: 15000 });

    // Verify client is logged in - check for user name or dashboard elements
    await expect(page.locator("text=/demo|client|dashboard/i").first()).toBeVisible({
      timeout: 10000,
    });

    // Take screenshot of client portal
    await page.screenshot({ path: "test-results/client-portal.png", fullPage: true });
  });

  test("should browse available therapists", async ({ page }) => {
    // Login as client
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const loginButton = page
      .locator('[data-testid="login-button"], button:has-text("Log In"), a:has-text("Log In")')
      .first();
    await loginButton.click();

    await page.waitForSelector('[data-testid="email-input"], input[type="email"]', {
      timeout: 10000,
    });
    await page.locator('[data-testid="email-input"], input[type="email"]').fill("client@demo.hive");
    await page.locator('[data-testid="password-input"], input[type="password"]').fill("demo123");
    await page.locator('[data-testid="submit-button"], button[type="submit"]').click();

    await page.waitForURL(/\/(portal|dashboard|home)/, { timeout: 15000 });

    // Look for therapist browsing section
    const therapistLink = page
      .locator(
        '[data-testid="browse-therapists"], a:has-text("Therapist"), a:has-text("Find"), button:has-text("Browse")'
      )
      .first();

    if (await therapistLink.isVisible({ timeout: 5000 })) {
      await therapistLink.click();

      // Wait for therapist list to load
      await expect(
        page.locator('[data-testid="therapist-card"], .therapist-card').first()
      ).toBeVisible({ timeout: 10000 });

      // Take screenshot
      await page.screenshot({ path: "test-results/client-browse-therapists.png", fullPage: true });
    }
  });
});
