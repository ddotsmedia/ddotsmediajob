import { test, expect } from '@playwright/test';

test.describe('Homepage - E2E', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should display save buttons', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const saveButtons = page.locator('button[aria-label*="Save"]');
    await expect(saveButtons.first()).toBeVisible();
  });

  test('should navigate to /saved', async ({ page }) => {
    await page.goto('http://localhost:3000/saved', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/saved/);
  });
});
