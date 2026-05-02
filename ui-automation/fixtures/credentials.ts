// Public-by-design credentials from the test brief. Override via env vars
// (see .env.example); production would read from env/vault only.
const username = process.env.TESTER_USERNAME || 'tester';
const password = process.env.TESTER_PASSWORD || 'Hello4123!';

export const validCredentials = { username, password } as const;

export const invalidCredentials = {
  username,
  password: 'wrong-password',
} as const;
