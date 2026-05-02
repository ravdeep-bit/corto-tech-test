import { APIRequestContext } from '@playwright/test';

// Demoqa Bookstore API client. Used by the e2e cleanup hook to wipe the
// `tester` user's collection between tests via Bearer auth.
//
// `deleteAllBooksApi` accepts 200 or 204 — demoqa has been observed to
// return both for a successful clear.
export async function deleteAllBooksApi(
  request: APIRequestContext,
  params: { userId: string; token: string },
): Promise<void> {
  const { userId, token } = params;
  const res = await request.delete(`/BookStore/v1/Books?UserId=${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (![200, 204].includes(res.status())) {
    throw new Error(`API delete-all failed: status ${res.status()}, body: ${await res.text()}`);
  }
}
