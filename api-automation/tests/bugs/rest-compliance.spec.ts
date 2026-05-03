// REST-compliance bug-surfacing tests — what the API *should* do, not what it does.
// Each test asserts the REST-correct status code; failures are the bug tickets.
// Tagged @bugs and excluded from default `npm test` (run with `npm run test:bugs`).
import { test, expect } from '@playwright/test';
import { getToken } from '../../clients/auth';
import { Booking, cleanupBookings, createBookingForTest } from '../../clients/booking';
import { newBooking } from '../../test-data/bookingData';
import { attachReqRes } from '../../helpers/reportAttachments';

test.describe('REST compliance — known bugs in restful-booker', () => {
  let token: string;
  const createdIds: number[] = [];

  test.beforeAll(async ({ request }) => {
    token = await getToken(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupBookings(request, token, createdIds);
  });

  test(
    'BUG-1: POST /booking should return 201 Created on success (currently 200)',
    { tag: '@bugs' },
    async ({ request }, testInfo) => {
      const payload = newBooking();
      const res = await request.post('/booking', { data: payload });
      await attachReqRes(testInfo, { method: 'POST', body: payload }, res);

      const body = await res.json().catch(() => null);
      if (body?.bookingid) createdIds.push(body.bookingid);

      expect(res.status(), 'BUG-1: POST /booking on success should return 201 Created per REST conventions').toBe(201);
    },
  );

  test(
    'BUG-2: DELETE /booking/:id should return 204 No Content on success (currently 201)',
    { tag: '@bugs' },
    async ({ request }, testInfo) => {
      const { bookingid } = await createBookingForTest(request, testInfo);

      const res = await request.delete(`/booking/${bookingid}`, {
        headers: { Cookie: `token=${token}` },
      });
      await attachReqRes(testInfo, { method: 'DELETE' }, res);

      expect(res.status(), 'BUG-2: DELETE on success should return 204 No Content per REST conventions').toBe(204);
    },
  );

  test('BUG-3: GET /ping should return 200 OK (currently 201)', { tag: '@bugs' }, async ({ request }, testInfo) => {
    const res = await request.get('/ping');
    await attachReqRes(testInfo, { method: 'GET' }, res);

    expect(res.status(), 'BUG-3: GET /ping (a read, no resource created) should return 200 OK').toBe(200);
  });

  test(
    'BUG-4: POST /auth with invalid credentials should return 401 Unauthorized (currently 200)',
    { tag: '@bugs' },
    async ({ request }, testInfo) => {
      const payload = { username: 'admin', password: 'wrong-password' };
      const res = await request.post('/auth', { data: payload });
      await attachReqRes(testInfo, { method: 'POST', body: payload }, res);

      expect(
        res.status(),
        'BUG-4: invalid credentials should return 401 Unauthorized — currently 200 with { reason: "Bad credentials" }',
      ).toBe(401);
    },
  );

  test(
    'BUG-5: POST /booking with missing required fields should return 400 Bad Request (currently 500)',
    { tag: '@bugs' },
    async ({ request }, testInfo) => {
      const payload = newBooking();
      delete (payload as Partial<Booking>).firstname;

      const res = await request.post('/booking', { data: payload });
      await attachReqRes(testInfo, { method: 'POST', body: payload }, res);

      expect(
        res.status(),
        'BUG-5: client-side bad input should return 400 Bad Request, not 500 Internal Server Error',
      ).toBe(400);
    },
  );

  test(
    'BUG-6: mutations on a non-existent booking ID should return 404 Not Found (currently 405)',
    { tag: '@bugs' },
    async ({ request }, testInfo) => {
      // 405 implies the verb is unsupported, but it IS — the resource doesn't exist.
      // REST-correct: 404. Create+delete produces a deterministically-missing ID.
      const { bookingid } = await createBookingForTest(request, testInfo);
      const firstDelete = await request.delete(`/booking/${bookingid}`, {
        headers: { Cookie: `token=${token}` },
      });
      expect(
        firstDelete.status(),
        'setup: first DELETE returns 201 (Restful Booker quirk; REST-correct 204 tracked as BUG-2)',
      ).toBe(201);

      const res = await request.delete(`/booking/${bookingid}`, {
        headers: { Cookie: `token=${token}` },
      });
      await attachReqRes(testInfo, { method: 'DELETE' }, res);

      expect(
        res.status(),
        'BUG-6: mutation on a deleted/non-existent id should return 404 Not Found, not 405 Method Not Allowed',
      ).toBe(404);
    },
  );
});
