// Original unmodified AI output — demonstrating common AI generation flaws.
//
// AI tool: Claude (Sonnet 4.5).
// Prompt used:
//   "Generate Playwright API tests for the POST /booking endpoint of restful-booker
//    in TypeScript. Include positive and negative test cases."
//
// The corrections in `booking-corrected-version.ts`
// show what review closes between AI's first draft and production-ready code.
//
// AI typically produces workable code with several anti-patterns:
//   - Hardcoded fixture data instead of a factory
//   - Hardcoded BASE_URL when Playwright provides `baseURL` via config
//   - Hardcoded future dates that silently roll into the past as time passes
//     (payload data should be future-relative, e.g. today + N)
//   - Weak negative assertions (single status code, no body validation)
//   - No test isolation discipline (no fresh data per test, no cleanup)
//   - Asserts the wrong status (400 for missing fields) by assuming REST
//     convention rather than empirically verifying — actual API returns 500

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://restful-booker.herokuapp.com';

test.describe('POST /booking', () => {
  test('should create a booking successfully', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/booking`, {
      data: {
        firstname: 'John',
        lastname: 'Doe',
        totalprice: 150,
        depositpaid: true,
        bookingdates: {
          checkin: '2026-05-01',
          checkout: '2026-05-08',
        },
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('bookingid');
    expect(body).toHaveProperty('booking');
  });

  test('should reject missing firstname', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/booking`, {
      data: {
        lastname: 'Doe',
        totalprice: 150,
        depositpaid: true,
        bookingdates: {
          checkin: '2026-05-01',
          checkout: '2026-05-08',
        },
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should reject invalid data', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/booking`, {
      data: {
        firstname: 'John',
        lastname: 'Doe',
        totalprice: 'not a number',
        depositpaid: true,
        bookingdates: {
          checkin: '2026-05-01',
          checkout: '2026-05-08',
        },
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should return created booking data', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/booking`, {
      data: {
        firstname: 'Jane',
        lastname: 'Smith',
        totalprice: 200,
        depositpaid: false,
        bookingdates: {
          checkin: '2026-06-01',
          checkout: '2026-06-10',
        },
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.booking.firstname).toBe('Jane');
    expect(body.booking.lastname).toBe('Smith');
  });

  test('should handle additionalneeds field', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/booking`, {
      data: {
        firstname: 'Bob',
        lastname: 'Johnson',
        totalprice: 300,
        depositpaid: true,
        bookingdates: {
          checkin: '2026-07-01',
          checkout: '2026-07-05',
        },
        additionalneeds: 'Late checkout',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.booking.additionalneeds).toBe('Late checkout');
  });
});
