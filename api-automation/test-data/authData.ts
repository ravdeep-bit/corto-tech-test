// Auth test data — valid creds + parameterised negative-case dataset.
import { ADMIN_USERNAME, ADMIN_PASSWORD } from '../config/env';

// Default admin creds. Override via ADMIN_USERNAME / ADMIN_PASSWORD env vars.
export const VALID_CREDS = {
  username: ADMIN_USERNAME,
  password: ADMIN_PASSWORD,
} as const;

// Loose values so negative cases can pass null/empty/etc.
export type AuthPayload = Partial<{
  username: unknown;
  password: unknown;
}>;

export interface NegativeAuthCase {
  description: string;
  data: AuthPayload;
}

// Negative cases for POST /auth.
export const negativeAuthCases: NegativeAuthCase[] = [
  {
    description: 'invalid password',
    data: { username: ADMIN_USERNAME, password: 'wrong-password' },
  },
  {
    description: 'unknown username',
    data: { username: 'unknown-user', password: ADMIN_PASSWORD },
  },
  {
    description: 'missing password field',
    data: { username: ADMIN_USERNAME },
  },
  {
    description: 'missing username field',
    data: { password: ADMIN_PASSWORD },
  },
  {
    description: 'empty body',
    data: {},
  },
  {
    description: 'empty-string credentials',
    data: { username: '', password: '' },
  },
  {
    description: 'null credentials',
    data: { username: null, password: null },
  },
];
