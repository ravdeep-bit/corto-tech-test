import { expect, Locator, Page } from '@playwright/test';

// Global app header — visible on every page once authenticated.
// Regex (not exact match) because demoqa uses inconsistent button text:
//   /profile renders "Logout"   /books renders "Log out"
// Same logical control, different accessible names. The regex matches both,
// anchored ^…$ so it doesn't pick up unrelated buttons containing "logout".
export class HeaderNav {
  private readonly logoutButton: Locator;

  constructor(protected page: Page) {
    this.logoutButton = page.getByRole('button', { name: /^log\s*out$/i });
  }

  async logout(): Promise<void> {
    await expect(this.logoutButton).toBeVisible();
    await this.logoutButton.click();
  }
}
