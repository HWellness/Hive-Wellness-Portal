import { test, expect } from '@playwright/test';

test.describe('Public Chatbot Widget', () => {
  test('should load chatbot widget and respond to messages', async ({ page }) => {
    // Navigate to the chatbot page
    await page.goto('/chatbot-widget');
    
    // Wait for chatbot widget to load
    await expect(page.locator('[data-testid="chatbot-container"]')).toBeVisible({ timeout: 10000 });
    
    // Check that the chatbot header is visible
    await expect(page.locator('text=Hive Wellness Assistant')).toBeVisible();
    
    // Type a message in the chatbot input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Hello, I need help finding a therapist');
    
    // Send the message
    await page.locator('[data-testid="send-message"]').click();
    
    // Wait for chatbot response
    await expect(page.locator('[data-testid="chat-message"]').last()).toBeVisible({ timeout: 15000 });
    
    // Verify that a response was received
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages).toHaveCount(2); // User message + bot response
    
    // Take a screenshot for the report
    await page.screenshot({ path: 'test-results/chatbot-interaction.png', fullPage: true });
  });

  test('should display privacy disclaimer', async ({ page }) => {
    await page.goto('/chatbot-widget');
    
    // Check for privacy disclaimer
    await expect(page.locator('text=/privacy|confidential|disclaimer/i').first()).toBeVisible({ timeout: 10000 });
  });
});
