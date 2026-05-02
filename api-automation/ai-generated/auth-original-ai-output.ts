// Original unmodified AI output — auth test suite.
//
// Prompt used:
//   "Generate Playwright API tests for the POST /auth endpoint of restful-booker.
//    Include positive and negative cases."
//
// Typical AI failure modes visible in this generation:
//   - Hardcoded BASE_URL instead of Playwright `baseURL` config
//   - Hardcoded credentials inline in every test (no reuse)
//   - Asserts the REST-standard 401 for invalid credentials WITHOUT verifying
//     against the live API (restful-booker actually returns 200 — AI guessed)
//   - `toHaveProperty('token')` instead of strict schema with `toEqual`
//   - No edge cases (missing fields, empty strings, null values)
//   - No assertion on the error response body
//   - No token uniqueness check
//   - Inconsistent test names/style

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://restful-booker.herokuapp.com';

test.describe('POST /auth', () => {
  test('should authenticate with valid credentials', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/auth`, {
      data: { username: 'admin', password: 'password123' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('token');
  });

  test('should fail with invalid password', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/auth`, {
      data: { username: 'admin', password: 'wrong-password' },
    });

    // AI guess — REST convention says 401, but the API actually returns 200.
    expect(response.status()).toBe(401);
  });

  test('should fail with unknown username', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/auth`, {
      data: { username: 'unknown', password: 'password123' },
    });

    expect(response.status()).toBe(401);
  });
});
