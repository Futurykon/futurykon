-- Replace single category TEXT with tags TEXT[]
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing data
UPDATE questions SET tags = ARRAY[category] WHERE category IS NOT NULL AND category != '';

ALTER TABLE questions DROP COLUMN IF EXISTS category;

-- Helper for cascading renames (used by categories service)
CREATE OR REPLACE FUNCTION rename_question_tag(old_tag TEXT, new_tag TEXT)
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.questions
  SET tags = array_replace(tags, old_tag, new_tag)
  WHERE old_tag = ANY(tags);
$$;
