import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

// /profile. Row-text filter for collection rows — no positional indexes.
export class ProfilePage extends BasePage {
  private readonly userNameValue = this.page.locator('#userName-value');
  private readonly logoutButton = this.page.getByRole('button', { name: /log\s*out/i });
  private readonly deleteAllBooksButton = this.page.getByRole('button', { name: /delete all books/i });
  // /profile delete is an in-page modal (react-bootstrap), not a native dialog.
  private readonly confirmModal = this.page.getByRole('dialog');
  private readonly confirmModalOkButton = this.confirmModal.getByRole('button', { name: /^ok$/i });
  // Public so tests can use Playwright's auto-retrying expect().
  readonly bookLinks = this.page.locator('table a[href*="search="]');

  async goto(): Promise<void> {
    await super.goto('/profile');
    await expect(this.userNameValue).toBeVisible();
    // "Page X of N" renders only after books data loads — endpoint-agnostic readiness.
    await expect(this.page.getByText(/Page \d+ of \d+/)).toBeVisible();
  }

  async isLoggedIn(): Promise<boolean> {
    return this.userNameValue.isVisible();
  }

  async getDisplayedUsername(): Promise<string> {
    return (await this.userNameValue.textContent())?.trim() ?? '';
  }

  async logout(): Promise<void> {
    await expect(this.logoutButton).toBeVisible();
    await this.logoutButton.click();
    await this.page.waitForURL(/\/login/);
    await expect(this.page.locator('#login')).toBeVisible();
  }

  async getBookCount(): Promise<number> {
    return this.bookLinks.count();
  }

  async hasBookInCollection(title: string): Promise<boolean> {
    return (await this.page.getByRole('link', { name: title, exact: true }).count()) > 0;
  }

  // Auto-retrying — polls up to expect.timeout (10s).
  async expectBookInCollection(title: string): Promise<void> {
    await expect(this.page.getByRole('link', { name: title, exact: true })).toBeVisible();
  }

  async expectBookNotInCollection(title: string): Promise<void> {
    await expect(this.page.getByRole('link', { name: title, exact: true })).toHaveCount(0);
  }

  // Delete by title. Confirms via in-page modal; asserts row gone (modal-close
  // timing varies with backend latency).
  async deleteBook(title: string): Promise<void> {
    const row = this.page.getByRole('row').filter({ hasText: title });
    const deleteIcon = row.locator('span[title="Delete"]');
    await expect(deleteIcon).toBeVisible();

    await deleteIcon.click();
    await expect(this.confirmModal).toBeVisible();
    await this.confirmModalOkButton.click();
    await expect(this.page.getByRole('link', { name: title, exact: true })).toHaveCount(0);
  }

  // No-op if already empty. Same modal pattern as deleteBook.
  async deleteAllBooks(): Promise<void> {
    if ((await this.getBookCount()) === 0) return;

    await expect(this.deleteAllBooksButton).toBeVisible();
    await this.deleteAllBooksButton.click();
    await expect(this.confirmModal).toBeVisible();
    await this.confirmModalOkButton.click();
    await expect(this.bookLinks).toHaveCount(0);
  }

  async goToBookStore(): Promise<void> {
    const gotoStoreButton = this.page.locator('#gotoStore');
    await expect(gotoStoreButton).toBeVisible();
    await gotoStoreButton.click();
    await this.page.waitForURL(/\/books/);
  }
}
