import type { Page } from "@playwright/test";
import { InputField } from "./components/InputField";
import { ButtonElement } from "./components/ButtonElement";
import { AlertComponent } from "./components/AlertComponent";

export class LoginFormPage {
  readonly page: Page;
  readonly emailInput: InputField;
  readonly passwordInput: InputField;
  readonly submitButton: ButtonElement;
  readonly alert: AlertComponent;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = new InputField(page, '[data-test-id="login-email-input"]');
    this.passwordInput = new InputField(
      page,
      '[data-test-id="login-password-input"]',
    );
    this.submitButton = new ButtonElement(
      page,
      '[data-test-id="login-submit-button"]',
    );
    this.alert = new AlertComponent(page, '[data-test-id="login-form-status"]');
  }

  async navigate() {
    await this.page.goto("/auth/login", { waitUntil: "networkidle" });

    // Wait for React component to be visible
    await this.page.waitForSelector('[data-test-id="login-form"]', {
      state: "visible",
    });

    // Wait for React hydration - test by checking if onChange fires
    await this.waitForHydration();
  }

  private async waitForHydration() {
    // Wait a baseline amount for client:load
    await this.page.waitForTimeout(1500);

    // Test if React is responding by filling and blurring email field
    await this.emailInput.locator.focus();
    await this.emailInput.fill("test@example.com");
    await this.emailInput.locator.blur();

    // Wait for React to potentially update
    await this.page.waitForTimeout(800);

    // Clear it
    await this.emailInput.fill("");
    await this.page.waitForTimeout(500);
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    // Submit form by pressing Enter (more reliable than button click for React forms)
    await this.passwordInput.locator.press("Enter");
  }

  async submitForm() {
    // Alternative: submit the form directly
    await this.submitButton.click();
  }
}
