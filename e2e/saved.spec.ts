import { test, expect } from '@playwright/test';

// Runs ANYWHERE — /saved is a static shell + client localStorage read, so it needs
// neither Redis nor the database.
test.describe('Saved jobs page', () => {
  test('shows the empty state when nothing is bookmarked', async ({ page }) => {
    await page.goto('/saved');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/saved jobs/i);
    await expect(page.getByText(/no saved jobs yet/i)).toBeVisible();
  });

  test('is marked noindex (personal page)', async ({ page }) => {
    await page.goto('/saved');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});
