# DemoQA UI Test Automation Framework

Playwright + TypeScript UI automation for the DemoQA Book Store at https://demoqa.com. Covers public flows (search, book details), login form behaviour, and an end-to-end authenticated journey through the collection management UI.

## Scope

Tests are organised by authentication state:

**Anonymous (`tests/anonymous/`)** — fresh browser, no login
- **Login form** — successful login (`tester` / `Hello4123!`), invalid password, empty submission.
- **Search on `/books`** — five data-driven scenarios (exact, partial, case-insensitive, no results, word match) plus clear-search behaviour.
- **Book details** — navigation, metadata extraction, URL ↔ page ISBN consistency, plus an auth-boundary assertion (the "Add To Your Collection" button is not rendered for anonymous users).

**Logged-in (`tests/logged-in/`)** — fresh UI login per test; API cleanup in both `beforeEach` (defensive) and `afterEach` (clean exit)
- **End-to-end journey** (`e2e-flow.spec.ts`, `@smoke`) — search → add → re-add (negative: alert says "already present") → verify on `/profile` → delete → verify. Single integration test exercising both happy and duplicate-add paths in one journey.

The logged-in spec runs in `serial` mode within its describe block because the demoqa `tester` user's collection is shared server-side state.

### Logged-in test pattern

Each logged-in test does its own UI login in `beforeEach` — a fresh `tester` session bound to its own browser context. The collection is wiped via API in BOTH `beforeEach` (defensive — clean start regardless of prior state) and `afterEach` (clean exit for the next run). Cleanup extracts `token`/`userID` from the session's own cookies and runs through a fresh `APIRequestContext` (Bearer-only, no cookie pollution). One valid token per test, end-to-end.

Folder names reflect browser starting state, not feature: login-form tests live in `anonymous/` because they need an unauthenticated context to render the form; the end-to-end journey lives in `logged-in/` because it assumes the user is already authenticated.

## Setup

Requires Node.js 18+.

```bash
npm install
npx playwright install chromium                 # default — fast feedback
npx playwright install firefox webkit            # optional — for cross-browser runs
```

## Configuration

Defaults are baked in. Override via shell env vars or a local `.env` (gitignored — see `.env.example`):

```
BASE_URL=https://demoqa.com
TESTER_USERNAME=tester
TESTER_PASSWORD=Hello4123!
```

In production these would never be source-checked — they'd come from the CI secret store (GitHub Actions secrets, GitLab CI variables, etc.) or a vault (HashiCorp, AWS Secrets Manager) injected at runtime.

## Running tests

```bash
npm test                    # all tests on Chromium (default)
npm run test:smoke          # @smoke-tagged tests on Chromium only
npm run test:headed         # all tests on Chromium with browser visible
npm run test:ui             # Playwright UI mode (interactive debugging)
npm run test:cross-browser  # all tests across Chromium + Firefox + WebKit
npm run test:report         # open the last HTML report
npm run lint                # tsc --noEmit (type-check only)
```

Run a folder, file, or single browser:

```bash
npx playwright test tests/logged-in             # logged-in flows only
npx playwright test tests/anonymous             # anonymous / pre-login flows only
npx playwright test tests/logged-in/e2e-flow.spec.ts
npx playwright test --project=firefox
```

## Project structure

```
ui-automation/
├── .github/workflows/playwright.yml    CI pipeline (GitHub Actions)
├── pages/
│   ├── BasePage.ts                     Shared navigation
│   ├── LoginPage.ts                    Login form + login-success signal
│   ├── ProfilePage.ts                  Profile + collection table + logout
│   ├── BookStorePage.ts                Book list + search
│   └── BookDetailsPage.ts              Detail metadata + add/back buttons
├── clients/
│   └── books.ts                        Demoqa Bookstore API client (used by e2e cleanup)
├── fixtures/
│   ├── pomFixtures.ts                  POM injection fixtures (test extension)
│   └── credentials.ts                  Public-by-design test credentials
├── data/
│   └── searchScenarios.json            Data-driven search cases
├── config/
│   └── env.ts                          Centralised env access (BASE_URL)
├── types/
│   └── BookDetails.ts                  Detail metadata interface
├── tests/
│   ├── anonymous/                      Fresh browser, no login required
│   │   ├── login.spec.ts               3 tests (1 @smoke)
│   │   ├── search.spec.ts              6 tests at runtime (1 @smoke)
│   │   └── book-details.spec.ts        4 tests (1 @smoke)
│   └── logged-in/                      UI login per test (serial within file)
│       └── e2e-flow.spec.ts            1 test  (@smoke) — full UI journey
├── playwright.config.ts                Playwright config (timeouts, projects, reporters)
├── tsconfig.json                       TypeScript strict mode
└── package.json
```

## Design patterns

### Page Object Model

Each page is a class encapsulating its locators and user-facing actions. Tests interact with pages through method calls, not raw selectors. POMs extend a thin `BasePage` for navigation.

### Custom fixtures

`fixtures/pomFixtures.ts` injects POM instances into tests so they don't have to instantiate them:

```typescript
test('example', async ({ loginPage, profilePage, bookStorePage, bookDetailsPage }) => {
  await loginPage.goto();
  // ...
});
```

Each test gets fresh POM instances bound to its own page — no shared state.

### Data-driven testing

`data/searchScenarios.json` declares search test cases. `search.spec.ts` iterates over the array and emits one test per scenario. New cases require only a JSON edit. A `"smoke": true` field opts a scenario into the `@smoke` tag.

### Test tagging

Modern Playwright tag syntax — `{ tag: '@smoke' }` — applied to one critical happy path per spec file. `npm run test:smoke` runs only those.

### API-driven cleanup in both hooks

Cleanup runs in BOTH `beforeEach` (defensive — guarantees a clean start regardless of prior state, including aborted previous runs or manual usage of the shared `tester` account) and `afterEach` (clean exit for the next run; `afterEach`'s post-test position means the page state at the point of failure is preserved before cleanup fires). The hook reads `token`/`userID` from the test's own cookies and fires `DELETE /BookStore/v1/Books?UserId=...` through a fresh `APIRequestContext`.

### Serial execution for shared backend state

`e2e-flow.spec.ts` declares `test.describe.configure({ mode: 'serial' })`. The demoqa `tester` user's collection is shared server-side state — parallel runs would race each other. Tests under `tests/anonymous/` are stateless and run fully parallel.

## Locator strategy

Semantic-first: `getByRole`, `getByPlaceholder`, accessible-name regexes, with stable IDs (`#userName`, `#password`, `#login`) where there's no accessible name. Class-based selectors only where the framework offers no semantic alternative. No `nth-child`, no positional CSS, no generated IDs.

Two demoqa-specific notes baked into the POMs: action buttons on the detail page share `id="addNewRecordButton"` (an HTML spec violation), so role + accessible-name regex is the only reliable differentiator; field labels use regex like `/^ISBN\s*:/` to tolerate the site's inconsistent `Field:` / `Field :` formatting.

## Dialog handling

demoqa surfaces two confirmation styles that need different treatment:

- **Native browser alert** — `BookDetailsPage.addToCollection()`. Server returns `"Book added to your collection."` or `"Book already present in the your collection!"` via `window.alert`, 5–6s after the click. POM registers the dialog listener *before* the click (handles both synchronous and async cases) and returns the alert text so tests can distinguish success from "already present".
- **In-page modal** — `ProfilePage.deleteBook()` / `deleteAllBooks()`. The `/profile` delete confirmation is a react-bootstrap modal (`role="dialog"`), not a native dialog. The POM targets it via `getByRole('dialog')` + the scoped OK button, and asserts deletion via the row disappearing rather than modal close (modal-close timing varies with backend latency).

## Timeout strategy

All timeouts centralised in `playwright.config.ts` — no magic numbers in test or POM code.

| Setting | Value | What it covers |
|---|---|---|
| `timeout` | 60s | Per-test (including hooks) |
| `expect.timeout` | 10s | Per-assertion (`toBeVisible`, `toHaveText`, etc.) |
| `actionTimeout` | 15s | Per-action (`click`, `fill`, `selectOption`) |
| `navigationTimeout` | 30s | Per-navigation (`goto`, `waitForURL`) |

POMs never pass explicit `{ timeout: ... }` options — Playwright's auto-retry semantics use the config defaults.

No hard sleeps (`waitForTimeout`) outside two short DOM-settle waits in `BookStorePage.search()` and `BookStorePage.clearSearch()` — client-side filtering needs a beat to render, and Playwright's auto-wait isn't appropriate for "wait for nothing specific."

## CI/CD

`.github/workflows/playwright.yml` runs on push/PR to `main` and `develop`:

1. Install Node.js 18 and dependencies.
2. Install Playwright Chromium.
3. Run the full suite (Chromium only) with `CI=true`, which enables 2 retries per test.
4. Upload the HTML report as a build artifact.

Cross-browser runs (`npm run test:cross-browser`) are available on demand but excluded from the default CI pipeline to keep PR feedback fast.

Local runs do not retry — fail fast for honest signal.

## Known limitations & demoqa platform quirks

Empirical findings from running against the live site:

- **DemoQA is a free public test site.** Cold-load times can hit 15–20 seconds; the 60s test timeout absorbs this without masking real failures.
- **Async native alert on add-to-collection.** "Add To Your Collection" surfaces a native browser alert 5–6s after the click (server-driven). POMs register the dialog listener BEFORE the click — see `BookDetailsPage.addToCollection()`.
- **In-page modal on delete.** The `/profile` delete confirmation is a react-bootstrap modal (`role="dialog"`), *not* a native browser dialog. `ProfilePage.deleteBook()` waits for the modal, clicks its OK button, and asserts deletion via the row disappearing rather than the modal closing — modal close timing varies with demoqa's DELETE response latency.
- **HTML id collision.** Both action buttons on the book detail page share `id="addNewRecordButton"` (HTML spec violation). POMs anchor on `getByRole('button', { name: ... })`.
- **Auth-gated UI elements.** "Add To Your Collection" is not rendered for anonymous users — covered by a negative test in `book-details.spec.ts`.
- **Shared `tester` user state.** The logged-in test runs against the demoqa shared account; serial describe + API cleanup in `afterEach` keep state predictable.
- **Catalogue variance.** Search tests reference stable titles that have been reliably present, but a catalogue change could require updating `searchScenarios.json`.
- **User registration** — out of scope per task brief.

## Future work / production considerations

Out of scope for this submission, but the natural next layers for a real production app:

- **Accessibility testing** — `@axe-core/playwright` integration to assert WCAG conformance on every page render. Catches a class of UI defect (missing labels, contrast failures, ARIA misuse, keyboard-trap issues) the existing functional tests don't surface.
- **Visual regression** — Playwright's built-in `toHaveScreenshot()` for pixel-diff assertions on key pages, with platform-aware baselines and update-on-intentional-change workflows.
- **Performance budgets** — page-load thresholds (TTI, LCP, CLS) via `performance.timing` or Lighthouse-as-CI to catch regressions before users do.
- **Multi-environment config** — environment-keyed `.env.dev` / `.env.staging` / `.env.prod` (or a `NODE_ENV`-driven loader) so the same suite runs against any tier without source changes; production credentials never source-checked.
- **Security testing** — XSS / SQL-injection probes on form inputs, session-fixation checks, CSRF token verification, rate-limit assertions, header security audit (CSP, X-Frame-Options). Deeper than the auth-boundary check in `book-details.spec.ts`.

## AI usage disclosure

Scaffolded with AI assistance (Claude). Validated by: TypeScript strict-mode `tsc --noEmit`, manual review against the design patterns above, an anti-pattern audit (hard waits, brittle selectors, scattered timeouts, weak isolation), and live runs against demoqa where locators and dialog handling evolved with what the real DOM returned.

## License

MIT
