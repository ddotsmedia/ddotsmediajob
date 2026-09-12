import { test, expect } from '@playwright/test';

// The homepage server-renders featured/recent/stats, which need Redis (cache) +
// the DB. Skip locally unless E2E_FULL=1 (with a local redis) — always runs in CI.
const NEEDS_DATA = !process.env.CI && !process.env.E2E_FULL;

test.describe('Homepage', () => {
  test.skip(NEEDS_DATA, 'Requires Redis-backed data — run in CI or with E2E_FULL=1 + local redis');

  test('hero shows the heading and search input', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/find your next job/i);
    // Real placeholder — NOT "Search" (the original spec's selector was wrong).
    await expect(page.getByPlaceholder(/job title/i)).toBeVisible();
  });

  test('shows the Latest Jobs section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /latest jobs/i })).toBeVisible();
  });

  test('saving a job reveals the header saved counter', async ({ page }) => {
    await page.goto('/');
    // Save button is icon-only; identify it by its aria-label ("Save <title>").
    await page.getByRole('button', { name: /^Save / }).first().click();
    await expect(page.getByLabel(/saved job/i)).toBeVisible();
  });

  test('navigates to the /saved page', async ({ page }) => {
    await page.goto('/saved');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/saved jobs/i);
  });
});
