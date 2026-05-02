// Corrected auth test suite — produced via thorough QA review of the AI output.
//
// Improvements applied (each addresses a specific gap in `auth-original-ai-output.ts`):
//   1. Use Playwright `baseURL` from config — relative paths in tests
//   2. Credentials externalised to `test-data/authData.ts` (sourced from env vars)
//      — single source of truth, env-overridable, no duplication
//   3. Negative cases parameterised via a data array + for loop — adding a new
//      case is a one-line change to authData.ts, not a copy-paste of test code
//   4. Strict schema validation via `toEqual({...})` — no extra/missing fields slip through
//   5. Empirically verified actual response codes (200 + `Bad credentials` reason)
//      and asserted those — instead of AI's incorrect `401` guess. The 401-expectation
//      is preserved as a separate bug-surfacing test in `tests/bugs/rest-compliance.spec.ts`.
//   6. Edge cases AND type-mismatch cases consolidated in one dataset — `AuthPayload`
//      uses `unknown` for values so wrong types fit the same shape
//   7. Consistent assertions across all negative tests (every one checks `reason`)
//   8. Token uniqueness check — confirms tokens aren't cached/reused
//   9. Smoke tag on the critical happy path

import { test, expect } from '@playwright/test';
import { VALID_CREDS, negativeAuthCases } from '../test-data/authData';

test.describe('POST /auth — corrected', () => {
  test('returns 200 and a token for valid credentials', { tag: '@smoke' }, async ({ request }) => {
    const res = await request.post('/auth', { data: VALID_CREDS });

    expect(res.status()).toBe(200);
    const body = await res.json();

    // Strict schema — response must be EXACTLY `{ token: <string> }`.
    expect(body).toEqual({ token: expect.any(String) });
    expect(body.token.length).toBeGreaterThan(0);
  });

  // Data-driven negative cases — covers wrong values, missing fields, null/empty,
  // and type mismatches. Single loop because the API behaviour is uniform across
  // all of them: 200 + `{ reason: 'Bad credentials' }`.
  for (const { description, data } of negativeAuthCases) {
    test(`returns 'Bad credentials' for ${description}`, async ({ request }) => {
      const res = await request.post('/auth', { data });

      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({ reason: 'Bad credentials' });
    });
  }

  test('issues a fresh token on every successful auth', async ({ request }) => {
    const first = await (await request.post('/auth', { data: VALID_CREDS })).json();
    const second = await (await request.post('/auth', { data: VALID_CREDS })).json();

    expect(first.token).toEqual(expect.any(String));
    expect(second.token).toEqual(expect.any(String));
    expect(first.token).not.toBe(second.token);
  });
});
