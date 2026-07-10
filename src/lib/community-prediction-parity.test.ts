// @vitest-environment node
//
// Parity test: Community Prediction formula (SQL ↔ TypeScript) — issue #23.
//
// The Community Prediction (geometric mean of odds across users' Latest
// Predictions) is implemented twice:
//   1. the authoritative SQL function `calculate_community_prediction()` in
//      supabase/migrations/20250207000000_prediction_history.sql, and
//   2. its TypeScript twin `calculateCommunityProbability()` in src/lib/predictions.ts,
//      used only by the Prediction History chart to redraw the community line
//      over time.
//
// Nothing else asserts the two agree, so the formula can silently drift. This
// test executes the REAL SQL function — extracted verbatim from the migration
// file and run in an in-process Postgres (pglite / real WASM Postgres, not a
// hand-transcribed reference) — against the same fixtures as the TS twin and
// asserts they match. If either implementation's formula changes unilaterally,
// this test fails.
//
// The SQL function is loaded straight from the migration file (not copied into
// this test), so editing the migration's arithmetic is exactly what this guard
// catches.

import { describe, test, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { calculateCommunityProbability } from './predictions';

const MIGRATION_PATH = path.resolve(
  import.meta.dirname,
  '../../supabase/migrations/20250207000000_prediction_history.sql',
);

// Extract a `CREATE OR REPLACE FUNCTION <name> ... AS $$ ... $$;` block verbatim
// from the migration SQL. Throws if the function is missing or its delimiters
// cannot be found — so a migration that renames or restructures the function
// makes this test fail loudly rather than silently skip.
function extractSqlFunction(sql: string, qualifiedName: string): string {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION ${qualifiedName}`);
  if (start === -1) {
    throw new Error(`Could not find function ${qualifiedName} in migration`);
  }
  const bodyStart = sql.indexOf('AS $$', start);
  const bodyEnd = sql.indexOf('$$;', bodyStart);
  if (bodyStart === -1 || bodyEnd === -1) {
    throw new Error(`Could not delimit body of ${qualifiedName}`);
  }
  return sql.slice(start, bodyEnd + '$$;'.length);
}

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  // Minimal `public.predictions` table with the columns the function reads.
  // Production stores `probability` as INTEGER; we use NUMERIC here purely so
  // fixtures can probe sub-integer clamp boundaries (0.01 / 99.99). The
  // function casts probability::REAL internally either way, so the arithmetic
  // under test is identical.
  await db.exec(`
    CREATE TABLE public.predictions (
      id           SERIAL PRIMARY KEY,
      question_id  UUID,
      user_id      UUID,
      probability  NUMERIC,
      created_at   TIMESTAMPTZ DEFAULT now()
    );
  `);
  const migrationSql = readFileSync(MIGRATION_PATH, 'utf8');
  const fn = extractSqlFunction(migrationSql, 'public.calculate_community_prediction');
  await db.exec(fn);
});

// Run the SQL function over a set of latest-per-user probabilities. Each entry
// is inserted as a distinct user's single (latest) prediction, so the
// function's DISTINCT ON (user_id) returns exactly this set.
async function sqlCommunityProbability(
  probabilities: number[],
): Promise<{ community: number | null; count: number }> {
  const questionId = crypto.randomUUID();
  for (const p of probabilities) {
    await db.query(
      'INSERT INTO public.predictions (question_id, user_id, probability) VALUES ($1, gen_random_uuid(), $2)',
      [questionId, p],
    );
  }
  const res = await db.query<{ community_probability: number | null; prediction_count: number }>(
    'SELECT community_probability, prediction_count FROM public.calculate_community_prediction($1)',
    [questionId],
  );
  const row = res.rows[0];
  return { community: row.community_probability, count: row.prediction_count };
}

// SQL computes in float4 (REAL); TS computes in float64. The max observed
// relative gap across these fixtures is ~5.3e-5 (at the clamp extremes, where
// the ln() magnitudes are largest). 1e-4 relative is comfortably above that
// float4 rounding floor yet far below any real formula drift, which would move
// the result by whole percentage points.
const RELATIVE_TOLERANCE = 1e-4;

function expectParity(sqlValue: number, tsValue: number) {
  const rel = Math.abs(sqlValue - tsValue) / Math.max(1, Math.abs(tsValue));
  expect(
    rel,
    `SQL=${sqlValue} vs TS=${tsValue} (relative diff ${rel.toExponential(2)})`,
  ).toBeLessThan(RELATIVE_TOLERANCE);
}

// Named fixtures covering: single prediction, extreme probabilities (0/100),
// values at and beyond the clamp bounds [0.01, 99.99], small-N sets, and a
// realistic mixed set.
const parityFixtures: Array<{ name: string; probabilities: number[] }> = [
  { name: 'single prediction (50)', probabilities: [50] },
  { name: 'single prediction (75)', probabilities: [75] },
  { name: 'single low prediction (10)', probabilities: [10] },
  { name: 'symmetric pair around 50', probabilities: [25, 75] },
  { name: 'high-consensus pair', probabilities: [80, 90] },
  { name: 'low-consensus pair', probabilities: [10, 20] },
  { name: 'single extreme low (0 → clamps to 0.01)', probabilities: [0] },
  { name: 'single extreme high (100 → clamps to 99.99)', probabilities: [100] },
  { name: 'mixed extremes (0 and 100)', probabilities: [0, 100, 0, 100] },
  { name: 'exactly at clamp bounds', probabilities: [0.01, 99.99] },
  { name: 'beyond clamp bounds (negative and >100)', probabilities: [-5, 150] },
  { name: 'beyond clamp bounds (sub-0.01 and >99.99)', probabilities: [0.001, 99.999] },
  {
    name: 'realistic mixed set (N=10)',
    probabilities: [12, 47, 63, 88, 30, 55, 71, 5, 95, 40],
  },
  { name: 'large-N uniform (N=50 @ 70)', probabilities: Array(50).fill(70) },
];

describe('Community Prediction parity: SQL ↔ TypeScript', () => {
  test.each(parityFixtures)('$name', async ({ probabilities }) => {
    const { community, count } = await sqlCommunityProbability(probabilities);
    expect(count).toBe(probabilities.length);
    expect(community).not.toBeNull();

    const tsValue = calculateCommunityProbability(probabilities);
    expectParity(community as number, tsValue);
  });

  // Documented divergence: on an empty set the SQL function returns NULL with
  // count 0, while the TS twin returns a 50 UI fallback. They intentionally
  // differ here; the app treats a NULL community prediction as "no data yet".
  test('empty set: SQL returns NULL/0, TS returns the 50 fallback', async () => {
    const { community, count } = await sqlCommunityProbability([]);
    expect(count).toBe(0);
    expect(community).toBeNull();
    expect(calculateCommunityProbability([])).toBe(50);
  });
});
