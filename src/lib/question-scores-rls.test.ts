// @vitest-environment node
//
// Regression test for the "resolving a question fails with RLS violation on
// question_scores" bug.
//
// Symptom (admin resolving a question in the app):
//   PATCH /rest/v1/questions?id=eq.<uuid>
//   HTTP 403, code 42501
//   'new row violates row-level security policy for table "question_scores"'
//
// Root cause: question_scores has RLS enabled with ONLY a SELECT policy, and
// the AFTER UPDATE trigger on questions inserts computed log scores into it.
// The trigger function `update_question_scores` was SECURITY INVOKER (default),
// so on resolution it ran as the resolving user, who has no INSERT policy — the
// INSERT (and the whole questions UPDATE) was rejected.
//
// This test executes the REAL migration SQL — the original table/RLS/trigger
// migration plus the SECURITY DEFINER fix migration, both loaded verbatim — in
// an in-process Postgres (pglite). It creates a non-superuser role (standing in
// for the resolving admin's RLS context, since superusers and table owners
// bypass RLS), resolves a question as that role, and asserts a score row lands
// in question_scores. Without the fix migration this UPDATE fails with 42501,
// exactly as in production.

import { describe, test, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../supabase/migrations');
const BASE_MIGRATION = '20260526000002_question_scores.sql';
const FIX_MIGRATION = '20260714000000_question_scores_trigger_security_definer.sql';

function migrationSql(name: string): string {
  return readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
}

let db: PGlite;

// A fixed question and two users who each made one prediction before resolution.
const QUESTION_ID = '81f15d8e-0000-4000-8000-000000000001';
const USER_A = '00000000-0000-4000-8000-0000000000a1';
const USER_B = '00000000-0000-4000-8000-0000000000b2';

beforeAll(async () => {
  db = new PGlite();

  // Base tables the question_scores migration references. Kept minimal but with
  // the columns/keys the trigger and scoring function read.
  await db.exec(`
    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY
    );
    CREATE TABLE public.questions (
      id                UUID PRIMARY KEY,
      resolution_status TEXT NOT NULL DEFAULT 'pending',
      resolution_date   TIMESTAMPTZ
    );
    CREATE TABLE public.predictions (
      id           SERIAL PRIMARY KEY,
      question_id  UUID,
      user_id      UUID,
      probability  NUMERIC,
      brier_score  REAL,          -- dropped by the migration under test
      time_weighted_score REAL,   -- dropped by the migration under test
      created_at   TIMESTAMPTZ DEFAULT now()
    );
  `);

  // Apply the real migrations verbatim: this creates question_scores, its
  // RLS + SELECT-only policy, the scoring function, the trigger function, and
  // the trigger; then the fix migration re-declares the trigger function as
  // SECURITY DEFINER.
  await db.exec(migrationSql(BASE_MIGRATION));
  await db.exec(migrationSql(FIX_MIGRATION));

  // A non-superuser role to stand in for the resolving admin. Superusers and
  // the table owner bypass RLS, so we must resolve the question as a plain role
  // to exercise the policy path that failed in production.
  await db.exec(`
    CREATE ROLE app_user NOLOGIN;
    GRANT USAGE ON SCHEMA public TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
  `);

  // Seed a pending question with predictions from two users.
  await db.exec(`
    INSERT INTO public.profiles (id) VALUES ('${USER_A}'), ('${USER_B}');
    INSERT INTO public.questions (id, resolution_status, resolution_date)
      VALUES ('${QUESTION_ID}', 'pending', '2026-07-14T00:00:00Z');
    INSERT INTO public.predictions (question_id, user_id, probability, created_at) VALUES
      ('${QUESTION_ID}', '${USER_A}', 70, '2026-07-01T00:00:00Z'),
      ('${QUESTION_ID}', '${USER_B}', 30, '2026-07-01T00:00:00Z');
  `);
});

describe('question_scores RLS: resolving a question writes scores via the trigger', () => {
  test('a non-superuser can resolve a question and scores are inserted', async () => {
    // Resolve the question as the non-superuser role — this fires the trigger,
    // which INSERTs into question_scores. Before the SECURITY DEFINER fix this
    // throws 42501 "new row violates row-level security policy for table
    // \"question_scores\"".
    await db.exec(`
      SET ROLE app_user;
      UPDATE public.questions
        SET resolution_status = 'yes'
        WHERE id = '${QUESTION_ID}';
      RESET ROLE;
    `);

    const res = await db.query<{ user_id: string; log_score: number }>(
      'SELECT user_id, log_score FROM public.question_scores WHERE question_id = $1 ORDER BY user_id',
      [QUESTION_ID],
    );

    // Both users who predicted get exactly one score row.
    expect(res.rows.map((r) => r.user_id)).toEqual([USER_A, USER_B]);
    // Correct-side predictor (USER_A at 70% on a YES) scores higher (less
    // negative log score) than the wrong-side predictor (USER_B at 30%).
    const byUser = Object.fromEntries(res.rows.map((r) => [r.user_id, r.log_score]));
    expect(byUser[USER_A]).toBeGreaterThan(byUser[USER_B]);
  });

  test('direct client INSERT into question_scores is still blocked by RLS', async () => {
    // The fix must NOT open a general INSERT hole: a plain role writing directly
    // (not through the trigger) must still be rejected.
    await expect(
      db.exec(`
        SET ROLE app_user;
        INSERT INTO public.question_scores (question_id, user_id, log_score)
          VALUES ('${QUESTION_ID}', '${USER_A}', -0.1);
      `),
    ).rejects.toThrow(/row-level security/i);
    await db.exec('RESET ROLE;');
  });
});
