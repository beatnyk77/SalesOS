import { test, expect } from '@playwright/test';

test.describe('Proposal Flow', () => {
  test('should load the proposals page', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL || 'test@salesos.io';
    const password = process.env.TEST_USER_PASSWORD || 'password123';

    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to proposals
    await page.goto('/dashboard/proposals');
    
    // Check if the page loaded
    await expect(page.getByRole('heading', { name: /Proposal|Draft/i })).toBeVisible();
  });
});
