import { test, expect } from '@playwright/test';

test.describe('Admin User Journey', () => {
  test('should login as admin and access dashboard', async ({ page }) => {
    // Navigate to home page (admins can login from main page)
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find and click login button
    const loginButton = page.locator('[data-testid="login-button"], button:has-text("Log In"), a:has-text("Log In")').first();
    await loginButton.click();
    
    // Wait for login form
    await page.waitForSelector('[data-testid="email-input"], input[type="email"]', { timeout: 10000 });
    
    // Fill in demo admin credentials
    await page.locator('[data-testid="email-input"], input[type="email"]').fill('admin@demo.hive');
    await page.locator('[data-testid="password-input"], input[type="password"]').fill('demo123');
    
    // Click submit button
    await page.locator('[data-testid="submit-button"], button[type="submit"]').click();
    
    // Wait for redirect to admin portal
    await page.waitForURL(/\/(portal|dashboard|admin|home)/, { timeout: 15000 });
    
    // Verify admin is logged in
    await expect(page.locator('text=/admin|dashboard/i').first()).toBeVisible({ timeout: 10000 });
    
    // Take screenshot of admin portal
    await page.screenshot({ path: 'test-results/admin-portal.png', fullPage: true });
  });

  test('should access user management features', async ({ page }) => {
    // Login as admin
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loginButton = page.locator('[data-testid="login-button"], button:has-text("Log In"), a:has-text("Log In")').first();
    await loginButton.click();
    
    await page.waitForSelector('[data-testid="email-input"], input[type="email"]', { timeout: 10000 });
    await page.locator('[data-testid="email-input"], input[type="email"]').fill('admin@demo.hive');
    await page.locator('[data-testid="password-input"], input[type="password"]').fill('demo123');
    await page.locator('[data-testid="submit-button"], button[type="submit"]').click();
    
    await page.waitForURL(/\/(portal|dashboard|admin|home)/, { timeout: 15000 });
    
    // Look for user management section
    const userMgmtLink = page.locator('[data-testid="user-management"], a:has-text("User"), a:has-text("Manage"), button:has-text("Users")').first();
    
    if (await userMgmtLink.isVisible({ timeout: 5000 })) {
      await userMgmtLink.click();
      
      // Wait for user list to load
      await page.waitForTimeout(2000);
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/admin-user-management.png', fullPage: true });
    }
  });
});
