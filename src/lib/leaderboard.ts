import { getDisplayName } from '@/lib/profiles';

/**
 * A row as returned by the `leaderboard` DB view. The view encodes the full
 * ranking rule (per-user avg log_score across resolved questions, gated by the
 * 5-distinct-questions participation threshold, ordered by avg_log_score DESC).
 * All columns are nullable because Postgres views produce nullable columns.
 */
export interface LeaderboardRow {
  user_id: string | null;
  email: string | null;
  display_name: string | null;
  avg_log_score: number | null;
  scored_count: number | null;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avg_log_score: number;
  scored_count: number;
}

/**
 * Thin mapping from a `leaderboard` view row to a render-ready entry. The DB
 * view already applies the rule and ordering; this only resolves the display
 * label and coalesces nulls — it must NOT re-rank or re-filter.
 */
export function mapLeaderboardRow(row: LeaderboardRow): LeaderboardEntry {
  return {
    user_id: row.user_id ?? '',
    display_name: getDisplayName(row, 'Nieznany'),
    avg_log_score: row.avg_log_score ?? 0,
    scored_count: row.scored_count ?? 0,
  };
}
