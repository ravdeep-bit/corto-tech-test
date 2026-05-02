// Auth client — POST /auth wrapper.
import { APIRequestContext } from '@playwright/test';
import { ADMIN_USERNAME, ADMIN_PASSWORD } from '../config/env';

// POST /auth → token. Throws on failure so downstream never sees a null token.
export async function getToken(
  request: APIRequestContext,
  username: string = ADMIN_USERNAME,
  password: string = ADMIN_PASSWORD,
): Promise<string> {
  const res = await request.post('/auth', { data: { username, password } });

  if (res.status() !== 200) {
    throw new Error(`Auth failed: status ${res.status()}, body: ${await res.text()}`);
  }

  const body = await res.json();
  if (!body.token) {
    throw new Error(`Auth failed: token not returned. Body: ${JSON.stringify(body)}`);
  }

  return body.token;
}
