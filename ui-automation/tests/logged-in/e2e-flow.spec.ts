import { test, expect } from '../../fixtures/pomFixtures';
import { validCredentials } from '../../test-data/testCredentials';
import { cleanCollection } from '../../helpers/cleanCollection';

// Authenticated UI journey: search → add → verify → delete → verify.
//
// UI login per test (not storage state) because demoqa has three quirks
// storage state can't survive:
//   - Single-session enforcement: a new login invalidates older tokens for
//     the same user, so any saved token goes stale unpredictably.
//   - Mismatched-token sensitivity: combining a session cookie from one
//     login with a Bearer header from another hangs /BookStore mutations.
//   - Cookie/localStorage gap: demoqa writes auth to cookies, but the
//     frontend reads userID/token from localStorage for add-to-collection;
//     storage state can't capture localStorage values demoqa never wrote.
// Per-test UI login gives each test one coherent session for UI and API.
//
// API cleanup runs both before (defensive — clean start regardless of prior
// state) and after (clean exit for the next run) each test.

test.describe('E2E: logged-in user journey', () => {
  test.describe.configure({ mode: 'serial' });

  const BOOK = 'Git Pocket Guide';

  test.beforeEach(async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login(validCredentials.username, validCredentials.password);
    await loginPage.waitForLoginSuccess();
    await cleanCollection(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanCollection(page);
  });

  test(
    'search → add → re-add → verify → delete → verify',
    { tag: '@smoke' },
    async ({ bookStorePage, bookDetailsPage, profilePage }) => {
      await test.step('search and open book detail', async () => {
        await bookStorePage.goto();
        await bookStorePage.search(BOOK);
        await bookStorePage.openBookByTitle(BOOK);
      });

      await test.step('add to collection', async () => {
        const addMessage = await bookDetailsPage.addToCollection();
        expect(addMessage).toMatch(/added/i);
      });

      await test.step('re-add same book surfaces "already present" alert', async () => {
        // Negative path: same book, same detail page, second click. Alert
        // message is the only signal — backend silently ignores the dupe.
        const dupeMessage = await bookDetailsPage.addToCollection();
        expect(dupeMessage).toMatch(/already present/i);
      });

      await test.step('verify book appears on /profile', async () => {
        await profilePage.goto();
        await profilePage.expectBookInCollection(BOOK);
      });

      await test.step('delete book and verify removal', async () => {
        await profilePage.deleteBook(BOOK);
        await profilePage.expectBookNotInCollection(BOOK);
      });
    },
  );
});
