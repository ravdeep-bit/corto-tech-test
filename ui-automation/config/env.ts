// Centralised env access. Override via shell env or local `.env` (see .env.example).
const BASE_URL = process.env.BASE_URL || 'https://demoqa.com';

export { BASE_URL };
