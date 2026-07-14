-- Fix: resolving a question fails with RLS violation on question_scores.
--
-- Symptom (admin resolving a question in the app):
--   PATCH /rest/v1/questions?id=eq.<uuid>
--   HTTP 403, code 42501
--   "new row violates row-level security policy for table \"question_scores\""
--
-- Root cause: 20260526000002_question_scores.sql enables RLS on
-- public.question_scores with ONLY a SELECT policy ("publicly readable"), and
-- creates an AFTER UPDATE trigger on public.questions whose function
-- (update_question_scores) INSERTs the computed log scores into
-- question_scores. That trigger function was created SECURITY INVOKER (the
-- default), so on resolution it runs as the resolving admin, whose RLS context
-- has no INSERT policy on question_scores -> the INSERT (and thus the whole
-- questions UPDATE) is rejected.
--
-- Fix: recreate the trigger function as SECURITY DEFINER so the INSERT runs as
-- the function owner (postgres, via migrations) and is not subject to the
-- caller's RLS. We deliberately do NOT add an INSERT policy to question_scores:
-- no client should ever write scores directly, so RLS should keep blocking
-- direct client INSERTs; only this trusted trigger path may write.
--
-- Body is identical to the original (20260526000002); the only change is the
-- added `SECURITY DEFINER`. The trigger `on_question_resolved` already points
-- at this function, so we CREATE OR REPLACE and leave the trigger untouched.
-- `SET search_path = ''` is retained (all references are schema-qualified),
-- which is important hygiene for a SECURITY DEFINER function.

CREATE OR REPLACE FUNCTION public.update_question_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
