# DemoQA UI suite — design depth

Project-specific design depth for the UI suite. **For setup, running tests, configuration, CI/CD, AI disclosure, and the project structure tree, see the [root README](../README.md).**

## Scope

Tests are organised by authentication state:

**Anonymous (`tests/anonymous/`)** — fresh browser, no login
- **Login form** — successful login (`tester` / `Hello4123!`), invalid password, empty submission
- **Search on `/books`** — five data-driven scenarios + clear-search behaviour
- **Book details** — navigation, metadata extraction, URL ↔ ISBN consistency, auth-boundary check (the "Add To Your Collection" button is not rendered for anonymous users)

**Logged-in (`tests/logged-in/`)** — fresh UI login per test; API cleanup in both `beforeEach` and `afterEach`
- **End-to-end journey** (`e2e-flow.spec.ts`, `@smoke`) — search → add → re-add (negative: alert says "already present") → verify → delete → verify

The logged-in spec runs in `serial` mode within its describe block because the demoqa `tester` user's collection is shared server-side state.

## Logged-in test pattern

Each logged-in test does its own UI login in `beforeEach` — a fresh `tester` session bound to its own browser context. The collection is wiped via API in BOTH `beforeEach` (defensive — clean start regardless of prior state) and `afterEach` (clean exit for the next run). Cleanup extracts `token`/`userID` from the session's own cookies and runs through a fresh `APIRequestContext` (Bearer-only, no cookie pollution). One valid token per test, end-to-end.

Folder names reflect browser starting state, not feature: login-form tests live in `anonymous/` because they need an unauthenticated context to render the form; the end-to-end journey lives in `logged-in/` because it assumes the user is already authenticated.

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
- **Multi-environment config** — environment-keyed `.env.dev` / `.env.staging` / `.env.prod` (or a `NODE_ENV`-driven loader) so the same suite runs against any tier without source changes; production credentials never source-checked.
- **Security testing** — XSS / SQL-injection probes on form inputs, session-fixation checks, CSRF token verification, rate-limit assertions, header security audit (CSP, X-Frame-Options). Deeper than the auth-boundary check in `book-details.spec.ts`.

