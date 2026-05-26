import type { Prediction, UserPredictionGroup } from '@/types';
import { getDisplayName } from '@/lib/profiles';

export function isQuestionExpired(closeDate: string): boolean {
  return new Date(closeDate) < new Date();
}

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
