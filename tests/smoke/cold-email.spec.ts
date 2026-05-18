import { test, expect } from '@playwright/test';

test.describe('Cold Email Flow', () => {
  test('should load the cold email dashboard', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL || 'test@salesos.io';
    const password = process.env.TEST_USER_PASSWORD || 'password123';

    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to cold emails
    await page.goto('/dashboard/agents/cold-emails');
    
    // Check if the page loaded
    await expect(page.getByRole('heading', { name: /Cold Emails|Outreach/i })).toBeVisible();
    
    // Assert there's some kind of list or empty state
    const carouselOrEmpty = page.locator('.carousel, .empty-state, table, [role="list"]');
    await expect(carouselOrEmpty.first()).toBeVisible();
  });
});
