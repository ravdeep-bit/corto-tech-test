// DELETE /booking/:id.
import { test, expect } from '@playwright/test';
import { getToken } from '../../clients/auth';
import { cleanupBookings, createBookingForTest } from '../../clients/booking';
import { attachReqRes } from '../../helpers/reportAttachments';

test.describe('DELETE /booking/:id', () => {
  let token: string;
  const createdIds: number[] = [];

  test.beforeAll(async ({ request }) => {
    token = await getToken(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupBookings(request, token, createdIds);
  });

  test('deletes a booking with valid token and verifies removal', { tag: '@smoke' }, async ({ request }, testInfo) => {
    const { bookingid } = await createBookingForTest(request, testInfo);

    const deleteRes = await request.delete(`/booking/${bookingid}`, {
      headers: { Cookie: `token=${token}` },
    });
    await attachReqRes(testInfo, { method: 'DELETE' }, deleteRes, 'DELETE');
    expect(deleteRes.status()).toBe(201);

    const getRes = await request.get(`/booking/${bookingid}`);
    await attachReqRes(testInfo, { method: 'GET' }, getRes, 'GET verify deleted');
    expect(getRes.status()).toBe(404);
  });

  test('rejects delete without auth token', async ({ request }, testInfo) => {
    const { bookingid } = await createBookingForTest(request, testInfo);
    createdIds.push(bookingid);

    const res = await request.delete(`/booking/${bookingid}`);
    await attachReqRes(testInfo, { method: 'DELETE' }, res);

    expect(res.status()).toBe(403);
  });

  test('rejects delete with invalid token', async ({ request }, testInfo) => {
    const { bookingid } = await createBookingForTest(request, testInfo);
    createdIds.push(bookingid);

    const res = await request.delete(`/booking/${bookingid}`, {
      headers: { Cookie: 'token=invalid-token-xyz' },
    });
    await attachReqRes(testInfo, { method: 'DELETE' }, res);

    expect(res.status()).toBe(403);
  });

  test('second delete on the same booking returns 405 (idempotency)', async ({ request }, testInfo) => {
    // DELETE should be safe to retry. restful-booker returns 405 on the second
    // call (REST-correct would be 404 — see BUG-6).
    const { bookingid } = await createBookingForTest(request, testInfo);

    const firstRes = await request.delete(`/booking/${bookingid}`, {
      headers: { Cookie: `token=${token}` },
    });
    await attachReqRes(testInfo, { method: 'DELETE' }, firstRes, 'first delete');
    expect(firstRes.status()).toBe(201);

    const secondRes = await request.delete(`/booking/${bookingid}`, {
      headers: { Cookie: `token=${token}` },
    });
    await attachReqRes(testInfo, { method: 'DELETE' }, secondRes, 'second delete');
    expect(secondRes.status()).toBe(405);
  });
});
