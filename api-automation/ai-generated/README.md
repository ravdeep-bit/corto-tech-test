# Task 2 Part B — AI-generated test, reviewed

The spec asked me to use an AI tool to automate one endpoint and document my corrections. I picked two so the patterns are visible across endpoint shapes.

**Endpoints chosen:** `POST /auth` (canonical example — its corrected version now lives in `tests/auth/auth.spec.ts`) and `POST /booking` (supplementary, same patterns on a CRUD endpoint).

**AI tool used:** Claude (Sonnet 4.5).

**Prompts I gave it:**

```
Generate Playwright API tests for the POST /auth endpoint of restful-booker.
Include positive and negative cases.
```

```
Generate Playwright API tests for the POST /booking endpoint of restful-booker
in TypeScript. Include positive and negative test cases.
```

I deliberately under-specified — that's what most engineers actually type when they reach for AI mid-task. I wanted to see what comes out without spoon-feeding it our framework conventions, and what I'd change as a reviewer.

## Files

```
auth-original-ai-output.ts      ← what Claude produced for /auth, copy-pasted verbatim
auth-corrected-version.ts       ← my reviewed version

booking-original-ai-output.ts   ← what Claude produced for /booking, verbatim
booking-corrected-version.ts    ← my reviewed version
```

All four are documentation only — not picked up by the test runner.

## Annotation: what I changed and why

| # | Change | Why |
|---|---|---|
| 1 | Removed hardcoded base URL — used Playwright `baseURL` config + relative paths | Original would break against any other env. Project sources `BASE_URL` from `.env`. |
| 2 | Replaced inline payload literals with `newBooking()` factory + `Booking` type | Single source of truth. When the API adds a field, one change in the factory, not N across tests. |
| 3 | Replaced hardcoded future dates (`'2026-05-01'`) with `futureDate(n)` helper | Hardcoded dates silently roll into the past. Future-relative never decays. |
| 4 | Asserted what the API *actually* returns (200 on bad creds, 500 on missing fields) — not what AI assumed | AI guesses REST conventions (`401`, `400`) without verifying. A single Postman session reveals the real behaviour. REST-correct expectations preserved separately as failing tests in `tests/bugs/`. |
| 5 | Replaced `toHaveProperty('token')` with `toEqual({ token: expect.any(String) })` | The original lets extra fields slip through. Strict shape rejects unknowns. |
| 6 | One comprehensive schema-by-example check on the positive case + Zod schemas in `schemas/booking.ts` | Fragmented per-test field assertions get out of sync. Centralised contract enforcement catches drift. |
| 7 | Added 7 missing/empty/null edge cases | Original had 2 negatives. AI rarely thinks about null/empty/typed-wrong inputs unless prompted. |
| 8 | Parameterised 7 hand-written negatives into one loop over a dataset | Adding the next case is a one-line edit to `authData.ts`, not a copy-paste of test code. |
| 9 | Externalised credentials to `test-data/authData.ts`, sourced from env vars | Inline creds don't scale to multi-env, are harder to rotate, bury config in code. |
| 10 | Added `Booking` type imports | Without them, payloads are implicit `any` and typos compile fine. |
| 11 | Added token-uniqueness check (two `/auth` calls, assert tokens differ) | Catches a real bug class — server caching/reusing tokens. AI didn't think to test this. |
| 12 | Added per-test factory data + `afterAll(cleanupBookings)` for booking specs | Restful Booker is a shared sandbox. Leaving cruft makes filter tests flaky for whoever runs next. |
| 13 | Removed redundant positive tests | Original had 3–4 overlapping happy paths. Replaced with one canonical positive + boundary cases parameterised. |
| 14 | Replaced `request.delete('/booking/9999999')` with create+delete pattern | Magic IDs decay on shared APIs. Create→delete→assert produces a deterministically-missing ID owned by the test. |
| 15 | Added `@smoke` tag on the critical happy path | So the critical path runs in the CI smoke gate. Original had no markers. |

## Why the corrected tests assert REST-standard status (not the bug)

For two specific deviations — `POST /auth` invalid creds returning `200` instead of `401`, missing-fields returning `500` instead of `400` — the corrected version asserts what the API **should** return, not what it does. Reasoning:

- Tests document the **correct contract**, not the bug we're tolerating.
- A red test in CI is a daily reminder the bug exists.
- When the API is fixed, the test passes — no annotation cleanup needed.
- Failing assertions are bug tickets in code form: file, line, expected vs actual.

The actual-returns assertions live in the main suite (`npm test` stays green); REST-correct expectations live in `tests/bugs/rest-compliance.spec.ts` (`npm run test:bugs`).

## What the AI got right

The AI version wasn't garbage. It correctly:

- Identified the right endpoint and HTTP method
- Used a structurally valid payload
- Used Playwright's built-in `request` fixture (not raw fetch / axios)
- Asserted on status code (even if poorly)

Roughly the level of a confident first draft from a junior engineer. The kind of thing that works — the test would pass — but isn't shaped for a long-lived, multi-developer codebase. Which is exactly the gap a senior reviewer is paid to close.

## Two-pass review

The auth corrected version went through two passes:

1. **First pass** caught wrong status codes (`401` → `200`), weak `toHaveProperty` schema, missing edge cases.
2. **Second pass** caught hardcoded credentials in the spec and that 7 hand-written negatives should be parameterised from a dataset.

Second-pass findings aren't about correctness — the first-pass code worked. They're about scale: code that works at small N becomes a refactor target at larger N. AI doesn't see this. The QE's job is to come back and ask *"is the data where it belongs? are the patterns DRY? would adding the next case be a one-line change?"*

## My takeaway on AI-assisted test writing

For boilerplate (request shape, basic assertions) the AI saves real time. For judgment (what to assert on, how to integrate with framework conventions, what to leave out, how to make it maintainable) it needs the same review I'd give any contributor. The danger isn't the AI being wrong — it's the AI being plausibly right and getting waved through.

Empirical verification is non-negotiable. AI generates plausible assertions; a single Postman session reveals what the API actually returns. Run the live endpoint before trusting any negative-test assertion.

I'd use AI again for a similar task. I wouldn't merge its first output without the review pass.
