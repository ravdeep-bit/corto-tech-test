import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ProfilePage } from '../pages/ProfilePage';
import { BookStorePage } from '../pages/BookStorePage';
import { BookDetailsPage } from '../pages/BookDetailsPage';
import { HeaderNav } from '../pages/HeaderNav';

// POM injection fixtures. Each test gets fresh POMs bound to its own page.
type Fixtures = {
  loginPage: LoginPage;
  profilePage: ProfilePage;
  bookStorePage: BookStorePage;
  bookDetailsPage: BookDetailsPage;
  headerNav: HeaderNav;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
  bookStorePage: async ({ page }, use) => {
    await use(new BookStorePage(page));
  },
  bookDetailsPage: async ({ page }, use) => {
    await use(new BookDetailsPage(page));
  },
  headerNav: async ({ page }, use) => {
    await use(new HeaderNav(page));
  },
});

export { expect } from '@playwright/test';
