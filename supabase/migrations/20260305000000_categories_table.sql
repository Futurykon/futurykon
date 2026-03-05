CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6b7280',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are publicly readable"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Seed with existing categories
INSERT INTO categories (name, color, sort_order) VALUES
  ('AGI i Superinteligencja', '#F20505', 1),
  ('Modele językowe',         '#C202A1', 2),
  ('Robotyka',                '#3b82f6', 3),
  ('AI w medycynie',          '#22c55e', 4),
  ('Autonomiczne pojazdy',    '#f97316', 5),
  ('AI w biznesie',           '#8b5cf6', 6),
  ('Regulacje AI',            '#06b6d4', 7),
  ('Inne',                    '#6b7280', 8)
ON CONFLICT (name) DO NOTHING;
