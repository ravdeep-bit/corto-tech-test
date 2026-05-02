// End-to-end flow demonstrating data passing between endpoints.
// One chained test: auth → create → get → put → patch → verify → delete → verify gone.
// Deliberately one big test rather than several — splitting would create
// ordering coupling between tests, which is worse than a slightly longer
// single test. The bookingId from create is reused across every subsequent
// step, proving the values flow end-to-end.
import { test, expect } from '@playwright/test';
import { getToken } from '../../clients/auth';
import { newBooking } from '../../test-data/bookingData';
import { attachReqRes } from '../../helpers/reportAttachments';

test.describe('E2E: Booking Data Flow', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await getToken(request);
  });

  test('create → get → update → patch → delete flow', { tag: '@smoke' }, async ({ request }, testInfo) => {
    const initialData = newBooking();
    const updatedData = newBooking({ firstname: 'Updated', lastname: 'AfterPut' });
    let bookingId!: number;

    await test.step('create booking', async () => {
      const res = await request.post('/booking', { data: initialData });
      await attachReqRes(testInfo, { method: 'POST', body: initialData }, res, 'create');
      expect(res.status()).toBe(200);
      const body = await res.json();
      bookingId = body.bookingid;
      expect(bookingId).toBeTruthy();
      expect(body.booking.firstname).toBe(initialData.firstname);
    });

    await test.step('get and verify created data', async () => {
      const res = await request.get(`/booking/${bookingId}`);
      await attachReqRes(testInfo, { method: 'GET' }, res, 'get');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.firstname).toBe(initialData.firstname);
      expect(body.lastname).toBe(initialData.lastname);
    });

    await test.step('full update (PUT)', async () => {
      const res = await request.put(`/booking/${bookingId}`, {
        headers: { Cookie: `token=${token}` },
        data: updatedData,
      });
      await attachReqRes(testInfo, { method: 'PUT', body: updatedData }, res, 'put');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.firstname).toBe('Updated');
      expect(body.lastname).toBe('AfterPut');
    });

    await test.step('partial update (PATCH)', async () => {
      const patchPayload = { lastname: 'PatchedLast' };
      const res = await request.patch(`/booking/${bookingId}`, {
        headers: { Cookie: `token=${token}` },
        data: patchPayload,
      });
      await attachReqRes(testInfo, { method: 'PATCH', body: patchPayload }, res, 'patch');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.firstname).toBe('Updated');
      expect(body.lastname).toBe('PatchedLast');
    });

    await test.step('verify state via GET', async () => {
      const res = await request.get(`/booking/${bookingId}`);
      await attachReqRes(testInfo, { method: 'GET' }, res, 'verify');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.firstname).toBe('Updated');
      expect(body.lastname).toBe('PatchedLast');
    });

    await test.step('delete booking', async () => {
      const res = await request.delete(`/booking/${bookingId}`, {
        headers: { Cookie: `token=${token}` },
      });
      await attachReqRes(testInfo, { method: 'DELETE' }, res, 'delete');
      expect(res.status()).toBe(201);
    });

    await test.step('verify deletion (404 on subsequent GET)', async () => {
      const res = await request.get(`/booking/${bookingId}`);
      await attachReqRes(testInfo, { method: 'GET' }, res, 'verify deleted');
      expect(res.status()).toBe(404);
    });
  });
});
