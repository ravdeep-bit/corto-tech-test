# CORTO Quality Engineering Tech Test

Submission for the CORTO QE technical test. Two suites in one repo:

- **Task 1 (`ui-automation/`)** — UI automation against https://demoqa.com using Playwright + TypeScript
- **Task 2 (`api-automation/`)** — API automation against https://restful-booker.herokuapp.com using Playwright's `request` fixture + ajv for response contracts

Single repo because the patterns and tooling overlap heavily and CI stays simple. Each task runs independently — see [Running tests](#running-tests).

## Why these tools

**Playwright for both UI and API.** Auto-waiting eliminates most flakiness, the trace viewer is the best debugging tool I've used, and one stack means shared config / retries / reporters / CI matrix. Cross-browser is free, the API `request` fixture is first-class.

**TypeScript over JavaScript.** Strong types catch errors at edit-time — Playwright's API, factory shapes, `Locator` types in POMs, schema-derived response shapes. `tsc --noEmit` is a free pre-test sanity gate that surfaces typos and contract drift before any test runs. The cost is one config file; the payoff compounds every refactor.

**ajv + JSON Schema for response contracts.** Schemas live as `.json` artefacts in `api-automation/schemas/` — language-agnostic, readable in ten seconds without TypeScript. `additionalProperties: false` and explicit `required: [...]` arrays catch silent contract drift. Considered Zod but chose JSON Schema because the artefacts are clearer documentation.

**Minimal extras.** Test data is small and meaningful (`newBooking({ totalprice: 0 })`); env handling is `process.env.X || 'default'`. Only `ajv` and `ajv-formats` are added beyond Playwright + TypeScript.

## Project structure

```
corto-tech-test/
├── .github/workflows/             # CI — path-filtered per sub-project
│   ├── ui-tests.yml
│   └── api-tests.yml              # main suite + non-blocking @bugs job
├── .nvmrc                         # Node version pin (CI + nvm)
├── ui-automation/                 # Task 1 — Playwright UI
│   ├── playwright.config.ts
│   ├── pages/                     # Page Object Model
│   ├── fixtures/pomFixtures.ts    # POM dependency injection
│   ├── clients/bookstore.ts       # Demoqa /BookStore/v1/* HTTP wrappers
│   ├── helpers/cleanCollection.ts # Page → cookies → API cleanup bridge
│   ├── test-data/                 # Search scenarios + credentials (env-derived)
│   ├── config/env.ts              # Centralised env access
│   ├── types/                     # Shared TS types
│   └── tests/
│       ├── anonymous/             # login.spec, search.spec, book-details.spec
│       └── logged-in/             # e2e-flow.spec, logout.spec
├── api-automation/                # Task 2 — Playwright API + ajv
│   ├── playwright.config.ts
│   ├── clients/                   # auth + booking helpers (re-exports Booking type)
│   ├── schemas/                   # JSON Schema response contracts
│   ├── helpers/                   # ajv validator + report attachments
│   ├── test-data/                 # Booking factory, auth + filter datasets
│   ├── config/env.ts
│   ├── tests/
│   │   ├── auth.spec.ts, ping.spec.ts
│   │   ├── booking/               # create/get/update/patch/delete + data-flow
│   │   └── bugs/                  # rest-compliance.spec — intentionally failing
│   └── ai-generated/              # Task 2 Part B — AI vs reviewed comparison
├── .gitignore
└── README.md
```

## Setup

Node version pinned in `.nvmrc` (`18.19.0`) — `nvm use` from repo root. Each sub-project is independent.

```bash
# Task 1 — UI
cd ui-automation && npm install
npx playwright install chromium firefox webkit  # all three; covers desktop + mobile emulation

# Task 2 — API
cd ../api-automation && npm install
```

Defaults are baked in. Override via shell env or local `.env` (gitignored — see `.env.example`):

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

In production these would come from CI secrets / vault — for a public-creds test brief, source defaults are fine.

## Running tests

```bash
# Default (Chromium / API)
cd ui-automation && npm test
cd ../api-automation && npm test

# Tagged subsets
npm run test:smoke           # @smoke critical paths
npm run test:bugs            # api-automation: @bugs intentionally-failing tier
npm run test:all             # api-automation: main + bugs

# UI debugging
npm run test:headed          # visible browser
npm run test:ui              # Playwright UI mode

# UI cross-device (opt-in)
npm run test:cross-browser   # Chromium + Firefox + WebKit
npm run test:mobile          # Pixel 5 + iPhone 13 (emulated)

# Reports + lint
npm run test:report          # open last HTML report
npm run lint                 # tsc --noEmit
```

**Tags:**
- `@smoke` — fast critical-path subset, runs in CI
- `@bugs` — REST-compliance bug-surfacing (api-automation only); excluded from default `npm test`

## CI/CD

Two GitHub Actions workflows in `.github/workflows/` at repo root, each `path:`-filtered so a UI-only change doesn't trigger the API job:

- `ui-tests.yml` — Chromium on `ui-automation/**` changes. Type-checks, then `npm test`. HTML report uploaded.
- `api-tests.yml` — runs on `api-automation/**` changes. Two jobs: `test` (main suite, blocking) and `bug-tracking` (`@bugs` tier, `continue-on-error: true`).

Both read Node from `.nvmrc`. `CI=true` enables 2 retries to absorb transient flake (Heroku cold-starts, demoqa cold-loads); local runs do not retry. Cross-browser and mobile excluded from default CI to keep PR feedback fast — opt-in via npm scripts.

## Test design notes

**Lightweight, standalone POMs.** Each POM is a self-contained class — no shared base class, no inheritance hop to follow when reading. Pages expose actions and locators; assertions live in the tests. `fixtures/pomFixtures.ts` extends Playwright's `test` so each spec destructures only the page objects it needs — POMs construct lazily, bound to that test's own `page`.

**Symmetric layout across UI and API.** Both sub-projects share the same shape: `config/env.ts` (env access), `test-data/` (env-derived fixtures), `clients/` (pure HTTP), `helpers/` (runtime bridges — ajv validation in API, cookie-to-API cleanup in UI). A reviewer flipping between suites recognises the pattern instantly.

**Factory functions over fixtures-of-everything.** `newBooking({ totalprice: 0 })` is more flexible than a fixture per scenario. Same idea for credentials — config exposes raw env values, `test-data/` builds the fixtures.

**Schema validation everywhere on the API side.** Status code + a couple of field asserts isn't enough — schemas catch silent contract changes. Loaded by `helpers/validateSchema.ts`.

**Bug-surfacing tests as a separate tier.** Restful Booker has REST deviations (200 instead of 401, 500 instead of 400, 405 instead of 404). The main suite asserts what the API *does* (so smoke stays green); `tests/bugs/rest-compliance.spec.ts` asserts what it *should* do — those failures are the bug tickets.

**Independent tests.** Each test creates and tears down its own data. No ordering dependencies, safe to parallelise. The end-to-end flow test is the deliberate exception.

**Session-per-test for UI logged-in flows.** demoqa has three quirks that storage state can't survive — single-session enforcement, mismatched-token sensitivity, cookie/localStorage gap. Full reasoning in the file header of `tests/logged-in/e2e-flow.spec.ts`.

**No retries on assertion failures.** Retries hide real bugs. The only retry is the `CI=true ? 2 : 0` setting for genuine transient network flake.

## AI assistance disclosure

AI was used as a drafting tool. Every output was treated like a junior contributor's pull request — reviewed line-by-line, validated empirically, and revised for correctness, framework alignment, and maintainability before being merged.

| Where | Tool | What AI drafted | QA review I performed |
|---|---|---|---|
| `api-automation/ai-generated/` | Claude (Sonnet) | Tests for two endpoints (POST /auth, POST /booking) | Structured review with 15 annotated changes; rewrote both. Both versions kept in repo with diff in `ai-generated/README.md`. |
| API helpers (`clients/`, `helpers/`) | Claude | Auth/booking client helpers, ajv schema validator, report attachment helper | Reviewed each helper line-by-line; iteratively tuned ajv error formatting until failures surfaced every schema violation, not just the first. |
| `test-data/` (booking, auth, filter datasets) | Claude | Factory + parameterised datasets | Validated each value empirically against the live API — caught one defect where AI marked `additionalneeds` as required (it isn't). Cross-checked filter datasets for collisions. |
| Repetitive spec boilerplate | Claude | Request/assert/cleanup scaffolding | Reviewed every spec line-by-line; tightened over-loose schema assertions, added missing edge cases (null/empty/typed-wrong), removed duplicate happy paths. |
| README polish | Claude | Section reordering, phrasing tweaks | Content, structure, and design decisions are mine. |

**What I did *not* delegate to AI.** Core framework decisions — the bug-surfacing tier pattern, session-per-test UI auth approach, locator strategy, dialog/modal handling, JSON Schema design, empirical API exploration. Those are judgment calls I wanted to own.

**Validation rules I held AI output to:**
- Empirical verification beats AI-asserted behaviour. A single Postman/codegen probe reveals what the API/UI actually does versus what AI assumed (200 with `Bad credentials` instead of 401, `Logout` vs `Log out`, etc.).
- If I can't explain why a line is there, it doesn't go in.
- Strict shape over loose assertions. `toEqual({ token: expect.any(String) })` over `toHaveProperty('token')`. Schema validation over field-by-field checks.
- Test independence. AI-drafted specs often shared state implicitly; rewrote each spec to set up and tear down its own data.
