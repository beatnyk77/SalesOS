import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('should login and redirect to dashboard', async ({ page }) => {
    // Requires test user credentials in env
    const email = process.env.TEST_USER_EMAIL || 'test@salesos.io';
    const password = process.env.TEST_USER_PASSWORD || 'password123';

    await page.goto('/login');
    
    // Fill credentials
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    // Click submit
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify sidebar is visible
    const sidebar = page.locator('nav');
    await expect(sidebar).toBeVisible();
    await expect(page.getByText('SalesOS')).toBeVisible();
  });
});
