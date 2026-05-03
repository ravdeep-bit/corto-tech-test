// Centralised env access — env-or-fallback for BASE_URL and tester credentials.
// Public-by-design defaults from the test brief. Production would read from env/vault only.
// `dotenv/config` loads `./.env` (gitignored) before any process.env read below;
// shell env still wins because dotenv doesn't overwrite already-set keys.
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'https://demoqa.com';
const TESTER_USERNAME = process.env.TESTER_USERNAME || 'tester';
const TESTER_PASSWORD = process.env.TESTER_PASSWORD || 'Hello4123!';

export { BASE_URL, TESTER_USERNAME, TESTER_PASSWORD };
