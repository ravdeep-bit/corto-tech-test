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

  test('create -> get -> update -> patch -> delete flow', { tag: '@smoke' }, async ({ request }, testInfo) => {
    const initialData = newBooking();
    const updatedData = newBooking({ firstname: 'Updated', lastname: 'AfterPut' });

    // ── 1. Create ──────────────────────────────────────────────────────
    let res = await request.post('/booking', { data: initialData });
    await attachReqRes(testInfo, { method: 'POST', body: initialData }, res, 'step 1 create');
    expect(res.status()).toBe(200);
    let body = await res.json();
    const bookingId: number = body.bookingid;
    expect(bookingId).toBeTruthy();
    expect(body.booking.firstname).toBe(initialData.firstname);

    // ── 2. Get and verify created data ─────────────────────────────────
    res = await request.get(`/booking/${bookingId}`);
    await attachReqRes(testInfo, { method: 'GET' }, res, 'step 2 get');
    expect(res.status()).toBe(200);
    body = await res.json();
    expect(body.firstname).toBe(initialData.firstname);
    expect(body.lastname).toBe(initialData.lastname);

    // ── 3. Update (PUT) — full payload required ────────────────────────
    res = await request.put(`/booking/${bookingId}`, {
      headers: { Cookie: `token=${token}` },
      data: updatedData,
    });
    await attachReqRes(testInfo, { method: 'PUT', body: updatedData }, res, 'step 3 put');
    expect(res.status()).toBe(200);
    body = await res.json();
    expect(body.firstname).toBe('Updated');
    expect(body.lastname).toBe('AfterPut');

    // ── 4. Patch (only one field) ──────────────────────────────────────
    const patchPayload = { lastname: 'PatchedLast' };
    res = await request.patch(`/booking/${bookingId}`, {
      headers: { Cookie: `token=${token}` },
      data: patchPayload,
    });
    await attachReqRes(testInfo, { method: 'PATCH', body: patchPayload }, res, 'step 4 patch');
    expect(res.status()).toBe(200);
    body = await res.json();
    expect(body.firstname).toBe('Updated');
    expect(body.lastname).toBe('PatchedLast');

    // ── 5. Verify state via GET ────────────────────────────────────────
    res = await request.get(`/booking/${bookingId}`);
    await attachReqRes(testInfo, { method: 'GET' }, res, 'step 5 verify');
    expect(res.status()).toBe(200);
    body = await res.json();
    expect(body.firstname).toBe('Updated');
    expect(body.lastname).toBe('PatchedLast');

    // ── 6. Delete ──────────────────────────────────────────────────────
    res = await request.delete(`/booking/${bookingId}`, {
      headers: { Cookie: `token=${token}` },
    });
    await attachReqRes(testInfo, { method: 'DELETE' }, res, 'step 6 delete');
    expect(res.status()).toBe(201);

    // ── 7. Verify deletion ─────────────────────────────────────────────
    res = await request.get(`/booking/${bookingId}`);
    await attachReqRes(testInfo, { method: 'GET' }, res, 'step 7 verify deleted');
    expect(res.status()).toBe(404);
  });
});
