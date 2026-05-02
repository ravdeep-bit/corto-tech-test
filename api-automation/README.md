# Restful Booker API Tests

Playwright + TypeScript API automation suite for the Restful Booker API. Written in a straightforward style — direct `request` calls in tests, simple data builders, no heavy abstractions.

**Target API**: https://restful-booker.herokuapp.com
**API docs**: https://restful-booker.herokuapp.com/apidoc/index.html

## Submission decisions

Listed up front so a reviewer doesn't have to infer them from code:

- **Two parallel test suites** because the target API has known REST-convention deviations (wrong status codes, schema mismatches). The **main suite** (`tests/auth`, `tests/health`, `tests/booking`) asserts what the API *does today* so smoke runs stay green; the **bug-surfacing suite** (`tests/bugs/rest-compliance.spec.ts`) asserts what it *should do* per REST/HTTP — those failures are the bug tickets.
- **Empirical exploration** via Postman/curl filled in ambiguous docs (e.g., which `POST /booking` fields are required). See *Inferred field requirements* below.
- **Cookie-format auth** (`Cookie: token=<token>`) for mutations — chosen over HTTP Basic to match the docs' canonical example.
- **`fullyParallel: true` is safe** because every test creates its own booking and `beforeAll` only fetches a token.
- **External libraries beyond Playwright + TypeScript: `ajv` + `ajv-formats`** for JSON Schema validation. Schemas live as `.json` files in `schemas/` — language-agnostic contract artefacts a reviewer can read in 10 seconds without TS knowledge. The `Booking` TypeScript type is hand-maintained alongside `schemas/booking.json` (small surface; would generate via `json-schema-to-typescript` at scale). No `faker`, no `dotenv`.
- **Heroku cold-starts tolerated, not retried locally** — CI enables 2 retries; local runs fail fast.

## Quick start

Requires Node.js 18+.

```bash
npm install
```

## Running tests

```bash
npm test                 # main suite — excludes @bugs (the suite stays green)
npm run test:all         # everything, including @bugs (some tests will fail intentionally)
npm run test:smoke       # only @smoke-tagged critical paths
npm run test:bugs        # only @bugs-tagged REST-compliance tests (all expected to fail)
npm run test:headed      # tests with browser visible
npm run test:report      # open the last HTML report
npm run lint             # tsc --noEmit
```

Run a specific spec:

```bash
npx playwright test tests/booking/create-booking.spec.ts
```

## Configuration

Default values are baked in. Override via shell environment variables if needed:

```bash
BASE_URL=https://restful-booker.herokuapp.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password123
```

In production these would come from the CI secret store or a vault, not source.

## Project structure

```
api-automation/
├── playwright.config.ts        Centralised timeouts, baseURL, reporters
├── package.json
├── tsconfig.json
├── README.md
├── .github/workflows/api-tests.yml   CI pipeline
├── tests/
│   ├── auth.spec.ts                      POST /auth (positive + negative)
│   ├── ping.spec.ts                      GET /ping
│   ├── booking/
│   │   ├── create-booking.spec.ts        POST /booking (positive + negative + edge cases)
│   │   ├── get-booking.spec.ts           GET /booking + /booking/:id (with filters)
│   │   ├── update-booking.spec.ts        PUT /booking/:id (with auth + 403 + non-existent)
│   │   ├── partial-update-booking.spec.ts  PATCH /booking/:id (with auth + 403)
│   │   ├── delete-booking.spec.ts        DELETE /booking/:id (with auth + 403 + verify)
│   │   └── data-flow.spec.ts             E2E lifecycle: create → get → put → patch → delete
│   └── bugs/
│       └── rest-compliance.spec.ts       Bug-surfacing tests (fail intentionally — see below)
├── clients/
│   ├── auth.ts                           getToken(request)
│   └── booking.ts                        createBookingForTest, cleanupBookings (re-exports Booking type)
├── schemas/
│   ├── booking.json                      JSON Schema: Booking object contract
│   ├── create_booking_response.json      JSON Schema: POST /booking response (refs booking.json)
│   └── booking_id_list.json              JSON Schema: GET /booking response (array of {bookingid})
├── helpers/
│   ├── reportAttachments.ts              attachReqRes — request/response attachments for HTML report
│   └── validateSchema.ts                 assertMatchesSchema(data, 'foo.json') — ajv-backed schema check
├── test-data/
│   └── bookingData.ts                    Simple data factory with overrides
├── config/
│   └── env.ts                            Centralised env access (BASE_URL, default creds)
└── ai-generated/                         Part B: AI-generated code analysis
    ├── README.md
    ├── booking-original-ai-output.ts
    ├── booking-corrected-version.ts
    ├── auth-original-ai-output.ts
    └── auth-corrected-version.ts
```

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
| Bug-surfacing | 6 | REST-correct status codes asserted; tests fail until API is fixed |

## Bug-surfacing tests (`tests/bugs/`)

A dedicated spec file documents the API's REST deviations as failing tests. Each test asserts what the API *should* return per REST/HTTP convention. Failures are intentional — the failures are the bug tickets.

| # | Bug | Asserted | Actual |
|---|---|---|---|
| BUG-1 | `POST /booking` should return 201 Created | `toBe(201)` | 200 |
| BUG-2 | `DELETE /booking/:id` should return 204 No Content | `toBe(204)` | 201 |
| BUG-3 | `GET /ping` should return 200 OK | `toBe(200)` | 201 |
| BUG-4 | `POST /auth` with invalid creds should return 401 Unauthorized | `toBe(401)` | 200 |
| BUG-5 | `POST /booking` with missing required fields should return 400 Bad Request | `toBe(400)` | 500 |
| BUG-6 | Mutations on a non-existent booking ID should return 404 Not Found | `toBe(404)` | 405 |

These are tagged `@bugs`. By default, `npm test` *excludes* `@bugs` so the main suite is green. Run `npm run test:bugs` to see only the bugs, or `npm run test:all` to run everything including the intentional failures.

When the API is fixed, the corresponding bug test starts passing — no annotation removal needed; just close the bug ticket.

## Design notes

### Why direct `request` calls in tests

Tests in this project call Playwright's built-in `{ request }` fixture directly rather than going through Service Object wrappers. For an API surface this small, the wrappers add boilerplate without value. Helpers exist only for things genuinely shared across specs: `clients/auth.ts` (`getToken`), `clients/booking.ts` (setup/cleanup + `Booking` type), `helpers/validateSchema.ts` (`assertMatchesSchema(body, 'foo.json')`), and the JSON Schema files in `schemas/` (every schema is `additionalProperties: false` so unexpected fields fail validation). Specific value assertions stay inline in the tests where they're read.

### Test isolation

Each test creates its own booking where it needs one — `beforeAll` is only used to acquire an auth token, never to create shared mutable data. This makes the suite safe to run with `fullyParallel: true` (default in `playwright.config.ts`).

### Centralised timeouts

All timeouts live in `playwright.config.ts`. Test code never passes explicit `{ timeout: ... }` arguments.

| Setting | Value | What it covers |
|---|---|---|
| `timeout` | 60s | Per-test (absorbs Heroku cold-start) |
| `expect.timeout` | 10s | Per-assertion |
| `actionTimeout` | 15s | Per-action |
| `navigationTimeout` | 30s | Per-navigation |

### Tagging strategy

| Tag | Purpose | Run with |
|---|---|---|
| `@smoke` | Critical happy path per area (one per spec) | `npm run test:smoke` |
| `@bugs` | REST-compliance bug-surfacing tests | `npm run test:bugs` |

### Data factory

`test-data/bookingData.ts` exports `newBooking(overrides?)` returning a fresh `Booking` object with sensible defaults. Tests pass overrides where they need specific values:

```typescript
const payload = newBooking({ firstname: 'Jane', totalprice: 0 });
```

No faker — basic JS-readable defaults that match what most cases need.

## Inferred field requirements (POST /booking)

The API documentation lists fields but doesn't mark which are required vs optional. The table below was confirmed by sending requests with each field omitted in Postman and observing the API's response.

| Field | Required? | How confirmed |
|---|---|---|
| `firstname` | Required | API returns 500 when omitted (should be 400 per REST — see deviation #10) |
| `lastname` | Required | API returns 500 when omitted (should be 400 per REST — see deviation #10) |
| `totalprice` | Required | API returns 500 when omitted (should be 400 per REST — see deviation #10) |
| `depositpaid` | Required | API returns 500 when omitted (should be 400 per REST — see deviation #10) |
| `bookingdates.checkin` | Required | API returns 500 when omitted (should be 400 per REST — see deviation #10) |
| `bookingdates.checkout` | Required | API returns 500 when omitted (should be 400 per REST — see deviation #10) |
| `additionalneeds` | Optional | API returns 200 when omitted (test in `create-booking.spec.ts` passes) |

## API deviations from REST conventions

These are behaviours where the target API departs from standard REST conventions. The main test suite asserts what the API does (so the suite is green); the bug-surfacing suite asserts what it *should* do (so failures track the bugs).

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

## CI/CD

`.github/workflows/api-tests.yml` runs on push/PR to `main` and `develop`:

1. Install Node.js 18 and dependencies
2. Run `npm test` (excludes `@bugs` — main suite stays green)
3. Optionally run `npm run test:bugs` as a separate non-blocking step to track bug status over time
4. Upload the HTML report as a build artifact

`CI=true` enables retries (2 per test) so transient Heroku cold-starts don't fail the build. Local runs do not retry — fast, honest signal.

## Future work / production considerations

Out of scope for this submission, but the natural next layers for a real production API:

- **Generated TypeScript types from JSON Schema** — currently `Booking` is hand-maintained alongside `schemas/booking.json` (6 fields, low drift risk). At larger scale, `json-schema-to-typescript` (or similar) would generate types from the schemas as a build step, making the schema the single source of truth for both runtime validation and TS types.
- **Multi-environment config** — separate dev/staging/prod targets keyed off `NODE_ENV` or environment-prefixed env vars, with credentials always injected from CI secret stores or a vault.
- **Security testing** — auth fuzzing (malformed tokens, expired sessions, privilege escalation), injection probes (SQL, NoSQL, command), rate-limit assertions, CORS verification, and a security-headers audit (CSP, HSTS, X-Content-Type-Options).
- **Contract testing** — Pact or similar consumer-driven contract tests to catch breaking changes between this API and its consumers before they ship.
- **Load / stress testing** — k6 or Artillery scenarios to assert performance budgets (P95 latency, error rate under concurrency) and degradation behaviour at scale.

## AI usage disclosure

Scaffolded with AI assistance (Claude). Validated by: TypeScript strict-mode `tsc --noEmit`, manual review for the patterns above, a bug audit of AI-generated code (incorrect status codes, partial-payload PUT, JSON parsing on plain-text endpoints, race conditions under `fullyParallel: true`, dead code, out-of-sync types — each identified and corrected), and empirical Postman/curl exploration where the docs were ambiguous. Part B (`ai-generated/`) is a dedicated demonstration of AI failure modes and corrections — see `ai-generated/README.md`.

## License

MIT
