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

    expect(putRes.status(), 'PUT /booking/:id with valid auth and full payload returns 200').toBe(200);
    const putBody = await putRes.json();
    assertMatchesSchema(putBody, 'booking.json');
    expect(putBody.firstname, 'PUT response reflects updated firstname').toBe('Jane');
    expect(putBody.lastname, 'PUT response reflects updated lastname').toBe('Smith');
    expect(putBody.totalprice, 'PUT response reflects updated totalprice').toBe(250);
    expect(putBody.depositpaid, 'PUT response reflects updated depositpaid').toBe(false);
    expect(putBody.additionalneeds, 'PUT response reflects updated additionalneeds').toBe('Late checkout');

    const getRes = await request.get(`/booking/${bookingid}`);
    await attachReqRes(testInfo, { method: 'GET' }, getRes, 'GET verify');

    expect(getRes.status(), 'GET after PUT returns 200').toBe(200);
    const getBody = await getRes.json();
    expect(getBody.firstname, 'GET-after-PUT confirms firstname was actually persisted').toBe('Jane');
    expect(getBody.lastname, 'GET-after-PUT confirms lastname was actually persisted').toBe('Smith');
    expect(getBody.totalprice, 'GET-after-PUT confirms totalprice was actually persisted').toBe(250);
    expect(getBody.depositpaid, 'GET-after-PUT confirms depositpaid was actually persisted').toBe(false);
  });

  test('rejects update without auth token', async ({ request }, testInfo) => {
    const { bookingid } = await createBookingForTest(request, testInfo);
    createdIds.push(bookingid);

    const noAuthPayload = newBooking({ firstname: 'NoAuth' });
    const res = await request.put(`/booking/${bookingid}`, { data: noAuthPayload });
    await attachReqRes(testInfo, { method: 'PUT', body: noAuthPayload }, res);

    expect(res.status(), 'PUT /booking/:id without auth token returns 403').toBe(403);
  });

  test('returns 405 when updating a deleted (non-existent) booking', async ({ request }, testInfo) => {
    // Create+delete to get a deterministically-missing ID. API returns 405,
    // not REST-correct 404 — tracked in BUG-6.
    const { bookingid } = await createBookingForTest(request, testInfo);
    const deleteRes = await request.delete(`/booking/${bookingid}`, {
      headers: { Cookie: `token=${token}` },
    });
    expect(
      deleteRes.status(),
      'setup: DELETE returns 201 (Restful Booker quirk; REST-correct 204 tracked as BUG-2)',
    ).toBe(201);

    const payload = newBooking();
    const res = await request.put(`/booking/${bookingid}`, {
      headers: { Cookie: `token=${token}` },
      data: payload,
    });
    await attachReqRes(testInfo, { method: 'PUT', body: payload }, res);

    expect(
      res.status(),
      'PUT /booking/:id on a deleted id returns 405 (Restful Booker quirk; REST-correct 404 tracked as BUG-6)',
    ).toBe(405);
  });
});
