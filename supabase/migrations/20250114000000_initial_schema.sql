-- Futurykon Full Database Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query → Paste → Run

-- ============================================
-- 1. CORE TABLES
-- ============================================

-- Questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  resolution_criteria TEXT,
  close_date TIMESTAMP WITH TIME ZONE,
  resolution_status TEXT DEFAULT 'pending',
  resolution_date TIMESTAMP WITH TIME ZONE,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Predictions table
CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  probability INTEGER NOT NULL CHECK (probability >= 0 AND probability <= 100),
  reasoning TEXT,
  brier_score REAL,
  time_weighted_score REAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(question_id, user_id)
);

-- Profiles table (for admin management)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- 2. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Questions: publicly readable
CREATE POLICY "Questions are viewable by everyone"
ON public.questions FOR SELECT USING (true);

-- Questions: only admins can create
CREATE POLICY "Only admins can create questions"
ON public.questions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- Questions: only admins can update
CREATE POLICY "Only admins can update questions"
ON public.questions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- Predictions: users can only see their own
CREATE POLICY "Users can view only their own predictions"
ON public.predictions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own predictions"
ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions"
ON public.predictions FOR UPDATE USING (auth.uid() = user_id);

-- Profiles: users can view their own
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- 3. FUNCTIONS
-- ============================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (NEW.id, NEW.email, false);
  RETURN NEW;
END;
$$;

-- Brier score calculation
CREATE OR REPLACE FUNCTION public.calculate_brier_score(prediction_probability real, actual_outcome boolean)
RETURNS real
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN POWER(prediction_probability / 100.0 - CASE WHEN actual_outcome THEN 1.0 ELSE 0.0 END, 2);
END;
$$;

-- Time-weighted score
CREATE OR REPLACE FUNCTION public.calculate_time_weighted_score(
  prediction_probability real,
  actual_outcome boolean,
  prediction_date timestamp with time zone,
  resolution_date timestamp with time zone,
  decay_factor real DEFAULT 0.95
)
RETURNS real
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  base_score real;
  days_early real;
  time_weight real;
BEGIN
  base_score := public.calculate_brier_score(prediction_probability, actual_outcome);
  days_early := EXTRACT(EPOCH FROM (resolution_date - prediction_date)) / 86400;
  time_weight := POWER(decay_factor, GREATEST(days_early, 0));
  RETURN base_score * (2.0 - time_weight);
END;
$$;

-- Auto-update scores when question is resolved
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

    FOR prediction_record IN
      SELECT id, probability, created_at
      FROM public.predictions
      WHERE question_id = NEW.id
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

-- ============================================
-- 4. TRIGGERS
-- ============================================

CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_predictions_updated_at
BEFORE UPDATE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_question_resolved
AFTER UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.update_prediction_scores();

-- ============================================
-- 5. SAMPLE DATA (Optional)
-- ============================================

INSERT INTO public.questions (title, description, resolution_criteria, close_date) VALUES
('Czy AI osiągnie AGI do 2030 roku?',
 'Czy sztuczna inteligencja osiągnie poziom AGI przed końcem 2030 roku?',
 'AGI zostanie uznane za osiągnięte gdy system AI będzie w stanie wykonywać wszystkie zadania kognitywne na poziomie człowieka.',
 '2030-12-31 23:59:59'),
('Czy GPT-5 zostanie wydane w 2025?',
 'Czy OpenAI wyda model GPT-5 przed końcem 2025 roku?',
 'Oficjalne ogłoszenie i publiczny dostęp do modelu o nazwie GPT-5.',
 '2025-12-31 23:59:59'),
('Czy Polska wygra Eurowizję 2026?',
 'Czy reprezentant Polski zajmie pierwsze miejsce w konkursie Eurowizji 2026?',
 'Pytanie rozstrzygnie się pozytywnie jeśli Polska zajmie pierwsze miejsce w finale Eurowizji 2026.',
 '2026-05-15 23:59:59');
