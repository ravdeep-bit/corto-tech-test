// PUT /booking/:id — full update.
import { test, expect } from '@playwright/test';
import { getToken } from '../../clients/auth';
import { cleanupBookings, createBookingForTest } from '../../clients/booking';
import { newBooking } from '../../test-data/bookingData';
import { attachReqRes } from '../../helpers/reportAttachments';
import { assertMatchesSchema } from '../../helpers/validateSchema';

test.describe('PUT /booking/:id', () => {
  let token: string;
  const createdIds: number[] = [];

  test.beforeAll(async ({ request }) => {
    token = await getToken(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupBookings(request, token, createdIds);
  });

  test('updates a booking with valid token and full payload', { tag: '@smoke' }, async ({ request }, testInfo) => {
    const { bookingid } = await createBookingForTest(request, testInfo);
    createdIds.push(bookingid);

    const updatedPayload = newBooking({
      firstname: 'Jane',
      lastname: 'Smith',
      totalprice: 250,
      depositpaid: false,
      additionalneeds: 'Late checkout',
    });

    const putRes = await request.put(`/booking/${bookingid}`, {
      headers: { Cookie: `token=${token}` },
      data: updatedPayload,
    });
    await attachReqRes(testInfo, { method: 'PUT', body: updatedPayload }, putRes, 'PUT');

    expect(putRes.status()).toBe(200);
    const putBody = await putRes.json();
    assertMatchesSchema(putBody, 'booking.json');
    expect(putBody.firstname).toBe('Jane');
    expect(putBody.lastname).toBe('Smith');
    expect(putBody.totalprice).toBe(250);
    expect(putBody.depositpaid).toBe(false);
    expect(putBody.additionalneeds).toBe('Late checkout');

    const getRes = await request.get(`/booking/${bookingid}`);
    await attachReqRes(testInfo, { method: 'GET' }, getRes, 'GET verify');

    expect(getRes.status()).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.firstname).toBe('Jane');
    expect(getBody.lastname).toBe('Smith');
    expect(getBody.totalprice).toBe(250);
    expect(getBody.depositpaid).toBe(false);
  });

  test('rejects update without auth token', async ({ request }, testInfo) => {
    const { bookingid } = await createBookingForTest(request, testInfo);
    createdIds.push(bookingid);

    const noAuthPayload = newBooking({ firstname: 'NoAuth' });
    const res = await request.put(`/booking/${bookingid}`, { data: noAuthPayload });
    await attachReqRes(testInfo, { method: 'PUT', body: noAuthPayload }, res);

    expect(res.status()).toBe(403);
  });

  test('returns 405 when updating a deleted (non-existent) booking', async ({ request }, testInfo) => {
    // Create+delete to get a deterministically-missing ID. API returns 405,
    // not REST-correct 404 — tracked in BUG-6.
    const { bookingid } = await createBookingForTest(request, testInfo);
    const deleteRes = await request.delete(`/booking/${bookingid}`, {
      headers: { Cookie: `token=${token}` },
    });
    expect(deleteRes.status()).toBe(201);

    const payload = newBooking();
    const res = await request.put(`/booking/${bookingid}`, {
      headers: { Cookie: `token=${token}` },
      data: payload,
    });
    await attachReqRes(testInfo, { method: 'PUT', body: payload }, res);

    expect(res.status()).toBe(405);
  });
});
