// HTML-report request/response attachments — triage without opening the trace.
import { APIResponse, TestInfo } from '@playwright/test';

// URL is read from res.url() so callers don't repeat the endpoint.
interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

// Attaches request + response JSON to the HTML report. `label` disambiguates
// multiple calls in the same test (e.g. 'PUT', 'GET verify').
export async function attachReqRes(
  testInfo: TestInfo,
  req: ApiRequest,
  res: APIResponse,
  label?: string,
): Promise<void> {
  const prefix = label ? `${label} — ` : '';

  await testInfo.attach(`${prefix}request`, {
    body: JSON.stringify({ method: req.method, url: res.url(), body: req.body }, null, 2),
    contentType: 'application/json',
  });

  const responseBody = await res.text();
  await testInfo.attach(`${prefix}response`, {
    body: JSON.stringify(
      {
        status: res.status(),
        headers: res.headers(),
        body: tryParseJson(responseBody) ?? responseBody,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
}

// Returns null for plain-text bodies like "Created" from /ping.
function tryParseJson(body: string): unknown | null {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}
