-- Migration: prediction history
-- Allow multiple predictions per user per question (history tracking)
-- Open up RLS so all predictions are publicly readable

-- ============================================
-- 1. DROP UNIQUE CONSTRAINT
-- ============================================
-- Allow multiple predictions per user per question
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_question_id_user_id_key;

-- ============================================
-- 2. UPDATE RLS POLICIES
-- ============================================

-- Replace restrictive SELECT policy with open one
DROP POLICY IF EXISTS "Users can view only their own predictions" ON public.predictions;
CREATE POLICY "Predictions are viewable by everyone"
ON public.predictions FOR SELECT USING (true);

-- Keep INSERT/UPDATE policies user-scoped (unchanged)

-- Allow reading profiles (needed for email display in prediction thread)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (true);

-- ============================================
-- 3. REWRITE calculate_community_prediction()
-- ============================================
-- Use only the latest prediction per user (DISTINCT ON)
CREATE OR REPLACE FUNCTION public.calculate_community_prediction(question_uuid UUID)
RETURNS TABLE(
  question_id UUID,
  community_probability REAL,
  prediction_count INTEGER
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  avg_ln_p REAL;
  avg_ln_1_minus_p REAL;
  numerator REAL;
  denominator REAL;
  count_predictions INTEGER;
BEGIN
  -- Get count and averages of log probabilities
  -- Use only the latest prediction per user (DISTINCT ON)
  -- Clamp probabilities to [0.01, 99.99] to avoid ln(0) and division by zero
  SELECT
    COUNT(*)::INTEGER,
    AVG(LN(GREATEST(0.01, LEAST(99.99, latest.probability::REAL)) / 100.0)),
    AVG(LN(1.0 - GREATEST(0.01, LEAST(99.99, latest.probability::REAL)) / 100.0))
  INTO count_predictions, avg_ln_p, avg_ln_1_minus_p
  FROM (
    SELECT DISTINCT ON (user_id) probability
    FROM public.predictions
    WHERE predictions.question_id = question_uuid
    ORDER BY user_id, created_at DESC
  ) latest;

  -- If no predictions, return NULL
  IF count_predictions = 0 OR avg_ln_p IS NULL OR avg_ln_1_minus_p IS NULL THEN
    RETURN QUERY SELECT question_uuid, NULL::REAL, 0::INTEGER;
    RETURN;
  END IF;

  -- Calculate geometric mean of odds and convert back to probability
  -- p = exp(avg(ln(p))) / (exp(avg(ln(p))) + exp(avg(ln(1-p))))
  numerator := EXP(avg_ln_p);
  denominator := numerator + EXP(avg_ln_1_minus_p);

  RETURN QUERY SELECT
    question_uuid,
    (numerator / denominator * 100)::REAL,
    count_predictions;
END;
$$;

-- ============================================
-- 4. REWRITE update_prediction_scores()
-- ============================================
-- When question resolves, only score the latest prediction per user
CREATE OR REPLACE FUNCTION public.update_prediction_scores()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  prediction_record record;
  actual_outcome boolean;
BEGIN
  IF NEW.resolution_status IN ('yes', 'no') AND OLD.resolution_status = 'pending' THEN
    actual_outcome := (NEW.resolution_status = 'yes');

    -- Only score the latest prediction per user for this question
    FOR prediction_record IN
      SELECT DISTINCT ON (user_id) id, probability, created_at
      FROM public.predictions
      WHERE question_id = NEW.id
      ORDER BY user_id, created_at DESC
    LOOP
      UPDATE public.predictions
      SET
        brier_score = public.calculate_brier_score(prediction_record.probability, actual_outcome),
        time_weighted_score = public.calculate_time_weighted_score(
          prediction_record.probability,
          actual_outcome,
          prediction_record.created_at,
          NEW.resolution_date
        )
      WHERE id = prediction_record.id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
