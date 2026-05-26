-- Migrate question_suggestions from single category TEXT to tags TEXT[],
-- symmetric with the questions table migration (20260305000001).

ALTER TABLE public.question_suggestions ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.question_suggestions
SET tags = ARRAY[category]
WHERE category IS NOT NULL AND category != '';

ALTER TABLE public.question_suggestions DROP COLUMN IF EXISTS category;
