# CORTO Quality Engineering Tech Test

Submission for the CORTO QE technical test. Two suites in one repo:

- **Task 1 (`ui-automation/`)** — UI automation against https://demoqa.com using Playwright + TypeScript
- **Task 2 (`api-automation/`)** — API automation against https://restful-booker.herokuapp.com using Playwright's `request` fixture + ajv for response contracts

Single repo because the patterns and tooling overlap heavily and CI stays simple. Each task runs independently — see [Running tests](#running-tests).

**Suite-specific deep dives** (this README covers cross-cutting decisions; suite-specific design lives one level down):

- UI suite — [`ui-automation/README.md`](./ui-automation/README.md): POMs, fresh UI login per spec, demoqa quirks, locator strategy, dialog handling, cross-browser/mobile coverage.
- API suite — [`api-automation/README.md`](./api-automation/README.md): endpoint coverage table, REST-deviation table, bug-surfacing tier breakdown.
- Task 2 Part B — [`api-automation/ai-generated/`](./api-automation/ai-generated/): AI-generated tests, annotated with corrections in each file's header.

## Why these tools

**Playwright (UI & API)**
- Auto-waiting reduces flakiness
- Built-in tracing for debugging
- Unified stack across UI and API
- First-class API testing via `request` fixture

**TypeScript** — types catch errors at edit-time; `tsc --noEmit` is a free pre-test sanity gate.

**ajv + JSON Schema (API contracts)**
- Schemas as readable, language-agnostic contracts
- `required` + `additionalProperties: false` catch silent drift
- Faster to validate than hand-written assertions

**Reporting** — Playwright's built-in HTML reporter; auto-opens locally after every run for fast triage (suppressed in CI via `open: process.env.CI ? 'never' : 'always'` in both `playwright.config.ts` files). Production: swap for Allure (history, trends, richer attachments, JIRA integration).

**Minimal dependencies** — `ajv` + `ajv-formats` (API schema validation) and `dotenv` (loads `.env` into `process.env` for both suites) beyond Playwright + TypeScript.

## Project structure

```
corto-tech-test/
├── .github/workflows/              # CI pipelines (path-filtered per sub-project)
│   ├── ui-tests.yml
│   └── api-tests.yml               # main suite + non-blocking @bugs job
├── .nvmrc                          # Node version (CI + local via nvm)
├── ui-automation/                  # Task 1 — Playwright UI suite
│   ├── playwright.config.ts
│   ├── pages/                      # Page Object Models (UI interactions)
│   ├── fixtures/pomFixtures.ts     # Injects POMs into tests
│   ├── clients/bookstore.ts        # API client for DemoQA /BookStore endpoints
│   ├── helpers/cleanCollection.ts  # UI → cookie → API cleanup bridge
│   ├── test-data/                  # Test data (search inputs, credentials)
│   ├── config/env.ts               # Environment configuration
│   ├── types/                      # Shared TypeScript types
│   └── tests/
│       ├── anonymous/              # Login, search, book details (no auth)
│       └── logged-in/              # E2E flow, logout (authenticated flows)
├── api-automation/                 # Task 2 — API suite (Playwright + ajv)
│   ├── playwright.config.ts
│   ├── clients/                    # API clients (auth, booking)
│   ├── schemas/                    # JSON Schema contracts (source of truth)
│   ├── helpers/                    # Schema validation + report utilities
│   ├── test-data/                  # Data factories and datasets
│   ├── config/env.ts               # Environment configuration
│   ├── tests/
│   │   ├── auth.spec.ts
│   │   ├── ping.spec.ts
│   │   ├── booking/                # CRUD + data flow tests
│   │   └── bugs/                   # Known REST deviations (intentionally failing)
│   └── ai-generated/               # AI-generated vs reviewed tests (Part B)
├── .gitignore
└── README.md
```

## Setup

Node version pinned in `.nvmrc` (`18.19.0`) — `nvm use` from repo root. Each sub-project is independent.

**Task 1 — UI**

```bash
cd ui-automation && npm install
npx playwright install chromium firefox webkit
```

**Task 2 — API**

```bash
cd ../api-automation && npm install
```

`npx playwright install` pulls all three browsers — Chromium, Firefox, WebKit — covering desktop runs and mobile emulation (`mobile-chrome` reuses Chromium, `mobile-safari` reuses WebKit).

Defaults are baked into `config/env.ts` in each sub-project. To override, drop a `.env` file in the relevant sub-project's root (gitignored — copy from `.env.example`). `dotenv/config` is imported at the top of each `config/env.ts`.

```bash
# ui-automation/.env
BASE_URL=https://demoqa.com
TESTER_USERNAME=tester
TESTER_PASSWORD=Hello4123!

# api-automation/.env
BASE_URL=https://restful-booker.herokuapp.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password123
```

## Running tests

The two suites run independently — separate `package.json`, separate scripts, separate HTML report. There's no top-level command that runs both. Pick the suite you want, follow its three steps.

### Run the API suite

**1. Move into the API sub-project** (from the repo root):

```bash
cd api-automation
```

**2. Run the main suite** — excludes the `@bugs` intentionally-failing REST-correctness tier so smoke stays green:

```bash
npm test
```

**3. Verify the HTML report opens in your default browser.** It auto-opens locally on every run (suppressed in CI). If your environment blocks auto-open, open it manually:

```bash
npm run test:report
```

**Optional API commands** — run from `api-automation/`, after step 1:

- `npm run test:bugs` — the `@bugs` tier on its own (intentionally fails — failures *are* the bug tickets)
- `npm run test:all` — main suite **and** `@bugs` tier together
- `npm run test:smoke` — `@smoke` critical paths only

### Run the UI suite

**1. Move into the UI sub-project** (from the repo root):

```bash
cd ui-automation
```

**2. Run the default suite** — Chromium only, covering desktop:

```bash
npm test
```

**3. Verify the HTML report opens in your default browser.** Same auto-open behaviour as the API suite. Manual fallback:

```bash
npm run test:report
```

**Optional UI commands** — run from `ui-automation/`, after step 1:

- `npm run test:smoke` — `@smoke` critical paths only
- `npm run test:cross-browser` — Chromium + Firefox + WebKit (slow; opt-in)
- `npm run test:mobile` — Pixel 5 (Chrome) + iPhone 13 (Safari), emulated


## CI/CD

Two GitHub Actions workflows in `.github/workflows/` at repo root, each `path:`-filtered so a UI-only change doesn't trigger the API job:

- `ui-tests.yml` — Chromium on `ui-automation/**` changes. Type-checks, then `npm test`. HTML report uploaded.
- `api-tests.yml` — runs on `api-automation/**` changes. Two jobs: `test` (main suite, blocking) and `bug-tracking` (`@bugs` tier, `continue-on-error: true`).


## Test design notes

**Standalone POMs.** Each POM is self-contained — no shared base class to chase. Pages expose actions and locators; assertions stay in the tests. `fixtures/pomFixtures.ts` extends Playwright's `test` so each spec destructures only what it needs.

**Same layout on UI and API sides.** Both have `config/env.ts`, `test-data/`, `clients/`, `helpers/`. Switching between suites doesn't cost a re-orientation.

**Factories and parameterised datasets, not fixtures-per-scenario.** Two complementary data-driven patterns: `newBooking({ totalprice: 0 })` for one-off overrides, and externalised datasets in `test-data/` for repeat-shaped scenarios. Datasets live in TypeScript when type safety, env coupling, or JSON-unrepresentable values matter (`authData.ts:negativeAuthCases`, `createBookingCases.ts:positiveCreateCases`); in JSON when they're pure static and benefit from being readable in any tool without code execution (`negativeBookingPayloads.json`). Each spec consumes its dataset via `for...of`, so adding a new case is a one-line edit to the dataset, not a code change in the test. Same idea for credentials: config exposes raw env values, `test-data/` builds the fixtures.

**Schema validation on every API response.** Status code + schema match catches silent contract changes. Wired through `helpers/validateSchema.ts`. Detail in [`api-automation/README.md`](./api-automation/README.md).

**Bug-surfacing tests as a separate tier.** Restful Booker has REST deviations (200 instead of 401, 500 instead of 400, 405 instead of 404). The main suite asserts what the API does (so smoke stays green); tests/bugs/rest-compliance.spec.ts asserts what it should do — those failures are the bug tickets.

**Independent tests.** Each test owns its data end-to-end. API specs `POST /booking` in setup and `DELETE /booking/{id}` in `afterEach` using a token minted inside the same spec; UI specs clean the shared `tester` collection via API in both `beforeEach` and `afterEach`. The end-to-end UI flow (`tests/logged-in/e2e-flow.spec.ts`) is the deliberate exception — it walks search → add → re-add → verify → delete → verify in one chain, because the value of the test is the chain itself. UI cleanup pattern (fresh `APIRequestContext`, no `storageState`, demoqa quirks) detailed in [`ui-automation/README.md`](./ui-automation/README.md).

**No retries on assertion failures.** Retries hide bugs. Only retry is `CI=true ? 2 : 0` for transient network flake.

## Trade-offs

- demoqa shares backend state and enforces single-session per user, so logged-in UI tests run with `workers: 1`. The comment on that line in `playwright.config.ts` documents the escape hatch (per-test user registration via `POST /Account/v1/User`) for when scaling matters.
- API main suite asserts actual behaviour to keep smoke green. REST-correct expectations live in the `@bugs` tier — failures there are bug tickets, not noise.

## AI assistance disclosure

AI was used as a drafting aid to speed up repetitive work such as initial test scaffolding, helper utilities, and sample test data. All generated output was reviewed line-by-line, validated against live systems, and refined before inclusion.

AI did not drive architectural decisions. The overall design — including the bug-surfacing test tier, session handling strategy for UI tests, API cleanup approach, standalone POM structure, factory-based test data, JSON Schema validation, and locator strategy — was based on hands-on exploration of the APIs and UI, and on making trade-offs for reliability and maintainability.

