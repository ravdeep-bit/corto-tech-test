// GET /booking — list and individual fetch. Filter test data in bookingFilterData.ts.
import { test, expect } from '@playwright/test';
import { getToken } from '../../clients/auth';
import { cleanupBookings, createBookingForTest } from '../../clients/booking';
import { newBooking } from '../../test-data/bookingData';
import {
  NON_EXISTENT_FILTER_VALUE,
  uniqueFilterTarget,
} from '../../test-data/bookingFilterData';
import { attachReqRes } from '../../helpers/reportAttachments';
import { assertMatchesSchema } from '../../helpers/validateSchema';

test.describe('GET /booking', () => {
  let token: string;
  let bookingId: number;
  const seedTarget = uniqueFilterTarget();
  const seedPayload = newBooking(seedTarget);

  test.beforeAll(async ({ request }) => {
    token = await getToken(request);
    const res = await request.post('/booking', { data: seedPayload });
    bookingId = (await res.json()).bookingid;
  });

  test.afterAll(async ({ request }) => {
    await cleanupBookings(request, token, [bookingId]);
  });

  test('lists all booking IDs', { tag: '@smoke' }, async ({ request }, testInfo) => {
    const res = await request.get('/booking');
    await attachReqRes(testInfo, { method: 'GET' }, res);

    expect(res.status()).toBe(200);
    const body = await res.json();
    assertMatchesSchema(body, 'booking_id_list.json');
    expect(body.length).toBeGreaterThan(0);
  });

  test('gets a specific booking by id', async ({ request }, testInfo) => {
    const res = await request.get(`/booking/${bookingId}`);
    await attachReqRes(testInfo, { method: 'GET' }, res);

    expect(res.status()).toBe(200);
    const body = await res.json();
    assertMatchesSchema(body, 'booking.json');
    expect(body.firstname).toBe(seedPayload.firstname);
    expect(body.lastname).toBe(seedPayload.lastname);
    expect(body.bookingdates.checkin).toBe(seedPayload.bookingdates.checkin);
    expect(body.bookingdates.checkout).toBe(seedPayload.bookingdates.checkout);
  });

  test('returns 404 for a deleted booking id', async ({ request }, testInfo) => {
    // Create→delete→verify (avoids guessing a magic ID on a shared API).
    const { bookingid } = await createBookingForTest(request, testInfo);

    const deleteRes = await request.delete(`/booking/${bookingid}`, {
      headers: { Cookie: `token=${token}` },
    });
    expect(deleteRes.status()).toBe(201); // restful-booker returns 201, not 204

    const res = await request.get(`/booking/${bookingid}`);
    await attachReqRes(testInfo, { method: 'GET' }, res, 'GET deleted');

    expect(res.status()).toBe(404);
  });

  test('filters bookings by firstname', async ({ request }, testInfo) => {
    // Same query-param mechanism for lastname/checkin/checkout — one field demonstrates it.
    const endpoint = `/booking?firstname=${seedTarget.firstname}`;
    const res = await request.get(endpoint);
    await attachReqRes(testInfo, { method: 'GET' }, res);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.some((b: { bookingid: number }) => b.bookingid === bookingId)).toBe(true);
  });

  test('returns empty result when filtering by a name that does not exist', async ({ request }, testInfo) => {
    const endpoint = `/booking?firstname=${NON_EXISTENT_FILTER_VALUE}`;
    const res = await request.get(endpoint);
    await attachReqRes(testInfo, { method: 'GET' }, res);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(0);
  });
});
