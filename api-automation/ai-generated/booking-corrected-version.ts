// Corrected version of booking-original-ai-output.ts, kept as a focused before/after diff.
// What it fixes:
//  - newBooking factory + futureDate helper + Playwright baseURL (no hardcoded data/URLs/dates)
//  - field-by-field echo on the positive case (schema-by-example) instead of fragmented checks
//  - non-overlapping positives + parameterised boundary cases via for-loop over a data array
//  - negatives assert REST-standard 400 — failing test IS the bug indicator (README #10)
//
// What it deliberately does NOT do (kept out of scope to keep the diff readable):
//  - Negative body validation: restful-booker returns plain-text errors on invalid
//    input, so there is no structured error schema worth asserting on. Status code
//    is the only meaningful signal here.
//  - afterAll cleanup of created bookings: omitted to keep this file a compact
//    teaching artefact. Real spec files in the project (e.g. create-booking.spec.ts)
//    use getToken + cleanupBookings to drain createdIds in afterAll.

import { test, expect } from '@playwright/test';
import { newBooking } from '../test-data/bookingData';
import { Booking } from '../clients/booking';

test.describe('POST /booking — corrected', () => {
  test('creates a booking and returns all fields correctly', async ({ request }) => {
    // newBooking() default shape: John Doe, totalprice 100, depositpaid true,
    // checkin tomorrow, checkout +5 days, additionalneeds 'Breakfast'.
    const payload = newBooking();
    const res = await request.post('/booking', { data: payload });

    expect(res.status()).toBe(200);
    const body = await res.json();

    // bookingid is server-generated; the booking object echoes the full payload back.
    expect(body.bookingid).toBeTruthy();
    expect(typeof body.bookingid).toBe('number');
    expect(body.booking.firstname).toBe(payload.firstname);
    expect(body.booking.lastname).toBe(payload.lastname);
    expect(body.booking.totalprice).toBe(payload.totalprice);
    expect(body.booking.depositpaid).toBe(payload.depositpaid);
    expect(body.booking.bookingdates.checkin).toBe(payload.bookingdates.checkin);
    expect(body.booking.bookingdates.checkout).toBe(payload.bookingdates.checkout);
    expect(body.booking.additionalneeds).toBe(payload.additionalneeds);
  });

  test('creates a booking without optional additionalneeds field', async ({ request }) => {
    const payload = newBooking({ additionalneeds: undefined });
    const res = await request.post('/booking', { data: payload });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.bookingid).toBeTruthy();
    expect(body.booking.firstname).toBe(payload.firstname);
  });

  // Boundary cases — adding a new one is a one-line change to this array.
  const boundaryCases: Array<{ name: string; overrides: Partial<Booking> }> = [
    { name: 'zero totalprice', overrides: { totalprice: 0 } },
    { name: 'large totalprice', overrides: { totalprice: 1_000_000 } },
    { name: 'depositpaid false', overrides: { depositpaid: false } },
    { name: 'long firstname', overrides: { firstname: 'A'.repeat(200) } },
  ];

  for (const { name, overrides } of boundaryCases) {
    test(`accepts boundary case: ${name}`, async ({ request }) => {
      const payload = newBooking(overrides);
      const res = await request.post('/booking', { data: payload });

      expect(res.status()).toBe(200);
      const body = await res.json();
      for (const key of Object.keys(overrides) as (keyof Booking)[]) {
        expect(body.booking[key]).toEqual(overrides[key]);
      }
    });
  }

  test('rejects booking with missing required firstname', async ({ request }) => {
    // Asserts REST-correct 400. Will fail until API is fixed (returns 500 today). See README #10.
    const payload = newBooking();
    delete (payload as Partial<Booking>).firstname;

    const res = await request.post('/booking', { data: payload });
    expect(res.status()).toBe(400);
  });

  test('rejects booking with completely empty payload', async ({ request }) => {
    // REST-standard 400 (see above).
    const res = await request.post('/booking', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('rejects booking with non-numeric totalprice', async ({ request }) => {
    // Type-coercion abuse — REST-standard 400.
    const payload = { ...newBooking(), totalprice: 'not a number' };
    const res = await request.post('/booking', { data: payload });
    expect(res.status()).toBe(400);
  });
});
