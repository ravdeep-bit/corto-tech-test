import { APIRequestContext } from '@playwright/test';

// Wrappers for demoqa's `/BookStore/v1/*` controller. Pure HTTP, page-free —
// caller passes a clean `APIRequestContext` and pre-extracted Bearer creds;
// cookie/Page bridging lives in `helpers/cleanCollection.ts`.
//
// Future wrappers under the same namespace (e.g. `addBookToCollectionApi`,
// `getCollectionApi`) land here next to `deleteAllBooksApi`.

export async function deleteAllBooksApi(
  request: APIRequestContext,
  params: { userId: string; token: string },
): Promise<void> {
  const { userId, token } = params;
  const res = await request.delete(`/BookStore/v1/Books?UserId=${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status() !== 204) {
    throw new Error(`API delete-all failed: status ${res.status()}, body: ${await res.text()}`);
  }
}
