// Centralised env access — env-or-fallback for BASE_URL and admin credentials.
// `dotenv/config` loads `./.env` (gitignored) before any process.env read below;
// shell env still wins because dotenv doesn't overwrite already-set keys.
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'https://restful-booker.herokuapp.com';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

export { BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD };
