import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

// /books. Title links use `?search=<isbn>` as the row anchor.
export class BookStorePage extends BasePage {
  private readonly searchInput = this.page.getByRole('textbox', { name: 'Type to search' });
  private readonly bookTable = this.page.getByRole('table');
  private readonly bookTitleLinks = this.page.locator('table a[href*="search="]');

  async goto(): Promise<void> {
    await super.goto('/books');
    await this.waitForPageReady();
  }

  async waitForPageReady(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
    await expect(this.bookTable).toBeVisible();
  }

  // Client-side filter — short DOM-settle wait, no network call to await.
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(500);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  // Title links, not rows — matches user semantics.
  async getVisibleRowCount(): Promise<number> {
    return this.bookTitleLinks.count();
  }

  async getResultTitles(): Promise<string[]> {
    const count = await this.bookTitleLinks.count();
    const titles: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await this.bookTitleLinks.nth(i).textContent())?.trim();
      if (text) titles.push(text);
    }
    return titles;
  }

  async hasNoResults(): Promise<boolean> {
    return (await this.bookTitleLinks.count()) === 0;
  }

  async getSearchInputValue(): Promise<string> {
    return this.searchInput.inputValue();
  }

  async openBookByTitle(title: string): Promise<void> {
    const link = this.page.getByRole('link', { name: title, exact: true }).first();
    await expect(link).toBeVisible();
    await link.click();
    await this.page.waitForURL(/search=/);
  }
}
