import { test, expect } from '@playwright/test';

// /jobs runs a search/list query (Redis + DB). Skip locally unless E2E_FULL=1.
const NEEDS_DATA = !process.env.CI && !process.env.E2E_FULL;

test.describe('Job search', () => {
  test.skip(NEEDS_DATA, 'Requires Redis-backed data — run in CI or with E2E_FULL=1 + local redis');

  test('searching by keyword updates the query string', async ({ page }) => {
    await page.goto('/jobs');
    const input = page.getByPlaceholder(/job title/i);
    await input.fill('Driver');
    await input.press('Enter');
    await expect(page).toHaveURL(/[?&]q=Driver/i);
  });

  test('the jobs listing renders job cards', async ({ page }) => {
    await page.goto('/jobs');
    // Job detail links prove the listing hydrated with data.
    await expect(page.locator('a[href*="/jobs/"]').first()).toBeVisible();
  });
});
