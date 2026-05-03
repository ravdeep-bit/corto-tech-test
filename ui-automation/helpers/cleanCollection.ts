// Wipes the logged-in user's book collection via the demoqa Bookstore API.
//
// Creates a *fresh* `APIRequestContext` rather than using the test's built-in
// `request` fixture: the built-in shares storage with the browser, so its
// HTTP calls carry the session cookie. demoqa's `/BookStore` mutations hang
// when a session cookie and `Authorization: Bearer` header arrive together.
//
// No-op if cookies aren't set (e.g. test failed before login) so `afterEach`
// doesn't crash on top of an already-failing test.
import { Page, request as playwrightRequest } from '@playwright/test';
import { deleteAllBooksApi } from '../clients/bookstore';
import { BASE_URL } from '../config/env';

export async function cleanCollection(page: Page): Promise<void> {
  const cookies = await page.context().cookies();
  const userId = cookies.find((c) => c.name === 'userID')?.value;
  const token = cookies.find((c) => c.name === 'token')?.value;
  if (!userId || !token) return;

  const apiCtx = await playwrightRequest.newContext({ baseURL: BASE_URL });
  try {
    await deleteAllBooksApi(apiCtx, { userId, token });
  } finally {
    await apiCtx.dispose();
  }
}
