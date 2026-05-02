import { test, expect } from '../../fixtures/pomFixtures';
import { validCredentials, invalidCredentials } from '../../fixtures/credentials';

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test(
    'logs in successfully with valid credentials',
    { tag: '@smoke' },
    async ({ loginPage, page }) => {
      await loginPage.login(validCredentials.username, validCredentials.password);
      await loginPage.waitForLoginSuccess();

      expect(page.url()).toContain('/profile');
      await expect(page.locator('#userName-value')).toHaveText(validCredentials.username);
    },
  );

  test('shows an error message when password is invalid', async ({ loginPage, page }) => {
    await loginPage.login(invalidCredentials.username, invalidCredentials.password);

    // Inline error, no navigation.
    await expect(page.locator('#name')).toBeVisible();
    const errorText = await loginPage.getErrorMessageText();
    expect(errorText.toLowerCase()).toContain('invalid');
    expect(page.url()).toContain('/login');
  });

  test('does not navigate away when fields are submitted empty', async ({ loginPage, page }) => {
    await loginPage.login('', '');
    // Stays on /login.
    expect(page.url()).toContain('/login');
    expect(await loginPage.isLoginButtonVisible()).toBe(true);
  });

});
