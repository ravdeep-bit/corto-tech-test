// /booking helpers — setup factory + afterAll cleanup. Owns the `Booking` type
// (kept in sync with schemas/booking.json by hand — small surface, one definition).
import { APIRequestContext, TestInfo } from '@playwright/test';
import { newBooking } from '../test-data/bookingData';
import { attachReqRes } from '../helpers/reportAttachments';

export interface BookingDates {
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
}

export interface Booking {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
  additionalneeds?: string;
}

// Creates a booking for tests that need an existing one to act on
// (PUT / PATCH / DELETE / GET-by-id). Tests of POST /booking itself call
// `request.post` directly so the operation under test stays in the spec.
export async function createBookingForTest(
  request: APIRequestContext,
  testInfo: TestInfo,
  overrides?: Partial<Booking>,
): Promise<{ bookingid: number; payload: Booking }> {
  const payload = newBooking(overrides);
  const res = await request.post('/booking', { data: payload });
  await attachReqRes(testInfo, { method: 'POST', body: payload }, res, 'setup create');

  if (res.status() !== 200) {
    throw new Error(`Setup failed: POST /booking returned ${res.status()}, body: ${await res.text()}`);
  }
  const body = await res.json();
  if (!body.bookingid || typeof body.bookingid !== 'number') {
    throw new Error(`Setup failed: bookingid missing or wrong type. Body: ${JSON.stringify(body)}`);
  }

  return { bookingid: body.bookingid, payload };
}

// Deletes every booking ID in the `ids` array. Errors are swallowed so a
// flaky cleanup can't mask the real test failure. Use from afterAll.
export async function cleanupBookings(request: APIRequestContext, token: string | null, ids: number[]): Promise<void> {
  if (!token) return;
  while (ids.length > 0) {
    const id = ids.pop()!;
    await request.delete(`/booking/${id}`, { headers: { Cookie: `token=${token}` } }).catch(() => {});
  }
}
