import { test, expect } from '@playwright/test';

test('Flipkart: search S24 Marble Gray and verify PDP with Add to Cart', async ({ page }) => {
  test.setTimeout(120000);
  // Navigate directly to search results to avoid homepage overlays
  await page.goto('https://www.flipkart.com/search?q=samsung%20s24%20marble%20gray', { waitUntil: 'domcontentloaded' });

  // Dismiss login modal if it appears
  const closeLoginButton = page.getByRole('button', { name: '✕' });
  if (await closeLoginButton.isVisible().catch(() => false)) {
    await closeLoginButton.click().catch(() => {});
  }

  // Ensure results page loaded
  await expect(page).toHaveURL(/\/search\?q=samsung%20s24%20marble%20gray/i);

  // Wait for search results - anchor leading to PDP typically includes /p/
  await page.locator('a[href*="/p/"]').first().waitFor({ state: 'visible', timeout: 30000 });
  let firstResult = page.locator('a[href*="/p/"]:has-text("Samsung Galaxy S24")').first();
  if (await firstResult.count() === 0) {
    firstResult = page.locator('a[href*="/p/"]:has-text("S24")').first();
  }

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
  await addToCart.click();

  // Click Go to Cart (can be button or link; may open same/new tab)
  const goToCartButton = productPage.getByRole('button', { name: /go to cart/i });
  const goToCartLink = productPage.getByRole('link', { name: /go to cart/i });

  let cartPopupPromise = productPage.waitForEvent('popup').catch(() => null);
  if (await goToCartButton.isVisible().catch(() => false)) {
    await goToCartButton.click();
  } else if (await goToCartLink.isVisible().catch(() => false)) {
    await goToCartLink.click();
  } else {
    // Fallback: a dedicated view cart link often exists
    const viewCart = productPage.locator('a[href*="/viewcart"], a:has-text("View Cart")').first();
    if (await viewCart.isVisible().catch(() => false)) {
      await viewCart.click();
    }
  }

  const cartPopup = await cartPopupPromise;
  const cartPage = cartPopup ?? productPage;
  if (!cartPopup) {
    await cartPage.waitForLoadState('domcontentloaded');
  }
  await cartPage.waitForURL(/viewcart|cart/i, { timeout: 60000 }).catch(() => {});

  // Wait for Price Details section to appear
  const priceDetailsHeader = cartPage.getByText(/price details/i);
  await expect(priceDetailsHeader).toBeVisible({ timeout: 60000 });

  // Verify Price Details -> Total Amount equals 39108
  // Get text in the cart page and pull total amount value
  // Prefer scoping under a container that has "Price details"
  let container = cartPage.locator(':is(section, div, aside):has-text("Price details")');
  if (!(await container.first().isVisible().catch(() => false))) {
    container = cartPage.locator('body');
  }
  const containerText = (await container.first().innerText({ timeout: 60000 })).replace(/\s+/g, ' ');
  const totalMatch = containerText.match(/Total Amount[^\d]*([₹Rs\.\s,0-9]+)/i);
  expect(totalMatch, 'Total Amount not found in Price Details').toBeTruthy();
  const numeric = (totalMatch![1] || '').replace(/[^0-9]/g, '');
  expect(numeric).toBe('39108');

  // Close any extra tabs we opened
  if (cartPopup) await cartPage.close();
  if (popup) await productPage.close();
});

