import type { Locator, Page } from "@playwright/test";

export class AlertComponent {
  readonly locator: Locator;

  constructor(page: Page, selector: string) {
    this.locator = page.locator(selector);
  }

  async getText(): Promise<string> {
    const text = await this.locator.textContent();
    return text?.trim() ?? "";
  }

  async isVisible(): Promise<boolean> {
    return this.locator.isVisible();
  }
}
