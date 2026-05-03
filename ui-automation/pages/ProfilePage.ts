import { expect, Locator, Page } from '@playwright/test';

// /profile. Logout lives on `HeaderNav` (global header, not /profile-specific).
export class ProfilePage {
  private readonly userNameValue: Locator;
  // /profile delete is an in-page modal (react-bootstrap), not a native dialog.
  private readonly confirmModal: Locator;
  private readonly confirmModalOkButton: Locator;

  constructor(protected page: Page) {
    this.userNameValue = page.locator('#userName-value');
    this.confirmModal = page.getByRole('dialog');
    this.confirmModalOkButton = this.confirmModal.getByRole('button', { name: /^ok$/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect(this.userNameValue).toBeVisible();
    // "Page X of N" renders only after books data loads — endpoint-agnostic readiness.
    await expect(this.page.getByText(/Page \d+ of \d+/)).toBeVisible();
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
}
