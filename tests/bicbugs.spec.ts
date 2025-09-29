import { test, expect } from '@playwright/test';

test.describe('BicBugs - Morpho menelaus blue butterfly French Guyana', () => {
  test('opens product and verifies details', async ({ page }) => {
    // Go to homepage
    await page.goto('https://bicbugs.com/');

    // Accept cookies or dismiss popups if present (best-effort, non-fatal)
    const possibleSelectors = [
      'button:has-text("Accept")',
      'button:has-text("I Accept")',
      'button:has-text("Got it")',
      'text=/accept cookies/i',
    ];
    for (const selector of possibleSelectors) {
      const el = page.locator(selector);
      if (await el.first().isVisible().catch(() => false)) {
        await el.first().click({ timeout: 2000 }).catch(() => {});
        break;
      }
    }

    const productName = 'Morpho menelaus blue butterfly French Guyana';

    // Try homepage direct link first; if not found, use search
    const productLink = page.getByRole('link', { name: new RegExp(`^${productName}$`, 'i') }).first();
    if (await productLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await productLink.click();
    } else {
      // Navigate directly to search results page as a fallback
      const searchUrl = `https://bicbugs.com/?s=${encodeURIComponent('Morpho menelaus')}`;
      await page.goto(searchUrl);

      // Prefer exact match; otherwise click a partial match containing "Morpho menelaus"
      const exactResult = page.getByRole('link', { name: new RegExp(productName, 'i') }).first();
      const gridPartial = page.locator('ul.products li.product a:has-text("Morpho menelaus")').first();
      const anyPartial = page.locator('a:has-text("Morpho menelaus")').first();
      if (await exactResult.isVisible({ timeout: 4000 }).catch(() => false)) {
        await exactResult.click();
      } else if (await gridPartial.isVisible({ timeout: 4000 }).catch(() => false)) {
        await gridPartial.click();
      } else {
        await expect(anyPartial).toBeVisible();
        await anyPartial.click();
      }
    }

    // Wait for product page to load
    await expect(page).toHaveURL(/\/product\//);

    // Verify the product title appears on the page
    const titleLocator = page.locator('h1, h2').filter({ hasText: new RegExp(productName, 'i') });
    await expect(titleLocator.first()).toBeVisible();

    // Optionally verify meta title contains the product name
    await expect(page).toHaveTitle(new RegExp(productName, 'i'));
  });
});

