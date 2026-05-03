// POST /booking — create. Positive + negative cases driven from
// `test-data/createBookingCases.ts`. Adding a new scenario is a one-edit
// change to that file, not a code change here.
import { test, expect } from '@playwright/test';
import { getToken } from '../../clients/auth';
import { cleanupBookings } from '../../clients/booking';
import { newBooking } from '../../test-data/bookingData';
import {
  positiveCreateCases,
  negativeCreateCases,
} from '../../test-data/createBookingCases';
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

  for (const { description, override, smoke } of positiveCreateCases) {
    test(
      `creates a booking — ${description}`,
      smoke ? { tag: '@smoke' } : {},
      async ({ request }, testInfo) => {
        const payload = newBooking(override);
        const res = await request.post('/booking', { data: payload });
        await attachReqRes(testInfo, { method: 'POST', body: payload }, res);

        expect(
          res.status(),
          `POST /booking — ${description}: returns 200 (Restful Booker quirk; REST-correct 201 tracked as BUG-1)`,
        ).toBe(200);
        const body = await res.json();
        assertMatchesSchema(body, 'create_booking_response.json');
        createdIds.push(body.bookingid);

        // Response echoes back every field we sent — same check across all
        // positive cases. Optional `additionalneeds` only checked when present.
        expect(body.booking.firstname, `${description}: response echoes firstname`).toBe(payload.firstname);
        expect(body.booking.lastname, `${description}: response echoes lastname`).toBe(payload.lastname);
        expect(body.booking.totalprice, `${description}: response echoes totalprice`).toBe(payload.totalprice);
        expect(body.booking.depositpaid, `${description}: response echoes depositpaid`).toBe(payload.depositpaid);
        expect(body.booking.bookingdates.checkin, `${description}: response echoes checkin`).toBe(
          payload.bookingdates.checkin,
        );
        expect(body.booking.bookingdates.checkout, `${description}: response echoes checkout`).toBe(
          payload.bookingdates.checkout,
        );
        if (payload.additionalneeds !== undefined) {
          expect(body.booking.additionalneeds, `${description}: response echoes additionalneeds`).toBe(
            payload.additionalneeds,
          );
        }
      },
    );
  }

  for (const { description, payload } of negativeCreateCases) {
    test(`rejects booking with ${description}`, async ({ request }, testInfo) => {
      const res = await request.post('/booking', { data: payload as object });
      await attachReqRes(testInfo, { method: 'POST', body: payload }, res);

      expect(
        res.status(),
        `POST /booking with ${description} returns 500 (Restful Booker quirk; REST-correct 400 tracked as BUG-5)`,
      ).toBe(500);
    });
  }
});
