import { expect, Locator, Page } from '@playwright/test';
import { BookDetails } from '../types/BookDetails';

// /books?book=<isbn>. Field labels matched by regex (`/^Field\s*:/`) — demoqa
// inconsistently formats `Field:` vs `Field :`. Both action buttons share
// id="addNewRecordButton" (HTML spec violation) — anchor on role + accessible
// name to differentiate.
export class BookDetailsPage {
  private readonly addToCollectionButton: Locator;

  private static readonly FIELD_PATTERNS = {
    isbn: /^ISBN\s*:/,
    title: /^Title\s*:/,
    author: /^Author\s*:/,
    publisher: /^Publisher\s*:/,
    totalPages: /^Total Pages\s*:/,
    description: /^Description\s*:/,
    website: /^Website\s*:/,
  } as const;

  constructor(protected page: Page) {
    this.addToCollectionButton = page.getByRole('button', { name: /add to your collection/i });
  }

  // ISBN label is always present — readiness signal.
  async waitForDetailsLoaded(): Promise<void> {
    await expect(
      this.page.getByText(BookDetailsPage.FIELD_PATTERNS.isbn).first(),
    ).toBeVisible();
  }

  // Reads every field. Missing fields resolve to ''.
  async getBookDetails(): Promise<BookDetails> {
    await this.waitForDetailsLoaded();
    return {
      isbn: await this.readField(BookDetailsPage.FIELD_PATTERNS.isbn),
      title: await this.readField(BookDetailsPage.FIELD_PATTERNS.title),
      author: await this.readField(BookDetailsPage.FIELD_PATTERNS.author),
      publisher: await this.readField(BookDetailsPage.FIELD_PATTERNS.publisher),
      totalPages: await this.readField(BookDetailsPage.FIELD_PATTERNS.totalPages),
      description: await this.readField(BookDetailsPage.FIELD_PATTERNS.description),
      website: await this.readField(BookDetailsPage.FIELD_PATTERNS.website),
    };
  }

  // Take text after the first ':' in the row containing the label.
  private async readField(labelPattern: RegExp): Promise<string> {
    const labelLocator = this.page.getByText(labelPattern).first();
    if ((await labelLocator.count()) === 0) return '';

    const row = labelLocator.locator('xpath=ancestor::div[contains(@class,"row")][1]');
    const fullText = (await row.first().textContent()) ?? '';

    const colonIdx = fullText.indexOf(':');
    return colonIdx >= 0 ? fullText.substring(colonIdx + 1).trim() : fullText.trim();
  }

  getIsbnFromUrl(): string | null {
    const match = this.page.url().match(/search=([^&]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async isOnDetailPage(): Promise<boolean> {
    return this.getIsbnFromUrl() !== null;
  }

  // Auth-gated — only rendered for logged-in users.
  async expectAddToCollectionButtonHidden(): Promise<void> {
    await expect(this.addToCollectionButton).not.toBeVisible();
  }

  // Click "Add To Your Collection" and return the resulting alert message.
  // demoqa surfaces the alert ~5–6s after click (server-driven). Listener
  // registered before click. Possible messages:
  //   "Book added to your collection."
  //   "Book already present in the your collection!"
  async addToCollection(): Promise<string> {
    await expect(this.addToCollectionButton).toBeVisible();
    const dialogPromise = this.page.waitForEvent('dialog', { timeout: 30_000 });
    await this.addToCollectionButton.click();
    const dialog = await dialogPromise;
    const message = dialog.message();
    await dialog.accept();
    return message;
  }
}
