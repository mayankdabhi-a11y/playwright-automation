import { test } from '@playwright/test';

test.describe('BicBugs - simple search and click', () => {
  test('go to site, search text, if visible click it', async ({ page }) => {
    await page.goto('https://bicbugs.com/', { waitUntil: 'domcontentloaded' });

    // Search for the exact text
    const query = 'Morpho menelaus blue butterfly French Guyana';
    const searchSelectors = [
      'input[name="s"]',
      'input[type="search"]',
      'form[role="search"] input',
      '#woocommerce-product-search-field-0',
    ];

    let inputFilled = false;
    for (const sel of searchSelectors) {
      const input = page.locator(sel).first();
      if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
        await input.fill(query);
        await input.press('Enter');
        inputFilled = true;
        break;
      }
    }

    if (!inputFilled) {
      // Fallback: navigate directly to search results
      await page.goto(`https://bicbugs.com/?s=${encodeURIComponent(query)}`);
    }

    // If the link with the text is visible, click it
    const exactLink = page.getByRole('link', { name: new RegExp(query, 'i') }).first();
    const partialLink = page.locator('a:has-text("Morpho menelaus")').first();

    if (await exactLink.isVisible({ timeout: 4000 }).catch(() => false)) {
      await exactLink.click();
    } else if (await partialLink.isVisible({ timeout: 4000 }).catch(() => false)) {
      await partialLink.click();
    }
    // test over
  });
});

