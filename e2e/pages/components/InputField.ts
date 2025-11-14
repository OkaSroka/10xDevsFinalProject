import type { Locator, Page } from "@playwright/test";

export class InputField {
  readonly locator: Locator;

  constructor(
    private readonly page: Page,
    selector: string,
  ) {
    this.locator = page.locator(selector);
  }

  async fill(value: string) {
    await this.locator.fill(value);
  }

  async clear() {
    await this.locator.fill("");
  }

  async getValue(): Promise<string> {
    return this.locator.inputValue();
  }

  async isInvalid(): Promise<boolean> {
    const ariaInvalid = await this.locator.getAttribute("aria-invalid");
    return ariaInvalid === "true";
  }

  async getHelperText(): Promise<string> {
    const helperId = await this.locator.getAttribute("aria-describedby");
    if (!helperId) {
      return "";
    }

    const helperText = await this.page.locator(`#${helperId}`).textContent();
    return helperText?.trim() ?? "";
  }
}
