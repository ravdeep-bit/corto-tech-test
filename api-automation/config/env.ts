// Centralised env access — env-or-fallback for BASE_URL and admin credentials.
const BASE_URL = process.env.BASE_URL || 'https://restful-booker.herokuapp.com';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

export { BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD };
