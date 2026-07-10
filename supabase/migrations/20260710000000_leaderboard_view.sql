-- Leaderboard ranking rule as a single DB view.
--
-- Encodes the full rule (see CONTEXT.md → "Leaderboard"), previously duplicated
-- in src/pages/Leaderboard.tsx and supabase/functions/mcp/index.ts:
--
--   * avg_log_score = AVG(log_score) over the user's rows in question_scores
--                     (one row per resolved question the user was scored on).
--   * scored_count  = number of scored questions for the user  (the DISPLAYED count).
--   * participation threshold: only users who have predicted on >= 5 DISTINCT
--     questions are shown. This counts predictions regardless of resolution
--     status (participation threshold, not a scoring threshold), so it is derived
--     from `predictions`, NOT from `question_scores`.
--   * display fields (email, display_name) joined from profiles; the app resolves
--     the shown label via getDisplayName(email/display_name) exactly as before.
--   * ordered by avg_log_score DESC (higher / less negative is better).
--
-- A view (not a function) suffices — the rule takes no parameters.

CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  qs.user_id,
  pr.email,
  pr.display_name,
  AVG(qs.log_score)::REAL AS avg_log_score,
  COUNT(*)::INTEGER       AS scored_count
FROM public.question_scores qs
JOIN public.profiles pr ON pr.id = qs.user_id
WHERE (
  SELECT COUNT(DISTINCT p.question_id)
  FROM public.predictions p
  WHERE p.user_id = qs.user_id
) >= 5
GROUP BY qs.user_id, pr.email, pr.display_name
ORDER BY avg_log_score DESC;

-- Publicly viewable, consistent with the community_predictions view and the
-- "publicly readable" RLS on question_scores.
GRANT SELECT ON public.leaderboard TO anon, authenticated;
