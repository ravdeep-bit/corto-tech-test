# DemoQA UI suite — design depth

Project-specific design depth for the UI suite. **For setup, running tests, configuration, CI/CD, AI disclosure, and the project structure tree, see the [root README](../README.md).**

## Scope

Tests are organised by authentication state:

**Anonymous (`tests/anonymous/`)** — fresh browser, no login
- **Login form** — successful login (`@smoke`), invalid password (`@smoke`), empty submission
- **Search on `/books`** — five data-driven scenarios (exact, partial, case-insensitive, no-results, partial-word); "exact match" is `@smoke`
- **Book details** — navigation (`@smoke`), metadata extraction, URL ↔ ISBN consistency, auth-boundary check (the "Add To Your Collection" button is not rendered for anonymous users)

**Logged-in (`tests/logged-in/`)** — fresh UI login per test; API cleanup in both `beforeEach` and `afterEach`
- **End-to-end journey** (`e2e-flow.spec.ts`, `@smoke`) — search → add → re-add (negative: alert says "already present") → verify → delete → verify
- **Logout** (`logout.spec.ts`, `@smoke`) — login → navigate to `/books` → logout via the global header → assert redirect to `/login`. Triggered from a non-`/profile` page deliberately, since the logout button lives in the global header and should work regardless of originating page.

The `@smoke` set is **6 tests** across all five spec files: the two login regressions, exact-match search, detail-page navigation, the end-to-end journey, and logout. Selected to catch the broadest class of regressions in the shortest CI runtime.

## Cross-browser & mobile coverage

The same 14 tests run unchanged across five Playwright projects: Chromium / Firefox / WebKit (desktop) and Pixel 5 / iPhone 13 (emulated mobile). Default `npm test` runs Chromium only. Opt-in via `npm run test:cross-browser` (desktop trio) and `npm run test:mobile` (mobile pair). No per-device test variants — locators are semantic-first (`getByRole`, accessible names) and so survive the responsive layout changes between desktop and mobile breakpoints. 

The logged-in spec runs in `serial` mode within its describe block because the demoqa `tester` user's collection is shared server-side state.

## Logged-in test pattern

Each logged-in test does its own UI login in `beforeEach` — a fresh `tester` session bound to its own browser context. The collection is wiped via API in BOTH `beforeEach` (defensive — clean start regardless of prior state) and `afterEach` (clean exit for the next run). Cleanup is centralised in `helpers/cleanCollection.ts` — it extracts `token`/`userID` from the session's own cookies and runs through a fresh `APIRequestContext` (Bearer-only, no cookie pollution). One valid token per test, end-to-end.

The fresh `APIRequestContext` matters: the test's built-in `request` fixture would share storage with the browser and send the session cookie alongside `Authorization: Bearer` — a combination demoqa hangs on. Isolating the cleanup call to a single auth mechanism avoids the hang. The cleanup helper also no-ops when cookies aren't set, so `afterEach` doesn't crash on top of an already-failing test.

`storageState` is deliberately not used. Two demoqa behaviours rule it out:

- *Single-session enforcement:* a new login on the shared `tester` account invalidates older tokens; `workers: 1` falls out of the same constraint.
- *Cookie/localStorage gap:* demoqa writes auth to cookies but reads `userID`/`token` from localStorage; `storageState` can't capture values demoqa never wrote there.

Header of `tests/logged-in/e2e-flow.spec.ts` documents the same reasoning at the spec level.


## Locator strategy

Semantic-first: `getByRole`, `getByPlaceholder`, accessible-name regexes, with stable IDs (`#userName`, `#password`, `#login`) where there's no accessible name. Class-based selectors only where the framework offers no semantic alternative. No `nth-child`, no positional CSS used.

Two demoqa-specific notes baked into the POMs: action buttons on the detail page share `id="addNewRecordButton"` (an HTML spec violation), so role + accessible-name regex is the only reliable differentiator; field labels use regex like `/^ISBN\s*:/` to tolerate the site's inconsistent `Field:` / `Field :` formatting.

POMs are scoped by what they model: page-bound POMs (`LoginPage`, `BookStorePage`, etc.) for individual routes, plus a `HeaderNav` POM for the global app header (logout, navigation). Logout sits on `HeaderNav` rather than `ProfilePage` because the button is rendered globally — tests can trigger logout from any authenticated page.

## Dialog handling

demoqa surfaces two confirmation styles that need different treatment:

- **Native browser alert** — `BookDetailsPage.addToCollection()`. Server returns `"Book added to your collection."` or `"Book already present in the your collection!"` via `window.alert`, 5–6s after the click. POM registers the dialog listener *before* the click (handles both synchronous and async cases) and returns the alert text so tests can distinguish success from "already present".
- **In-page modal** — `ProfilePage.deleteBook()`. The `/profile` delete confirmation is a react-bootstrap modal (`role="dialog"`), not a native dialog. The POM targets it via `getByRole('dialog')` + the scoped OK button, and asserts deletion via the row disappearing rather than modal close (modal-close timing varies with backend latency).

## Timeout strategy

All timeouts centralised in `playwright.config.ts` — no magic numbers in test or POM code.

| Setting | Value | What it covers |
|---|---|---|
| `timeout` | 60s | Per-test (including hooks) |
| `expect.timeout` | 10s | Per-assertion (`toBeVisible`, `toHaveText`, etc.) |
| `actionTimeout` | 15s | Per-action (`click`, `fill`, `selectOption`) |
| `navigationTimeout` | 30s | Per-navigation (`goto`, `waitForURL`) |

POMs never pass explicit `{ timeout: ... }` options — Playwright's auto-retry semantics use the config defaults.

No hard sleeps (`waitForTimeout`) outside one short DOM-settle wait in `BookStorePage.search()` — client-side filtering needs a beat to render, and Playwright's auto-wait isn't appropriate.

## Known limitations & demoqa platform quirks

Empirical findings from running against the live site:

- **Async native alert on add-to-collection.** "Add To Your Collection" surfaces a native browser alert.
- **In-page modal on delete.** The `/profile` delete confirmation is a react-bootstrap modal (`role="dialog"`), *not* a native browser dialog. 
- **Delete All Books UI broken on demoqa.** Observed: the modal OK button doesn't fire the delete on the live site. Doesn't affect our suite because cleanup runs via the `DELETE /BookStore/v1/Books` API (`helpers/cleanCollection.ts`).
- **HTML id collision.** Both action buttons on the book detail page share `id="addNewRecordButton"` (HTML spec violation). POMs anchor on `getByRole('button', { name: ... })`.
- **Inconsistent button labels across pages.** The same logical Logout control renders as `Logout` on `/profile` but `Log out` (with space) on `/books`. `HeaderNav.logoutButton` uses a `/^log\s*out$/i` regex to tolerate both — exact-text match would silently fail on whichever page wasn't authored.
- **Auth-gated UI elements.** "Add To Your Collection" is not rendered for anonymous users — covered by a negative test in `book-details.spec.ts`.
- **Shared `tester` user state.** The logged-in test runs against the demoqa shared account; serial describe + API cleanup in `afterEach` keep state predictable.
- **Catalogue variance.** Search tests reference stable titles that have been reliably present, but a catalogue change could require updating `searchScenarios.json`.
- **User registration** — out of scope per task brief.

## Future work / production considerations

Out of scope for this submission, but the natural next layers for a real production app:

- **Accessibility testing** — `@axe-core/playwright` integration to assert WCAG conformance on every page render. Catches a class of UI defect (missing labels, contrast failures, ARIA misuse, keyboard-trap issues) the existing functional tests don't surface.
- **Visual regression** — Playwright's built-in `toHaveScreenshot()` for pixel-diff assertions on key pages, with platform-aware baselines and update-on-intentional-change workflows.
- **Multi-environment config** 
- **Security testing** — XSS / SQL-injection probes on form inputs, token verifications, rate limiting tests.

