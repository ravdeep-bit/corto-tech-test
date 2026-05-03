import { expect, Locator, Page } from '@playwright/test';

// /login. Anchors on stable IDs (#userName, #password, #login).
export class LoginPage {
  private readonly userNameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly errorMessage: Locator; // demoqa renders auth errors here

  constructor(protected page: Page) {
    this.userNameInput = page.locator('#userName');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('#login');
    this.errorMessage = page.locator('#name');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(this.loginButton).toBeVisible();
  }

  // Fills + submits. Pair with waitForLoginSuccess() or getErrorMessageText().
  async login(username: string, password: string): Promise<void> {
    await expect(this.loginButton).toBeVisible();
    await this.userNameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async getErrorMessageText(): Promise<string> {
    return (await this.errorMessage.textContent())?.trim() ?? '';
  }

  async isLoginButtonVisible(): Promise<boolean> {
    return this.loginButton.isVisible();
  }

  // Successful login redirects to /profile and renders the username.
  async waitForLoginSuccess(): Promise<void> {
    await this.page.waitForURL(/\/profile/);
    await expect(this.page.locator('#userName-value')).toBeVisible();
  }
}
