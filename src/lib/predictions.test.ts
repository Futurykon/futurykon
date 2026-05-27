import { describe, test, expect } from 'vitest';
import { isQuestionExpired, calculateCommunityProbability, groupByUser } from './predictions';
import type { Prediction } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: 'pred-1',
    question_id: 'q-1',
    user_id: 'user-1',
    probability: 50,
    reasoning: '',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── isQuestionExpired ─────────────────────────────────────────────────────────

describe('isQuestionExpired', () => {
  test('past date is expired', () => {
    expect(isQuestionExpired('2020-01-01T00:00:00Z')).toBe(true);
  });

  test('future date is not expired', () => {
    expect(isQuestionExpired('2099-01-01T00:00:00Z')).toBe(false);
  });

  test('date far in the past is expired', () => {
    expect(isQuestionExpired('2000-06-15T12:00:00Z')).toBe(true);
  });
});

// ── calculateCommunityProbability ─────────────────────────────────────────────

describe('calculateCommunityProbability', () => {
  test('empty array returns 50', () => {
    expect(calculateCommunityProbability([])).toBe(50);
  });

  test('single prediction at 50 returns ~50', () => {
    const result = calculateCommunityProbability([50]);
    expect(result).toBeCloseTo(50, 1);
  });

  test('single prediction at 75 returns ~75', () => {
    const result = calculateCommunityProbability([75]);
    expect(result).toBeCloseTo(75, 1);
  });

  test('single prediction at 10 returns ~10', () => {
    const result = calculateCommunityProbability([10]);
    expect(result).toBeCloseTo(10, 1);
  });

  test('all identical predictions return that value', () => {
    const result = calculateCommunityProbability([60, 60, 60]);
    expect(result).toBeCloseTo(60, 1);
  });

  test('symmetric predictions around 50 return 50', () => {
    const result = calculateCommunityProbability([25, 75]);
    expect(result).toBeCloseTo(50, 1);
  });

  test('two high-consensus predictions give a high result', () => {
    const result = calculateCommunityProbability([80, 90]);
    expect(result).toBeGreaterThan(70);
  });

  test('two low-consensus predictions give a low result', () => {
    const result = calculateCommunityProbability([10, 20]);
    expect(result).toBeLessThan(30);
  });

  test('0% is clamped — does not crash or return NaN', () => {
    const result = calculateCommunityProbability([0]);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeCloseTo(0.01, 1);
  });

  test('100% is clamped — does not crash or return NaN', () => {
    const result = calculateCommunityProbability([100]);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeCloseTo(99.99, 1);
  });

  test('mix of extreme values is finite', () => {
    const result = calculateCommunityProbability([0, 100, 0, 100]);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeCloseTo(50, 1);
  });

  test('large number of uniform predictions stays stable', () => {
    const probs = Array(100).fill(70);
    const result = calculateCommunityProbability(probs);
    expect(result).toBeCloseTo(70, 1);
  });
});

// ── groupByUser ───────────────────────────────────────────────────────────────

describe('groupByUser', () => {
  test('empty array returns empty array', () => {
    expect(groupByUser([])).toEqual([]);
  });

  test('single prediction produces one group with no history', () => {
    const pred = makePrediction();
    const groups = groupByUser([pred]);
    expect(groups).toHaveLength(1);
    expect(groups[0].user_id).toBe('user-1');
    expect(groups[0].latest).toBe(pred);
    expect(groups[0].history).toHaveLength(0);
  });

  test('two predictions for same user: latest is first, older is in history', () => {
    const older = makePrediction({ id: 'p1', created_at: '2026-01-01T00:00:00Z', probability: 30 });
    const newer = makePrediction({ id: 'p2', created_at: '2026-06-01T00:00:00Z', probability: 60 });
    // getAllPredictions returns newest-first (DB ORDER BY created_at DESC)
    const groups = groupByUser([newer, older]);
    expect(groups).toHaveLength(1);
    expect(groups[0].latest).toBe(newer);
    expect(groups[0].history).toEqual([older]);
  });

  test('predictions for different users produce separate groups', () => {
    const p1 = makePrediction({ user_id: 'user-1' });
    const p2 = makePrediction({ id: 'pred-2', user_id: 'user-2' });
    const groups = groupByUser([p1, p2]);
    expect(groups).toHaveLength(2);
    const ids = groups.map((g) => g.user_id);
    expect(ids).toContain('user-1');
    expect(ids).toContain('user-2');
  });

  test('groups are sorted with most-recently-active user first', () => {
    const earlyPred = makePrediction({
      user_id: 'user-early',
      created_at: '2026-01-01T00:00:00Z',
    });
    const latePred = makePrediction({
      id: 'pred-2',
      user_id: 'user-late',
      created_at: '2026-06-01T00:00:00Z',
    });
    const groups = groupByUser([earlyPred, latePred]);
    expect(groups[0].user_id).toBe('user-late');
    expect(groups[1].user_id).toBe('user-early');
  });

  test('display name prefers profiles.display_name', () => {
    const pred = makePrediction({
      profiles: { display_name: 'Jan Kowalski', email: 'jan@example.com' },
      user_email: 'jan@example.com',
    });
    const [group] = groupByUser([pred]);
    expect(group.user_display_name).toBe('Jan Kowalski');
  });

  test('display name falls back to profiles.email when no display_name', () => {
    const pred = makePrediction({
      profiles: { display_name: undefined, email: 'jan@example.com' },
    });
    const [group] = groupByUser([pred]);
    expect(group.user_display_name).toBe('jan@example.com');
  });

  test('display name falls back to user_email when no profiles', () => {
    const pred = makePrediction({
      profiles: undefined,
      user_email: 'fallback@example.com',
    });
    const [group] = groupByUser([pred]);
    expect(group.user_display_name).toBe('fallback@example.com');
  });

  test('display name falls back to Anonim when no email anywhere', () => {
    const pred = makePrediction({ profiles: undefined, user_email: undefined });
    const [group] = groupByUser([pred]);
    expect(group.user_display_name).toBe('Anonim');
  });

  test('user_email on group reflects profiles.email or user_email', () => {
    const pred = makePrediction({
      profiles: { email: 'via-profiles@example.com' },
    });
    const [group] = groupByUser([pred]);
    expect(group.user_email).toBe('via-profiles@example.com');
  });

  test('three predictions for one user: correct history length and order', () => {
    const p1 = makePrediction({ id: 'p1', created_at: '2026-03-01T00:00:00Z', probability: 70 });
    const p2 = makePrediction({ id: 'p2', created_at: '2026-02-01T00:00:00Z', probability: 50 });
    const p3 = makePrediction({ id: 'p3', created_at: '2026-01-01T00:00:00Z', probability: 30 });
    // newest-first as returned by DB
    const groups = groupByUser([p1, p2, p3]);
    expect(groups[0].latest).toBe(p1);
    expect(groups[0].history).toEqual([p2, p3]);
  });
});
