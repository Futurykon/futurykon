import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mapLeaderboardRow, type LeaderboardRow } from './leaderboard';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('mapLeaderboardRow', () => {
  it('prefers display_name, falls back to email, then to "Nieznany"', () => {
    expect(
      mapLeaderboardRow({
        user_id: 'u1',
        display_name: 'Ada',
        email: 'ada@example.com',
        avg_log_score: -0.2,
        scored_count: 7,
      }).display_name,
    ).toBe('Ada');

    expect(
      mapLeaderboardRow({
        user_id: 'u2',
        display_name: null,
        email: 'bob@example.com',
        avg_log_score: -0.5,
        scored_count: 6,
      }).display_name,
    ).toBe('bob@example.com');

    expect(
      mapLeaderboardRow({
        user_id: 'u3',
        display_name: null,
        email: null,
        avg_log_score: -0.9,
        scored_count: 5,
      }).display_name,
    ).toBe('Nieznany');
  });

  it('coalesces nullable numeric columns without re-ranking', () => {
    const entry = mapLeaderboardRow({
      user_id: null,
      display_name: 'X',
      email: null,
      avg_log_score: null,
      scored_count: null,
    });
    expect(entry).toEqual({
      user_id: '',
      display_name: 'X',
      avg_log_score: 0,
      scored_count: 0,
    });
  });

  it('passes avg_log_score and scored_count through verbatim (no client aggregation)', () => {
    const row: LeaderboardRow = {
      user_id: 'u',
      display_name: 'U',
      email: null,
      avg_log_score: -0.1234,
      scored_count: 9,
    };
    const entry = mapLeaderboardRow(row);
    expect(entry.avg_log_score).toBe(-0.1234);
    expect(entry.scored_count).toBe(9);
  });
});

// Guard the rule's single source of truth: the migration must encode the full
// leaderboard rule. If someone reintroduces client-side aggregation, or weakens
// the SQL, these assertions should flag it.
describe('leaderboard view migration encodes the full rule', () => {
  const sql = readFileSync(
    resolve(__dirname, '../../supabase/migrations/20260710000000_leaderboard_view.sql'),
    'utf8',
  );

  it('creates the leaderboard view', () => {
    expect(sql).toMatch(/CREATE OR REPLACE VIEW public\.leaderboard/i);
  });

  it('aggregates avg log score and scored count from question_scores', () => {
    expect(sql).toMatch(/AVG\(qs\.log_score\)/i);
    expect(sql).toMatch(/COUNT\(\*\)/i);
    expect(sql).toMatch(/FROM public\.question_scores/i);
  });

  it('gates on 5 distinct predicted questions from predictions', () => {
    expect(sql).toMatch(/COUNT\(DISTINCT p\.question_id\)/i);
    expect(sql).toMatch(/FROM public\.predictions/i);
    expect(sql).toMatch(/>=\s*5/);
  });

  it('orders by avg_log_score descending and grants public read', () => {
    expect(sql).toMatch(/ORDER BY avg_log_score DESC/i);
    expect(sql).toMatch(/GRANT SELECT ON public\.leaderboard TO anon, authenticated/i);
  });
});
