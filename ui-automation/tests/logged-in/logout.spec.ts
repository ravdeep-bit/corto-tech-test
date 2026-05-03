import { test, expect } from '../../fixtures/pomFixtures';
import { validCredentials } from '../../test-data/testCredentials';

// Logout is exposed by the global header, not a single page POM.
// Test deliberately triggers logout from /books (not /profile) to prove
// the header logout works regardless of the originating page.
test.describe('Logout', () => {
  test(
    'logs out from /books and returns the user to the login page',
    { tag: '@smoke' },
    async ({ loginPage, bookStorePage, headerNav, page }) => {
      await loginPage.goto();
      await loginPage.login(validCredentials.username, validCredentials.password);
      await loginPage.waitForLoginSuccess();

      // Navigate to a non-/profile authenticated page before logging out.
      await bookStorePage.goto();

      await headerNav.logout();

      await page.waitForURL(/\/login/);
      await expect(page.locator('#login')).toBeVisible();
    },
  );
});
