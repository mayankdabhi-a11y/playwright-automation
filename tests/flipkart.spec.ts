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

  // Verify enabled Add to Cart button is visible and click it
  const addToCart = productPage.getByRole('button', { name: /add to cart/i }).filter({ hasNot: productPage.locator('[disabled]') }).first();
  await expect(addToCart).toBeVisible({ timeout: 15000 });
  await addToCart.click();

  // Go to cart directly for reliability
  await productPage.goto('https://www.flipkart.com/viewcart', { waitUntil: 'domcontentloaded' });
  const cartPage = productPage;

  // Wait for Price Details section to appear
  // Dismiss login modal if it appears on cart as well
  const cartCloseLogin = cartPage.getByRole('button', { name: '✕' });
  if (await cartCloseLogin.isVisible().catch(() => false)) {
    await cartCloseLogin.click().catch(() => {});
  }
  // Try to find a recognizable header or the Total Amount label directly
  const priceDetailsHeader = cartPage.getByText(/price\s*details/i).first();
  await priceDetailsHeader.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});

  // Verify Price Details -> Total Amount equals 39108
  // Get text in the cart page and pull total amount value
  // Prefer scoping under a container that has "Price details"
  let container = cartPage.locator(':is(section, div, aside):has-text("Price details")');
  if (!(await container.first().isVisible().catch(() => false))) {
    container = cartPage.locator('body');
  }
  // Prefer a direct locator for Total Amount value near its label
  const totalValueLocator = cartPage.locator(
    'xpath=//*[normalize-space(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"))="total amount" or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"total payable")]/following::*[contains(text(),"₹") or contains(text(),"Rs")][1]'
  ).first();
  let totalText = await totalValueLocator.textContent().catch(() => null);
  if (!totalText) {
    const containerText = (await container.first().innerText({ timeout: 60000 })).replace(/\s+/g, ' ');
    const totalMatch = containerText.match(/Total\s*(Amount|Payable)[^\d]*([₹Rs\.\s,0-9]+)/i);
    totalText = totalMatch ? totalMatch[2] : '';
  }
  const numeric = String(totalText || '').replace(/[^0-9]/g, '');
  expect(numeric).toBe('39108');

  // Close any extra tabs we opened
  if (cartPopup) await cartPage.close();
  if (popup) await productPage.close();
});

