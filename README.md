# CORTO Quality Engineering Tech Test

Submission for the CORTO QE technical test. Two suites in one repo:

- **Task 1 (`ui-automation/`)** — UI automation against https://demoqa.com using Playwright + TypeScript
- **Task 2 (`api-automation/`)** — API automation against https://restful-booker.herokuapp.com using Playwright's `request` fixture + ajv for response contracts

I've kept everything in a single repo because the patterns and tooling overlap heavily and it keeps the CI config simple. Each task can be run independently — see [Running tests](#running-tests).

## Why these tools

**Playwright + TypeScript for both UI and API.** Auto-waiting eliminates most of the flakiness I'd otherwise have to defend against with explicit waits, the trace viewer is genuinely the best debugging tool I've used, and using one stack for UI *and* API means shared concepts (config, retries, reporters), one onboarding story, one CI matrix. I went with Playwright because cross-browser is free, the API testing fixture is first-class, and I prefer TypeScript for this kind of project.

**Playwright's built-in `request` fixture for the API suite, not Postman/Newman or Jest+Supertest.** Could have used Postman collections but it's harder to demonstrate proper design patterns in one. Writing it in code lets me show the clients/schemas/helpers separation clearly. Could have used Jest+Supertest but that's two test runners in one repo for marginal benefit — the `request` fixture covers everything I need and shares config with the UI suite.

**ajv + JSON Schema files for response contract validation.** Schemas live as `.json` artefacts in `api-automation/schemas/` — language-agnostic, readable in ten seconds without any TypeScript knowledge. `additionalProperties: false` and explicit `required: [...]` arrays catch silent contract drift. I considered Zod (TS-native, would give type inference) but chose JSON Schema because the artefacts themselves are clearer documentation.

**No other extras.** The brief asked for tests, not infrastructure. Test data is small and meaningful (`newBooking({ totalprice: 0 })`); env handling is `process.env.X || 'default'`. Only `ajv` and `ajv-formats` are added beyond Playwright + TypeScript.

## Project structure

```
corto-tech-test/
├── .github/workflows/             # CI — path-filtered per sub-project
│   ├── ui-tests.yml               # UI suite job (runs on ui-automation/** changes)
│   └── api-tests.yml              # API suite job + non-blocking @bugs job
├── .nvmrc                         # Node version pin (CI + nvm)
├── ui-automation/                 # Task 1 — Playwright UI
│   ├── playwright.config.ts
│   ├── pages/                     # Page Object Model
│   ├── fixtures/                  # POM injection fixtures + credentials
│   ├── clients/books.ts           # Demoqa Bookstore API helper (e2e cleanup)
│   ├── data/                      # Data-driven search scenarios (JSON)
│   ├── config/env.ts              # Centralised env access
│   ├── types/                     # Shared TS types
│   └── tests/
│       ├── anonymous/             # Fresh browser, no login required
│       │   ├── login.spec.ts                    # Login form: success, invalid password, empty submission
│       │   ├── search.spec.ts                   # Data-driven search (5 scenarios) + clear-search
│       │   └── book-details.spec.ts             # Metadata, URL/ISBN consistency, auth-boundary
│       └── logged-in/             # UI login per test, serial within file
│           └── e2e-flow.spec.ts                 # search → add → re-add → verify → delete → verify
├── api-automation/                # Task 2 — Playwright API + ajv
│   ├── playwright.config.ts
│   ├── clients/                   # auth + booking helpers (re-exports Booking type)
│   ├── schemas/                   # JSON Schema response contracts
│   ├── helpers/                   # ajv validator + report attachments
│   ├── test-data/                 # Booking factory, auth + filter datasets
│   ├── config/env.ts
│   ├── tests/
│   │   ├── auth.spec.ts                         # POST /auth (1 happy + 7 negative + token uniqueness)
│   │   ├── ping.spec.ts                         # GET /ping (health-check smoke gate)
│   │   ├── booking/
│   │   │   ├── create-booking.spec.ts           # POST /booking (positive + negative + edge cases)
│   │   │   ├── get-booking.spec.ts              # GET /booking + /booking/:id (with filter)
│   │   │   ├── update-booking.spec.ts           # PUT /booking/:id (auth + 403 + 405)
│   │   │   ├── partial-update-booking.spec.ts   # PATCH /booking/:id (auth + 403)
│   │   │   ├── delete-booking.spec.ts           # DELETE /booking/:id (auth + 403 + idempotency)
│   │   │   └── data-flow.spec.ts                # E2E lifecycle: create → get → put → patch → delete
│   │   └── bugs/
│   │       └── rest-compliance.spec.ts          # 6 intentionally-failing REST-correctness tests
│   └── ai-generated/              # Task 2 Part B — AI vs reviewed comparison
├── .gitignore
└── README.md                      # This file
```

## Setup

Node version is pinned in `.nvmrc` (`18.19.0`). With `nvm` installed, `nvm use` from the repo root picks it up. Each sub-project is independent — install only what you need.

```bash
# Task 1 — UI suite
cd ui-automation
npm install
npx playwright install chromium                # default browser
npx playwright install firefox webkit          # optional, cross-browser

# Task 2 — API suite
cd ../api-automation
npm install
```

Configuration. Defaults are baked in. Override via shell env vars or a local `.env` (gitignored — see `.env.example` in each sub-project):

```
# ui-automation
BASE_URL=https://demoqa.com
TESTER_USERNAME=tester
TESTER_PASSWORD=Hello4123!

# api-automation
BASE_URL=https://restful-booker.herokuapp.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password123
```

In production these would never be source-checked — they'd come from CI secret stores (GitHub Actions secrets, etc.) or a vault. For a public-creds test brief, source defaults are fine.

About the demoqa account: the spec said to leave User Registration out of scope, so I'm assuming the reviewer will use the public `tester` account from the brief. Drop overrides into `.env` if you want a different one.

## Running tests

```bash
# Everything (per project)
cd ui-automation && npm test
cd ../api-automation && npm test

# Subsets via tags
npm run test:smoke           # @smoke critical paths only
npm run test:bugs            # api-automation: @bugs intentionally-failing tier
npm run test:all             # api-automation: main + bugs together

# Visible browser for debugging (ui-automation)
npm run test:headed          # tests with browser visible
npm run test:ui              # Playwright UI mode (interactive debugging)

# Cross-browser (ui-automation)
npm run test:cross-browser   # Chromium + Firefox + WebKit

# Open the last HTML report
npm run test:report

# Type-check only (no test execution)
npm run lint                 # tsc --noEmit
```

**Tags I use:**

- `@smoke` — fast critical-path subset, runs on every CI commit
- `@bugs` — REST-compliance bug-surfacing tests (api-automation only); excluded from default `npm test` so the main suite stays green

Run a subset: `npx playwright test --grep @smoke`.

## CI/CD

Two GitHub Actions workflows live in `.github/workflows/` at the repo root, each `path:`-filtered so a UI-only change doesn't trigger the API job and vice-versa:

- `.github/workflows/ui-tests.yml` — Chromium on push/PR touching `ui-automation/**`. Type-checks (`npm run lint`), then runs `npm test`. HTML report uploaded as `ui-playwright-report`.
- `.github/workflows/api-tests.yml` — runs on `api-automation/**` changes. Two jobs: `test` (main suite, blocking; excludes `@bugs`) and `bug-tracking` (`@bugs` tier, `continue-on-error: true` so bug-status drift is visible without blocking PRs).

Both jobs read the Node version from `.nvmrc` so local dev and CI never drift.

`CI=true` enables retries (2 per test) so transient flake (Heroku cold-starts, demoqa cold-loads) doesn't fail the build. Local runs do not retry — fast, honest signal.

Cross-browser runs are excluded from default CI to keep PR feedback fast; available via `npm run test:cross-browser` on demand. Should drop into GitLab CI / Jenkins / CircleCI with minimal changes — the npm scripts are the same everywhere.

## Test design notes

A few choices worth flagging:

**Page Object Model, but lightweight.** I avoid putting business logic in page objects. Pages expose actions and locators; assertions live in the tests. This is the split that's saved me the most pain over the years.

**Factory functions for test data, not fixtures-of-everything.** `newBooking({ firstname: "X", totalprice: 0 })` is more flexible than a fixture per scenario. The override pattern is just as readable in fewer lines and scales the same way as the model grows.

**Schema validation everywhere on the API side.** Status code and a couple of field asserts isn't enough — schemas catch silent contract changes. Schemas live in `api-automation/schemas/` and are loaded by the assertion helpers.

**Bug-surfacing tests as a separate tier.** Restful Booker has documented REST deviations (200 instead of 401 on bad creds, 500 instead of 400 on missing fields, 405 instead of 404 on missing IDs). The main suite asserts what the API *does today* (so smoke runs stay green); `tests/bugs/rest-compliance.spec.ts` asserts what it *should* do per REST/HTTP convention — those failures are the bug tickets.

**Independent tests.** Each test creates and tears down its own data. No ordering dependencies, safe to parallelise. The end-to-end flow test is the one exception and it's deliberately one big test, not a sequence of dependent ones.

**Session-per-test for UI logged-in flows.** demoqa has three quirks that storage state can't survive: single-session enforcement, mismatched-token sensitivity between cookies and Bearer headers, and a cookie/localStorage gap. Per-test UI login gives each test one coherent session for both UI and API cleanup. The full reasoning lives in the file header of `ui-automation/tests/logged-in/e2e-flow.spec.ts`.

**No retries on assertion failures.** Retries hide real bugs. The only place retries are acceptable is at the network layer for genuine transient issues — that's the `CI=true ? 2 : 0` setting in `playwright.config.ts`, not on assertion logic.

## AI assistance disclosure

Per the spec, here's what I used AI for and how I validated it:

| Where | Tool | What I did |
|---|---|---|
| `api-automation/ai-generated/` | Claude (Sonnet) | Task 2 Part B — deliberate exercise. Generated tests for two endpoints (POST /auth, POST /booking), then reviewed and rewrote. Both versions in repo, with annotated diff in `api-automation/ai-generated/README.md`. |
| API helpers (`api-automation/clients/`, `api-automation/helpers/`) | Claude | Drafted the auth/booking client helpers (`getToken`, `createBookingForTest`, `cleanupBookings`), the ajv schema validator (`helpers/validateSchema.ts`), and the HTML-report attachment helper (`helpers/reportAttachments.ts`). Each was reviewed line-by-line; tuned ajv error formatting until failures showed every violation, not just the first. |
| `test-data/bookingData.ts`, `test-data/authData.ts`, `test-data/bookingFilterData.ts` | Claude | Drafted the factory + parameterised datasets. Verified each value against the Restful Booker docs and a real response — caught one issue where AI marked `additionalneeds` as required (it isn't). |
| Repetitive test-spec boilerplate | Claude | Faster to generate the request/assert/cleanup shape than type by hand. Each spec was reviewed line-by-line afterwards. |
| README polish | Claude | Reordered sections, tightened phrasing. Content and structure are mine. |

I did *not* use AI for the core framework decisions: the bug-surfacing pattern, the session-per-test UI auth approach, locator strategy, dialog/modal handling, schema design, or empirical API exploration. Those are deliberate design choices I wanted to own. The AI experiment in `api-automation/ai-generated/` is the one place where AI-generated code was the *starting point* — and I've documented exactly what I changed and why.

My validation rule of thumb: if I can't explain why a line is there, it doesn't go in.
