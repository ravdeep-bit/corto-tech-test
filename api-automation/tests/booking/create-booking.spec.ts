// POST /booking — create.
import { test, expect } from '@playwright/test';
import { getToken } from '../../clients/auth';
import { cleanupBookings } from '../../clients/booking';
import { newBooking } from '../../test-data/bookingData';
import { attachReqRes } from '../../helpers/reportAttachments';
import { assertMatchesSchema } from '../../helpers/validateSchema';

test.describe('POST /booking', () => {
  let token: string;
  const createdIds: number[] = [];

  test.beforeAll(async ({ request }) => {
    token = await getToken(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupBookings(request, token, createdIds);
  });

  // POST is the call under test → use request.post directly, not the helper.

  test('creates a booking and returns all fields correctly', { tag: '@smoke' }, async ({ request }, testInfo) => {
    const payload = newBooking();
    const res = await request.post('/booking', { data: payload });
    await attachReqRes(testInfo, { method: 'POST', body: payload }, res);

    expect(res.status()).toBe(200);
    const body = await res.json();
    assertMatchesSchema(body, 'create_booking_response.json');
    createdIds.push(body.bookingid);

    expect(body.booking.firstname).toBe(payload.firstname);
    expect(body.booking.lastname).toBe(payload.lastname);
    expect(body.booking.totalprice).toBe(payload.totalprice);
    expect(body.booking.depositpaid).toBe(payload.depositpaid);
    expect(body.booking.bookingdates.checkin).toBe(payload.bookingdates.checkin);
    expect(body.booking.bookingdates.checkout).toBe(payload.bookingdates.checkout);
    expect(body.booking.additionalneeds).toBe(payload.additionalneeds);
  });

  test('creates a booking without optional additionalneeds field', async ({ request }, testInfo) => {
    const payload = newBooking({ additionalneeds: undefined });
    const res = await request.post('/booking', { data: payload });
    await attachReqRes(testInfo, { method: 'POST', body: payload }, res);

    expect(res.status()).toBe(200);
    const body = await res.json();
    createdIds.push(body.bookingid);

    expect(body.booking.firstname).toBe(payload.firstname);
  });

  test('creates a booking with zero totalprice', async ({ request }, testInfo) => {
    const payload = newBooking({ totalprice: 0 });
    const res = await request.post('/booking', { data: payload });
    await attachReqRes(testInfo, { method: 'POST', body: payload }, res);

    expect(res.status()).toBe(200);
    const body = await res.json();
    createdIds.push(body.bookingid);

    expect(body.booking.totalprice).toBe(0);
  });

  test('rejects booking with missing required firstname', async ({ request }, testInfo) => {
    // 500 (actual), not 400 (REST-correct — see BUG-5).
    const payload = newBooking();
    delete (payload as Partial<typeof payload>).firstname;

    const res = await request.post('/booking', { data: payload });
    await attachReqRes(testInfo, { method: 'POST', body: payload }, res);

    expect(res.status()).toBe(500);
  });

  test('rejects booking with completely empty payload', async ({ request }, testInfo) => {
    // 500 (actual), not 400 (REST-correct — see BUG-5).
    const res = await request.post('/booking', { data: {} });
    await attachReqRes(testInfo, { method: 'POST', body: {} }, res);

    expect(res.status()).toBe(500);
  });
});
