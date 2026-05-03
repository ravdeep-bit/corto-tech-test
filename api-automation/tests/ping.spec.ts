// GET /ping — health check. Trivial endpoint but a useful smoke gate.
import { test, expect } from '@playwright/test';
import { attachReqRes } from '../helpers/reportAttachments';

test.describe('GET /ping', () => {
  // Restful Booker's /ping returns 201 (yes, really — it's documented).
  // Useful as an "is the API up at all" check before the rest of the suite.
  // REST-correct 200 tracked as BUG-3.
  test('returns 201 with plain-text body "Created"', { tag: '@smoke' }, async ({ request }, testInfo) => {
    const res = await request.get('/ping');
    await attachReqRes(testInfo, { method: 'GET' }, res);

    expect(res.status(), 'GET /ping returns 201 (Restful Booker quirk; REST-correct 200 tracked as BUG-3)').toBe(201);
    expect(await res.text(), 'GET /ping body is plain text "Created"').toBe('Created');
  });
});
