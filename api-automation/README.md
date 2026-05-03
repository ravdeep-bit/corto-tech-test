# Restful Booker API suite — design depth

Project-specific design depth for the API suite. **For setup, running tests, configuration, CI/CD, AI disclosure, and the project structure tree, see the [root README](../README.md).**

**Target API**: https://restful-booker.herokuapp.com
**API docs**: https://restful-booker.herokuapp.com/apidoc/index.html

## API-specific decisions

- **Cookie-format auth** (`Cookie: token=<token>`) for mutations — chosen over HTTP Basic to match the docs' canonical example.
- **`fullyParallel: true` is safe** because every test creates its own booking and `beforeAll` only fetches a token.
- **Heroku cold-starts tolerated, not retried locally** — CI enables 2 retries; local runs fail fast.
- **Data-driven cases live under `test-data/`** — mix of TypeScript and JSON depending on what the data needs to express. JSON for pure static negatives (`negativeBookingPayloads.json`) — readable in any tool, no code execution needed. TypeScript for cases that need type safety, env coupling, or JSON-unrepresentable values like `additionalneeds: undefined` (`authData.ts`, `createBookingCases.ts`, `bookingFilterData.ts`). Each spec consumes its dataset via `for...of` so adding a new case is a one-line edit to the dataset, not a code change in the spec.

## Test coverage

30 main tests + 6 bug-surfacing tests, covering all 8 restful-booker endpoints.

| Endpoint | Tests | Highlights |
|---|---|---|
| GET /ping | 1 | Status 201, plain-text body "Created" |
| POST /auth | 9 | Valid creds → token; 7 negative-creds cases (invalid password, unknown user, missing fields, empty body, empty strings, null) parameterised from `test-data/authData.ts`; fresh token on every successful call |
| POST /booking | 5 | Positive boundary cases (full payload / optional-omitted / zero-price) parameterised from `test-data/createBookingCases.ts`; negative cases (missing required / empty payload) loaded from `test-data/negativeBookingPayloads.json` |
| GET /booking | 5 | List, get-by-id, 404 after delete, filter-by-firstname (per-run-unique seed → exact length-1 match proves the API actually filtered), no-such-user empty-result negative |
| PUT /booking/:id | 3 | Full update + GET-after-PUT validation, 403 without auth, 405 on deleted ID |
| PATCH /booking/:id | 2 | Partial update + GET-after-PATCH validation, 403 without auth |
| DELETE /booking/:id | 4 | Delete + GET-after-DELETE returns 404, 403 without auth, 403 with invalid token, 405 on second delete (idempotency) |
| E2E lifecycle | 1 | create → get → PUT → PATCH → DELETE in a single chained test |
| Bug-surfacing | 6 | REST-correct status codes asserted; intentionally failing |

## Bug-surfacing tests (`tests/bugs/`)

Asserts what the API *should* return per REST/HTTP. These tests fail as per API deviations from REST conventions

| # | Bug | Asserted | Actual |
|---|---|---|---|
| BUG-1 | `POST /booking` should return 201 Created | `toBe(201)` | 200 |
| BUG-2 | `DELETE /booking/:id` should return 204 No Content | `toBe(204)` | 201 |
| BUG-3 | `GET /ping` should return 200 OK | `toBe(200)` | 201 |
| BUG-4 | `POST /auth` with invalid creds should return 401 Unauthorized | `toBe(401)` | 200 |
| BUG-5 | `POST /booking` with missing required fields should return 400 Bad Request | `toBe(400)` | 500 |
| BUG-6 | Mutations on a non-existent booking ID should return 404 Not Found | `toBe(404)` | 405 |

## Future work / production considerations

Out of scope for this submission, but the natural next layers for a real production API:

- **Multi-environment config** — separate dev/staging/prod targets keyed off `NODE_ENV` or environment-prefixed env vars.
- **Security testing** — auth fuzzing (malformed tokens, expired sessions, privilege escalation), injection probes, rate-limit assertions etc.
- **Load / stress testing** — k6 or Artillery scenarios to assert performance budgets (P95 latency, error rate under concurrency) and degradation behaviour at scale.


