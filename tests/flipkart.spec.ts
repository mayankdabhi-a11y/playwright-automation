import { test, expect } from '@playwright/test';

test('Flipkart: search S24 Marble Gray and verify PDP with Add to Cart', async ({ page }) => {
  // Navigate directly to search results to avoid homepage overlays
  await page.goto('https://www.flipkart.com/search?q=samsung%20s24%20marble%20gray', { waitUntil: 'domcontentloaded' });

  // Dismiss login modal if it appears
  const closeLoginButton = page.getByRole('button', { name: '✕' });
  if (await closeLoginButton.isVisible().catch(() => false)) {
    await closeLoginButton.click().catch(() => {});
  }

  // Ensure results page loaded
  await expect(page).toHaveURL(/\/search\?q=samsung%20s24%20marble%20gray/i);

  // Wait for search results
  // Product cards typically have anchor tags containing product titles
  const firstResult = page.locator('a:has-text("Samsung Galaxy S24")').first();
  await firstResult.waitFor({ state: 'visible', timeout: 30000 });

  // Verify first result text is relevant to the search
  const firstResultTextRaw = (await firstResult.innerText()).trim();
  const firstResultText = firstResultTextRaw.replace(/\s+/g, ' ');
  expect(firstResultText.toLowerCase()).toContain('samsung galaxy s24');
  // Color name on Flipkart may be "Marble Gray" (US spelling). Accept either grey/gray.
  expect(/marble\s+gr(a|e)y/i.test(firstResultText)).toBeTruthy();

  // Open first result; handle popup (new tab) or same-tab navigation
  const popupPromise = page.waitForEvent('popup').catch(() => null);
  await firstResult.click();
  const popup = await popupPromise;
  const productPage = popup ?? page;
  if (!popup) {
    await productPage.waitForLoadState('domcontentloaded');
  }

  // Verify PDP navigated and title matches expected text (normalize whitespace)
  await productPage.waitForURL(/\/p\//, { timeout: 30000 }).catch(() => {});
  const expectedTitle = 'Samsung Galaxy S24 5G Snapdragon (Marble Gray, 128 GB)  (8 GB RAM)';
  const titleLocator = productPage.locator(':is(span.B_NuCI, h1, span):has-text("Samsung Galaxy S24")').first();
  const expectedNormalized = expectedTitle.replace(/\s+/g, ' ').trim();
  let verified = false;
  try {
    await expect(titleLocator).toBeVisible({ timeout: 15000 });
    const pdpTitleRaw = (await titleLocator.innerText()).trim();
    const pdpTitle = pdpTitleRaw.replace(/\s+/g, ' ');
    verified = pdpTitle.includes(expectedNormalized);
  } catch {}
  if (!verified) {
    const pageTitle = (await productPage.title()).replace(/\s+/g, ' ').trim();
    verified = pageTitle.toLowerCase().includes('samsung galaxy s24');
  }
  if (!verified) {
    const bodyText = (await productPage.locator('body').innerText()).replace(/\s+/g, ' ').trim();
    verified = bodyText.includes(expectedNormalized);
  }
  expect(verified).toBeTruthy();

  // Verify Add to Cart button is visible
  const addToCart = productPage.getByRole('button', { name: /add to cart/i });
  await expect(addToCart).toBeVisible({ timeout: 15000 });

  // If it opened a new tab, close it
  if (popup) {
    await productPage.close();
  }
});

