# Definition of Done

The repo-wide Definition of Done (DoD) for Futurykon. Every issue's own
"Test scenarios" are issue-specific; this checklist is the shared bar that
every change must clear. Issues reference this file rather than repeating it.

## DoD checklist

An issue is Done, and a PR is mergeable, only when all of the following hold:

- [ ] **Typecheck clean** — `npx tsc -b --noEmit` passes with no errors.
- [ ] **Full vitest suite green** — `npx vitest run` passes, including the
  SQL ↔ TypeScript parity tests (e.g. the Community Prediction formula and the
  `hashKey` fixture). The parity tests are part of the suite, not optional.
- [ ] **ESLint clean** — `npm run lint` passes with zero warnings
  (`--max-warnings=0`).
- [ ] **New behavior is covered by tests at the module's interface.** The
  interface is the test surface: test a hook through its returned state/actions,
  a service through its exported functions, a DB function through its SQL
  contract — not private internals or mocks of your own code. If the change adds
  or alters behavior, there is a test that would fail without the change.
- [ ] **Schema changes ship with a migration** in `supabase/migrations/`, and
  applied types are regenerated (`Tables<>`-derived app types kept in sync).
  Migrations are idempotent where practical.
- [ ] **Edge-function changes note deployment** — if a Supabase Edge Function
  (`supabase/functions/*`) changed, the PR notes that it needs deployment and
  any new secrets/config.
- [ ] **PR links its issue** with `Closes #<n>` in the PR body so the issue
  auto-closes on merge.

## Testing policy

Testing is part of the Definition of Done, not a parallel track of separate
"test issues".

- **Tests live inside the issue.** Every feature/bug issue carries its own
  "Test scenarios" section (behavioral Given/When/Then at the interface being
  built) and must satisfy the DoD checklist above. There are no standalone
  "write tests for X" issues.
- **Test-infra is the only exception.** Separate issues, labeled `test-infra`,
  exist only for test *infrastructure*: CI wiring, test harnesses, fixtures, and
  runners — not for exercising product behavior.

## Regression policy

- **The vitest suite is the regression suite.** It runs in CI on every pull
  request (`.github/workflows/ci.yml`). A red suite blocks merge.
- **The SQL ↔ TypeScript parity tests and the Deno edge-function tests are part
  of the regression suite** that CI runs. Parity between a DB function and its
  client-side replica (e.g. Community Prediction, `hashKey`) is protected by
  tests, not by convention.
- **Every bug fix is test-first.** Before the fix, add a test that reproduces
  the bug *at the affected module's interface* and fails for the current code;
  then make it pass with the fix. The failing-then-passing test is the proof the
  bug existed and is gone.
- **Regressions are labeled `regression`.** A bug that reintroduced
  previously-correct behavior gets the `regression` label, so the suite grows a
  permanent guard against that class of breakage.
