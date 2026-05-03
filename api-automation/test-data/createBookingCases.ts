// POST /booking parameterised cases.
//
// Positive cases live in TypeScript because they use `Partial<Booking>` overrides
// (and `additionalneeds: undefined` to express field-omission, which JSON can't
// represent — `null` would be sent on the wire instead of omitting the key).
//
// Negative cases live in `negativeBookingPayloads.json` — pure static data, no
// env coupling, no runtime computation. The test asserts a 500 status which the
// API returns on missing required fields *before* validating dates, so the
// hardcoded far-future dates in the JSON don't go stale.
import { Booking } from '../clients/booking';
import negativeBookingPayloads from './negativeBookingPayloads.json';

export interface CreateBookingPositiveCase {
  description: string;
  override: Partial<Booking>;
  smoke?: boolean;
}

// Positive cases share the same flow: POST → 200 → schema-valid → echo check.
// `override` is applied via `newBooking(override)`. `smoke: true` tags the
// canonical happy-path test for inclusion in the @smoke gate.
export const positiveCreateCases: CreateBookingPositiveCase[] = [
  { description: 'full payload with all fields', override: {}, smoke: true },
  { description: 'optional additionalneeds omitted', override: { additionalneeds: undefined } },
  { description: 'zero totalprice (boundary value)', override: { totalprice: 0 } },
];

export interface CreateBookingNegativeCase {
  description: string;
  payload: unknown;
}

// Negative cases share the same flow: POST → 500 (Restful Booker quirk;
// REST-correct 400 tracked as BUG-5). Loaded from JSON so adding a new case
// is a one-line edit in `negativeBookingPayloads.json`, not a code change.
export const negativeCreateCases: CreateBookingNegativeCase[] = negativeBookingPayloads;
