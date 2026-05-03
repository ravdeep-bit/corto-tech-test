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

    expect(res.status(), 'GET /booking returns 200').toBe(200);
    const body = await res.json();
    assertMatchesSchema(body, 'booking_id_list.json');
    expect(body.length, 'shared sandbox always has at least one booking').toBeGreaterThan(0);
  });

  test('gets a specific booking by id', async ({ request }, testInfo) => {
    const res = await request.get(`/booking/${bookingId}`);
    await attachReqRes(testInfo, { method: 'GET' }, res);

    expect(res.status(), 'GET /booking/:id with valid id returns 200').toBe(200);
    const body = await res.json();
    assertMatchesSchema(body, 'booking.json');
    expect(body.firstname, 'GET response firstname matches what was sent on create').toBe(seedPayload.firstname);
    expect(body.lastname, 'GET response lastname matches what was sent on create').toBe(seedPayload.lastname);
    expect(body.bookingdates.checkin, 'GET response checkin matches what was sent on create').toBe(
      seedPayload.bookingdates.checkin,
    );
    expect(body.bookingdates.checkout, 'GET response checkout matches what was sent on create').toBe(
      seedPayload.bookingdates.checkout,
    );
  });

  test('returns 404 for a deleted booking id', async ({ request }, testInfo) => {
    // Create→delete→verify (avoids guessing a magic ID on a shared API).
    const { bookingid } = await createBookingForTest(request, testInfo);

    const deleteRes = await request.delete(`/booking/${bookingid}`, {
      headers: { Cookie: `token=${token}` },
    });
    expect(
      deleteRes.status(),
      'DELETE /booking/:id returns 201 (Restful Booker quirk; REST-correct 204 tracked as BUG-2)',
    ).toBe(201);

    const res = await request.get(`/booking/${bookingid}`);
    await attachReqRes(testInfo, { method: 'GET' }, res, 'GET deleted');

    expect(res.status(), 'GET /booking/:id on a deleted id returns 404').toBe(404);
  });

  test('filters bookings by firstname', async ({ request }, testInfo) => {
    // Seed firstname is per-run-unique (`Alice<timestamp>`). If the API actually
    // filters, the result must be exactly our one booking; if it ignored the
    // filter, we'd see every booking on the shared sandbox. Length-1 is the
    // strongest assertion possible — the response shape (`[{ bookingid }]`)
    // doesn't echo back the name field for a direct value comparison.
    const res = await request.get(`/booking?firstname=${seedPayload.firstname}`);
    await attachReqRes(testInfo, { method: 'GET' }, res);

    expect(res.status(), 'GET /booking?firstname=… returns 200').toBe(200);
    const body = await res.json();
    assertMatchesSchema(body, 'booking_id_list.json');
    expect(
      body,
      'per-run-unique firstname must narrow result to exactly our seeded booking — proves the API actually filtered',
    ).toEqual([{ bookingid: bookingId }]);
  });

  test('returns empty result when filtering by a name that does not exist', async ({ request }, testInfo) => {
    const endpoint = `/booking?firstname=${NON_EXISTENT_FILTER_VALUE}`;
    const res = await request.get(endpoint);
    await attachReqRes(testInfo, { method: 'GET' }, res);

    expect(res.status(), 'GET /booking?firstname=… returns 200 even when nothing matches').toBe(200);
    const body = await res.json();
    expect(body, 'unmatched firstname filter returns empty array (proves filter is doing real work)').toHaveLength(0);
  });
});
