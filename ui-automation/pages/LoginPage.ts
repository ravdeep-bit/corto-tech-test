import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

// /login. Anchors on stable IDs (#userName, #password, #login).
export class LoginPage extends BasePage {
  private readonly userNameInput = this.page.locator('#userName');
  private readonly passwordInput = this.page.locator('#password');
  private readonly loginButton = this.page.locator('#login');
  private readonly errorMessage = this.page.locator('#name'); // demoqa renders auth errors here

  async goto(): Promise<void> {
    await super.goto('/login');
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
