// POST /auth — token creation.
import { test, expect } from '@playwright/test';
import { VALID_CREDS, negativeAuthCases } from '../test-data/authData';
import { attachReqRes } from '../helpers/reportAttachments';

test.describe('POST /auth', () => {
  test('returns 200 and a token for valid credentials', { tag: '@smoke' }, async ({ request }, testInfo) => {
    const res = await request.post('/auth', { data: VALID_CREDS });
    await attachReqRes(testInfo, { method: 'POST', body: VALID_CREDS }, res);

    expect(res.status(), 'POST /auth with valid creds returns 200').toBe(200);
    const body = await res.json();
    expect(body, 'response shape is exactly { token: string } — no extra fields permitted').toEqual({
      token: expect.any(String),
    });
    expect(body.token.length, 'token must be a non-empty string').toBeGreaterThan(0);
  });

  // Restful Booker quirk: returns 200 with `{ reason: 'Bad credentials' }` rather
  // than 401. We assert on the body shape, not just status.
  for (const { description, data } of negativeAuthCases) {
    test(`returns 'Bad credentials' for ${description}`, async ({ request }, testInfo) => {
      const res = await request.post('/auth', { data });
      await attachReqRes(testInfo, { method: 'POST', body: data }, res);

      expect(
        res.status(),
        `POST /auth with ${description} returns 200 (Restful Booker quirk; REST-correct 401 tracked as BUG-4)`,
      ).toBe(200);
      expect(
        await res.json(),
        `POST /auth with ${description} returns body { reason: 'Bad credentials' } and no token`,
      ).toEqual({ reason: 'Bad credentials' });
    });
  }

  test('issues a fresh token on every successful auth', async ({ request }, testInfo) => {
    const firstRes = await request.post('/auth', { data: VALID_CREDS });
    await attachReqRes(testInfo, { method: 'POST', body: VALID_CREDS }, firstRes, 'first auth');
    const first = await firstRes.json();

    const secondRes = await request.post('/auth', { data: VALID_CREDS });
    await attachReqRes(testInfo, { method: 'POST', body: VALID_CREDS }, secondRes, 'second auth');
    const second = await secondRes.json();

    expect(first.token, 'first auth call must return a token').toEqual(expect.any(String));
    expect(second.token, 'second auth call must return a token').toEqual(expect.any(String));
    expect(first.token, 'each successful auth must issue a fresh token (server is not caching)').not.toBe(
      second.token,
    );
  });
});
