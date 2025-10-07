// tests/bicbugs.spec.ts
import { test } from '@playwright/test';
import { PageHelper } from '../helpers/PageHelper';
import { BicBugsSelectors } from '../selectors/bicbugs.selectors';

test.describe('BicBugs - simple search and click', () => {
  let helper: PageHelper;

  test.beforeEach(async ({ page }) => {
    helper = new PageHelper(page);

    await helper.setViewport(2560, 1280);
    await helper.goTo('https://bicbugs.com/');

    // Dismiss popup if it appears
    await helper.dismissPopup();
  });

  test('go to site, search text, if visible click it', async () => {
    // Step 1: Click product from homepage
    await helper.clickXPath(BicBugsSelectors.morphoBlue);
    await helper.waitFor(2);
    await helper.waitForFullLoad();

    // Step 2: Add to cart
    await helper.clickXPath(BicBugsSelectors.addToCartButton);
    await helper.waitFor(2);
    await helper.waitForFullLoad();

    // Step 3: Verify confirmation message
    const expectedMessage = 'Morpho menelaus blue butterfly French Guyana has been added to your cart.';
    await helper.assertXPathText(BicBugsSelectors.addedToCartMessage, expectedMessage);

    // Step 4: Navigate to cart
    await helper.clickXPath(BicBugsSelectors.cartIcon);
    await helper.waitFor(2);
    await helper.waitForFullLoad();

    // Step 5: Verify item in cart
    await helper.assertXPathText(BicBugsSelectors.cartItemText, 'Morpho menelaus blue butterfly French Guyana - unmounted/wings closed');
  });
});
