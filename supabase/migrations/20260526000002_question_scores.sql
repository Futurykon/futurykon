-- Replace Brier score columns and functions with time-averaged log score
-- stored in a dedicated question_scores table (one row per user/question).
-- Scoring model: Metaculus approach — each prediction interval is scored
-- using log score, weighted by its duration as a fraction of total duration.

-- ============================================================
-- 1. CREATE question_scores TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.question_scores (
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_score   REAL NOT NULL,
  scored_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, user_id)
);

ALTER TABLE public.question_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Question scores are publicly readable"
  ON public.question_scores FOR SELECT USING (true);

-- ============================================================
-- 2. DROP OLD BRIER SCORE COLUMNS FROM predictions
-- ============================================================

ALTER TABLE public.predictions DROP COLUMN IF EXISTS brier_score;
ALTER TABLE public.predictions DROP COLUMN IF EXISTS time_weighted_score;

-- ============================================================
-- 3. DROP OLD SCORING FUNCTIONS AND TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS on_question_resolved ON public.questions;
DROP FUNCTION IF EXISTS public.update_prediction_scores();
DROP FUNCTION IF EXISTS public.calculate_brier_score(real, boolean);
DROP FUNCTION IF EXISTS public.calculate_time_weighted_score(real, boolean, timestamptz, timestamptz, real);

-- ============================================================
-- 4. CREATE TIME-AVERAGED LOG SCORE FUNCTION
-- ============================================================
-- For each prediction interval [t_i, t_{i+1}]:
--   log_score_i = y*ln(p_i) + (1-y)*ln(1-p_i)   (p clamped to [0.01, 0.99])
--   weight_i    = (t_{i+1} - t_i) / total_duration
-- final = Σ(log_score_i * weight_i)

CREATE OR REPLACE FUNCTION public.calculate_time_averaged_log_score(
  p_question_id UUID,
  p_user_id     UUID,
  p_outcome     BOOLEAN,
  p_resolution_date TIMESTAMPTZ
)
RETURNS REAL
LANGUAGE SQL
STABLE
SET search_path = ''
AS $$
  WITH ordered_preds AS (
    SELECT
      GREATEST(0.01, LEAST(99.99, probability::REAL)) / 100.0 AS p,
      created_at,
      LEAD(created_at) OVER (ORDER BY created_at ASC) AS next_time
    FROM public.predictions
    WHERE question_id = p_question_id
      AND user_id     = p_user_id
      AND created_at < p_resolution_date
  ),
  intervals AS (
    SELECT
      p,
      EXTRACT(EPOCH FROM (COALESCE(next_time, p_resolution_date) - created_at)) AS duration_secs
    FROM ordered_preds
  ),
  scored AS (
    SELECT
      (CASE WHEN p_outcome THEN LN(p) ELSE LN(1.0 - p) END) * duration_secs AS weighted_score,
      duration_secs
    FROM intervals
    WHERE duration_secs > 0
  )
  SELECT
    CASE
      WHEN SUM(duration_secs) = 0 OR SUM(duration_secs) IS NULL THEN NULL
      ELSE (SUM(weighted_score) / SUM(duration_secs))::REAL
    END
  FROM scored
$$;

-- ============================================================
-- 5. CREATE TRIGGER FUNCTION AND TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_question_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  actual_outcome BOOLEAN;
  pred_user      RECORD;
  score          REAL;
BEGIN
  IF NEW.resolution_status IN ('yes', 'no') AND OLD.resolution_status = 'pending' THEN
    actual_outcome := (NEW.resolution_status = 'yes');

    FOR pred_user IN
      SELECT DISTINCT user_id
      FROM public.predictions
      WHERE question_id = NEW.id
    LOOP
      score := public.calculate_time_averaged_log_score(
        NEW.id,
        pred_user.user_id,
        actual_outcome,
        NEW.resolution_date
      );

      IF score IS NOT NULL THEN
        INSERT INTO public.question_scores (question_id, user_id, log_score)
        VALUES (NEW.id, pred_user.user_id, score)
        ON CONFLICT (question_id, user_id) DO UPDATE SET log_score = EXCLUDED.log_score, scored_at = now();
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_question_resolved
  AFTER UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_question_scores();

-- ============================================================
-- 6. BACKFILL RESOLVED QUESTIONS
-- ============================================================

DO $$
DECLARE
  q RECORD;
  pred_user RECORD;
  score REAL;
BEGIN
  FOR q IN
    SELECT id, resolution_status, resolution_date
    FROM public.questions
    WHERE resolution_status IN ('yes', 'no')
      AND resolution_date IS NOT NULL
  LOOP
    FOR pred_user IN
      SELECT DISTINCT user_id
      FROM public.predictions
      WHERE question_id = q.id
    LOOP
      score := public.calculate_time_averaged_log_score(
        q.id,
        pred_user.user_id,
        (q.resolution_status = 'yes'),
        q.resolution_date
      );

      IF score IS NOT NULL THEN
        INSERT INTO public.question_scores (question_id, user_id, log_score)
        VALUES (q.id, pred_user.user_id, score)
        ON CONFLICT (question_id, user_id) DO UPDATE SET log_score = EXCLUDED.log_score;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;
