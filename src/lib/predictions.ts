import type { Prediction, UserPredictionGroup } from '@/types';
import { getDisplayName } from '@/lib/profiles';

export function isQuestionExpired(closeDate: string): boolean {
  return new Date(closeDate) < new Date();
}

/**
 * TypeScript twin of the SQL `calculate_community_prediction()` function
 * (supabase/migrations/20250207000000_prediction_history.sql). The SQL function
 * is AUTHORITATIVE — it is what the app and API return. This twin exists only so
 * the Prediction History chart can redraw the community line as a time series
 * (recomputing the geometric mean of odds at each historical point client-side,
 * which is impractical to round-trip to the DB per frame).
 *
 * The two implementations must stay in lock-step: their agreement is guarded by
 * the fixture-driven parity test in
 * src/lib/community-prediction-parity.test.ts, which runs the real SQL function
 * (extracted from the migration) against this function over shared fixtures.
 * If you change the formula here, change it in the migration too — or the parity
 * test will fail.
 *
 * Note: unlike the SQL function (which returns NULL for an empty set), this twin
 * returns a 50 UI fallback when there are no predictions.
 */
export function calculateCommunityProbability(probabilities: number[]): number {
  if (probabilities.length === 0) return 50;
  const clamped = probabilities.map((p) => Math.max(0.01, Math.min(99.99, p)));
  const avgLnP = clamped.reduce((sum, p) => sum + Math.log(p / 100), 0) / clamped.length;
  const avgLn1MinusP = clamped.reduce((sum, p) => sum + Math.log(1 - p / 100), 0) / clamped.length;
  const numerator = Math.exp(avgLnP);
  return (numerator / (numerator + Math.exp(avgLn1MinusP))) * 100;
}

export function groupByUser(predictions: Prediction[]): UserPredictionGroup[] {
  const map = new Map<string, Prediction[]>();
  for (const p of predictions) {
    const arr = map.get(p.user_id);
    if (arr) arr.push(p);
    else map.set(p.user_id, [p]);
  }
  const groups: UserPredictionGroup[] = [];
  for (const [userId, userPreds] of map) {
    const latest = userPreds[0];
    groups.push({
      user_id: userId,
      user_email: latest.profiles?.email || latest.user_email,
      user_display_name: getDisplayName({
        display_name: latest.profiles?.display_name,
        email: latest.profiles?.email || latest.user_email,
      }),
      latest,
      history: userPreds.slice(1),
    });
  }
  groups.sort(
    (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime(),
  );
  return groups;
}
