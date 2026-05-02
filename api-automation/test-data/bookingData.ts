// Booking payload factory — defaults + override pattern.
import { Booking } from '../clients/booking';

// restful-booker accepts YYYY-MM-DD.
const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10);

// Future-relative dates so test data never goes stale.
const futureDate = (daysFromToday: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return toIsoDate(d);
};

// Booking payload factory. Override any field, e.g. newBooking({ totalprice: 0 }).
export const newBooking = (overrides: Partial<Booking> = {}): Booking => ({
  firstname: 'John',
  lastname: 'Doe',
  totalprice: 100,
  depositpaid: true,
  bookingdates: {
    checkin: futureDate(1),
    checkout: futureDate(5),
  },
  additionalneeds: 'Breakfast',
  ...overrides,
});
