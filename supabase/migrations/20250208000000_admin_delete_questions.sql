-- Allow admins to delete questions
CREATE POLICY "Only admins can delete questions"
ON public.questions FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
