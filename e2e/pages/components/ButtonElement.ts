import type { Locator, Page } from "@playwright/test";

export class ButtonElement {
  readonly locator: Locator;

  constructor(page: Page, selector: string) {
    this.locator = page.locator(selector);
  }

  async click() {
    await this.locator.click();
  }

  async isDisabled(): Promise<boolean> {
    return this.locator.isDisabled();
  }

  async getText(): Promise<string> {
    const text = await this.locator.textContent();
    return text?.trim() ?? "";
  }
}
