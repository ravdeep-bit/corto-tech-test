# CORTO Quality Engineering Technical Test

Submission for the Senior Quality Engineer technical exercise. Two sibling projects, both Playwright + TypeScript, each self-contained.

## Layout

```
corto-tech-test/
├── ui-automation/      Task 1 — UI tests for demoqa.com Book Store
├── api-automation/     Task 2 — API tests for restful-booker
└── README.md           This file
```

## Quick start

```bash
# UI tests
cd ui-automation
npm install
npx playwright install chromium
npm test

# API tests
cd ../api-automation
npm install
npm test
```

## Sub-projects

**`ui-automation/`** — Playwright/TS UI tests for https://demoqa.com. Page Object Model with custom fixtures, data-driven search, single end-to-end logged-in journey with API-driven cleanup. See `ui-automation/README.md`.

**`api-automation/`** — Playwright/TS API tests for https://restful-booker.herokuapp.com. Direct `request` calls, simple data factories, all 8 endpoints covered, plus a separate bug-surfacing suite that asserts REST conventions the target API violates. Includes Part B (`api-automation/ai-generated/`) — preserved AI-generated test pairs alongside corrected versions and an annotated README on the failure modes. See `api-automation/README.md`.

## AI usage disclosure

Both projects were scaffolded with AI assistance (Claude). Validation: TypeScript strict mode (`tsc --noEmit` clean), manual review against Senior QE patterns, explicit anti-pattern audit (no hard waits, semantic locators, no `any`, test isolation), live-target verification, and empirical API exploration where docs were ambiguous. Per-project details are in each sub-README; the deepest AI-literacy demonstration is `api-automation/ai-generated/README.md`.
