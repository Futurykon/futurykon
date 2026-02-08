-- Create question_suggestions table for community-suggested questions
CREATE TABLE public.question_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  close_date TIMESTAMPTZ,
  suggested_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',  -- pending / approved / rejected
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.question_suggestions ENABLE ROW LEVEL SECURITY;

-- Everyone can read suggestions
CREATE POLICY "Suggestions viewable by everyone"
  ON public.question_suggestions FOR SELECT USING (true);

-- Logged-in users can suggest
CREATE POLICY "Users can create suggestions"
  ON public.question_suggestions FOR INSERT WITH CHECK (auth.uid() = suggested_by);

-- Only admins can update (approve/reject)
CREATE POLICY "Admins can update suggestions"
  ON public.question_suggestions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins can delete suggestions
CREATE POLICY "Admins can delete suggestions"
  ON public.question_suggestions FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
