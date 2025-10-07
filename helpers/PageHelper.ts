// helpers/PageHelper.ts
import { Page, expect } from '@playwright/test';
import { BicBugsSelectors } from '../selectors/bicbugs.selectors';

export class PageHelper {
  constructor(private page: Page) {}

  async setViewport(width = 1280, height = 720) {
    await this.page.setViewportSize({ width, height });
  }

  async goTo(url: string) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async waitForFullLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForXPathVisible(xpath: string, timeout = 50000) {
    return await this.page.waitForSelector(`xpath=${xpath}`, {
      state: 'visible',
    });
  }

  async waitFor(seconds: number) {
  const maxAllowed = 20; // max 20 seconds
  const safeSeconds = Math.min(seconds, maxAllowed);
  await this.page.waitForTimeout(safeSeconds * 1000);
 }

  async clickXPath(xpath: string, timeout = 10000) {
    const element = await this.waitForXPathVisible(xpath, timeout);
    if (element) {
      await element.click();
      console.log(`Clicked: ${xpath}`);
    } else {
      throw new Error(`Element not found: ${xpath}`);
    }
  }

  async assertXPathText(xpath: string, expectedText: string, timeout = 10000) {
    const locator = this.page.locator(`xpath=${xpath}`);
    await expect(locator).toHaveText(expectedText, { timeout });
  }

  async dismissPopup() {
  const closeButton = this.page.getByText(BicBugsSelectors.popupCloseText, { exact: true });

  try {
    if (await closeButton.isVisible({ timeout: 5000 })) {
      await closeButton.click();
      console.log(`Popup dismissed using text "${BicBugsSelectors.popupCloseText}"`);
    }
  } catch {
    console.log('No popup found or already dismissed.');
  }
}
  }
