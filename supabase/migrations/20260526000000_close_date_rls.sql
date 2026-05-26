-- Enforce close_date and pending status on predictions INSERT at DB level.
-- Previously only enforced client-side via isQuestionExpired().

DROP POLICY IF EXISTS "Users can create their own predictions" ON public.predictions;

CREATE POLICY "Users can create their own predictions"
ON public.predictions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND now() < (SELECT close_date FROM public.questions WHERE id = question_id)
  AND (SELECT resolution_status FROM public.questions WHERE id = question_id) = 'pending'
);
