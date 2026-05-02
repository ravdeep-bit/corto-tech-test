# Restful Booker API suite — design depth

Project-specific design depth for the API suite. **For setup, running tests, configuration, CI/CD, AI disclosure, and the project structure tree, see the [root README](../README.md).**

**Target API**: https://restful-booker.herokuapp.com
**API docs**: https://restful-booker.herokuapp.com/apidoc/index.html

## API-specific decisions

- **Cookie-format auth** (`Cookie: token=<token>`) for mutations — chosen over HTTP Basic to match the docs' canonical example.
- **`fullyParallel: true` is safe** because every test creates its own booking and `beforeAll` only fetches a token.
- **Heroku cold-starts tolerated, not retried locally** — CI enables 2 retries; local runs fail fast.

## Test coverage

30 main tests + 6 bug-surfacing tests, covering all 8 restful-booker endpoints.

| Endpoint | Tests | Highlights |
|---|---|---|
| GET /ping | 1 | Status 201, plain-text body "Created" |
| POST /auth | 9 | Valid creds → token; 7 negative-creds cases (invalid password, unknown user, missing fields, empty body, empty strings, null); fresh token on every successful call |
| POST /booking | 5 | Full payload, optional field omitted, zero price, missing required field, empty payload |
| GET /booking | 5 | List, get-by-id, 404 after delete, filter-by-firstname (verifies created ID is matched), no-such-user empty-result negative |
| PUT /booking/:id | 3 | Full update + GET-after-PUT validation, 403 without auth, 405 on deleted ID |
| PATCH /booking/:id | 2 | Partial update + GET-after-PATCH validation, 403 without auth |
| DELETE /booking/:id | 4 | Delete + GET-after-DELETE returns 404, 403 without auth, 403 with invalid token, 405 on second delete (idempotency) |
| E2E lifecycle | 1 | create → get → PUT → PATCH → DELETE in a single chained test |
| Bug-surfacing | 6 | REST-correct status codes asserted; intentionally failing |

## Bug-surfacing tests (`tests/bugs/`)

Asserts what the API *should* return per REST/HTTP. These tests fail intentionally — failures *are* the bug tickets.

| # | Bug | Asserted | Actual |
|---|---|---|---|
| BUG-1 | `POST /booking` should return 201 Created | `toBe(201)` | 200 |
| BUG-2 | `DELETE /booking/:id` should return 204 No Content | `toBe(204)` | 201 |
| BUG-3 | `GET /ping` should return 200 OK | `toBe(200)` | 201 |
| BUG-4 | `POST /auth` with invalid creds should return 401 Unauthorized | `toBe(401)` | 200 |
| BUG-5 | `POST /booking` with missing required fields should return 400 Bad Request | `toBe(400)` | 500 |
| BUG-6 | Mutations on a non-existent booking ID should return 404 Not Found | `toBe(404)` | 405 |

## Why direct `request` calls in tests

Tests in this project call Playwright's built-in `{ request }` fixture directly rather than going through Service Object wrappers. For an API surface this small, the wrappers add boilerplate without value. Helpers exist only for things genuinely shared across specs: `clients/auth.ts` (`getToken`), `clients/booking.ts` (setup/cleanup + `Booking` type), `helpers/validateSchema.ts` (`assertMatchesSchema(body, 'foo.json')`), and the JSON Schema files in `schemas/` (every schema is `additionalProperties: false` so unexpected fields fail validation). Specific value assertions stay inline in the tests where they're read.

## Inferred field requirements (POST /booking)

Confirmed via Postman probes — all `Booking` fields are required except `additionalneeds` (omitting any required field returns 500; omitting `additionalneeds` returns 200).

## API deviations from REST conventions

Behaviours where the target API departs from standard REST conventions. The main test suite asserts what the API does (so the suite is green); the bug-surfacing suite asserts what it *should* do (so failures track the bugs).

| # | Deviation | Asserted in main suite | Surfaced as bug in `tests/bugs/` |
|---|---|---|---|
| 1 | `POST /auth` invalid creds returns 200, not 401 | `auth.spec.ts` (asserts 200 + no token) | BUG-4 |
| 2 | `GET /ping` returns 201, not 200 | `ping.spec.ts` (asserts 201) | BUG-3 |
| 3 | `GET /ping` body is plain text "Created", not JSON | `ping.spec.ts` (uses `.text()`) | — |
| 4 | `POST /booking` returns 200, not 201 | `create-booking.spec.ts` (asserts 200) | BUG-1 |
| 5 | `DELETE /booking/:id` returns 201, not 204 | `delete-booking.spec.ts` (asserts 201) | BUG-2 |
| 6 | `PUT` requires full payload (partial returns 400) | All PUT tests pass a complete `newBooking()` | — |
| 7 | `PUT/PATCH/DELETE` require auth (cookie or basic) | All mutating tests send `Cookie: token=...` | — |
| 8 | Mutations on non-existent IDs return 405 (REST-correct: 404) | Main specs assert 405 | BUG-6 |
| 9 | `GET /booking` returns array of `{ bookingid }` only | List tests assert this shape | — |
| 10 | Missing required fields on `POST /booking` return 500, not 400 | — | BUG-5 |
| 11 | Heroku cold-start latency (15–30s on first request) | 60s test timeout absorbs it | — |

## Future work / production considerations

Out of scope for this submission, but the natural next layers for a real production API:

- **Multi-environment config** — separate dev/staging/prod targets keyed off `NODE_ENV` or environment-prefixed env vars, with credentials always injected from CI secret stores or a vault.
- **Security testing** — auth fuzzing (malformed tokens, expired sessions, privilege escalation), injection probes (SQL, NoSQL, command), rate-limit assertions, CORS verification, and a security-headers audit (CSP, HSTS, X-Content-Type-Options).
- **Load / stress testing** — k6 or Artillery scenarios to assert performance budgets (P95 latency, error rate under concurrency) and degradation behaviour at scale.


