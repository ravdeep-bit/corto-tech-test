// Credential fixtures derived from `config/env.ts` env-or-fallback values.
import { TESTER_USERNAME, TESTER_PASSWORD } from '../config/env';

export const validCredentials = {
  username: TESTER_USERNAME,
  password: TESTER_PASSWORD,
} as const;

export const invalidCredentials = {
  username: TESTER_USERNAME,
  password: 'wrong-password',
} as const;
