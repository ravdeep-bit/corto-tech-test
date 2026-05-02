// POST /auth — token creation.
import { test, expect } from '@playwright/test';
import { VALID_CREDS, negativeAuthCases } from '../test-data/authData';
import { attachReqRes } from '../helpers/reportAttachments';

test.describe('POST /auth', () => {
  test('returns 200 and a token for valid credentials', { tag: '@smoke' }, async ({ request }, testInfo) => {
    const res = await request.post('/auth', { data: VALID_CREDS });
    await attachReqRes(testInfo, { method: 'POST', body: VALID_CREDS }, res);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ token: expect.any(String) });
    expect(body.token.length).toBeGreaterThan(0);
  });

  // Restful Booker quirk: returns 200 with `{ reason: 'Bad credentials' }` rather
  // than 401. We assert on the body shape, not just status.
  for (const { description, data } of negativeAuthCases) {
    test(`returns 'Bad credentials' for ${description}`, async ({ request }, testInfo) => {
      const res = await request.post('/auth', { data });
      await attachReqRes(testInfo, { method: 'POST', body: data }, res);

      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({ reason: 'Bad credentials' });
    });
  }

  test('issues a fresh token on every successful auth', async ({ request }, testInfo) => {
    const firstRes = await request.post('/auth', { data: VALID_CREDS });
    await attachReqRes(testInfo, { method: 'POST', body: VALID_CREDS }, firstRes, 'first auth');
    const first = await firstRes.json();

    const secondRes = await request.post('/auth', { data: VALID_CREDS });
    await attachReqRes(testInfo, { method: 'POST', body: VALID_CREDS }, secondRes, 'second auth');
    const second = await secondRes.json();

    expect(first.token).toEqual(expect.any(String));
    expect(second.token).toEqual(expect.any(String));
    expect(first.token).not.toBe(second.token);
  });
});
