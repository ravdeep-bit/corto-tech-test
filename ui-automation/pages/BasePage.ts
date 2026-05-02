import { Page } from '@playwright/test';

// Base POM. domcontentloaded (not networkidle — demoqa's tracking pixels never settle).
export class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  getCurrentUrl(): string {
    return this.page.url();
  }
}
