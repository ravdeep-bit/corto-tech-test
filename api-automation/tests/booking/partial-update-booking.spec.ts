// PATCH /booking/:id — partial update.
import { test, expect } from '@playwright/test';
import { getToken } from '../../clients/auth';
import { cleanupBookings, createBookingForTest } from '../../clients/booking';
import { attachReqRes } from '../../helpers/reportAttachments';
import { assertMatchesSchema } from '../../helpers/validateSchema';

test.describe('PATCH /booking/:id', () => {
  let token: string;
  const createdIds: number[] = [];

  test.beforeAll(async ({ request }) => {
    token = await getToken(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupBookings(request, token, createdIds);
  });

  test(
    'partially updates a booking and leaves other fields untouched',
    { tag: '@smoke' },
    async ({ request }, testInfo) => {
      const { bookingid, payload: original } = await createBookingForTest(request, testInfo);
      createdIds.push(bookingid);

      const patchPayload = { firstname: 'Patched' };
      const patchRes = await request.patch(`/booking/${bookingid}`, {
        headers: { Cookie: `token=${token}` },
        data: patchPayload,
      });
      await attachReqRes(testInfo, { method: 'PATCH', body: patchPayload }, patchRes, 'PATCH');

      expect(patchRes.status(), 'PATCH /booking/:id with valid auth and partial payload returns 200').toBe(200);
      const patchBody = await patchRes.json();
      assertMatchesSchema(patchBody, 'booking.json');
      expect(patchBody.firstname, 'PATCH response reflects the patched firstname').toBe('Patched');
      expect(patchBody.lastname, 'PATCH leaves untouched lastname unchanged').toBe(original.lastname);
      expect(patchBody.totalprice, 'PATCH leaves untouched totalprice unchanged').toBe(original.totalprice);
      expect(patchBody.depositpaid, 'PATCH leaves untouched depositpaid unchanged').toBe(original.depositpaid);

      const getRes = await request.get(`/booking/${bookingid}`);
      await attachReqRes(testInfo, { method: 'GET' }, getRes, 'GET verify');

      expect(getRes.status(), 'GET after PATCH returns 200').toBe(200);
      const getBody = await getRes.json();
      expect(getBody.firstname, 'GET-after-PATCH confirms patched firstname was actually persisted').toBe('Patched');
      expect(getBody.lastname, 'GET-after-PATCH confirms unpatched lastname is preserved').toBe(original.lastname);
    },
  );

  test('rejects partial update without auth token', async ({ request }, testInfo) => {
    const { bookingid } = await createBookingForTest(request, testInfo);
    createdIds.push(bookingid);

    const noAuthPayload = { firstname: 'NoAuth' };
    const res = await request.patch(`/booking/${bookingid}`, { data: noAuthPayload });
    await attachReqRes(testInfo, { method: 'PATCH', body: noAuthPayload }, res);

    expect(res.status(), 'PATCH /booking/:id without auth token returns 403').toBe(403);
  });
});
