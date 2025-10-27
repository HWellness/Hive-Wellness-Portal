import { test, expect } from "@playwright/test";

test.describe("Therapist User Journey", () => {
  test("should login as therapist and access dashboard", async ({ page }) => {
    // Navigate to therapist login
    await page.goto("/therapist-login");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Fill in demo therapist credentials
    await page
      .locator('[data-testid="email-input"], input[type="email"]')
      .fill("therapist@demo.hive");
    await page.locator('[data-testid="password-input"], input[type="password"]').fill("demo123");

    // Click submit button
    await page.locator('[data-testid="submit-button"], button[type="submit"]').click();

    // Wait for redirect to therapist portal
    await page.waitForURL(/\/(portal|dashboard|therapist)/, { timeout: 15000 });

    // Verify therapist is logged in
    await expect(page.locator("text=/thompson|therapist|dashboard/i").first()).toBeVisible({
      timeout: 10000,
    });

    // Take screenshot of therapist portal
    await page.screenshot({ path: "test-results/therapist-portal.png", fullPage: true });
  });

  test("should access calendar and appointments", async ({ page }) => {
    // Login as therapist
    await page.goto("/therapist-login");
    await page.waitForLoadState("networkidle");

    await page
      .locator('[data-testid="email-input"], input[type="email"]')
      .fill("therapist@demo.hive");
    await page.locator('[data-testid="password-input"], input[type="password"]').fill("demo123");
    await page.locator('[data-testid="submit-button"], button[type="submit"]').click();

    await page.waitForURL(/\/(portal|dashboard|therapist)/, { timeout: 15000 });

    // Look for calendar/appointments section
    const calendarLink = page
      .locator(
        '[data-testid="calendar-link"], a:has-text("Calendar"), a:has-text("Appointment"), button:has-text("Schedule")'
      )
      .first();

    if (await calendarLink.isVisible({ timeout: 5000 })) {
      await calendarLink.click();

      // Wait for calendar to load
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({ path: "test-results/therapist-calendar.png", fullPage: true });
    }
  });
});
