-- Migrate non-canonical budget item categories to canonical names
-- "Planning" → "Wedding Planner"
-- "Attire" → "Dress/Attire"
-- "Beauty" → "Hair & Makeup"
-- "Décor" → "Decor"

UPDATE budget_items SET category = 'Wedding Planner' WHERE category = 'Planning';
UPDATE budget_items SET category = 'Dress/Attire' WHERE category = 'Attire';
UPDATE budget_items SET category = 'Hair & Makeup' WHERE category = 'Beauty';
UPDATE budget_items SET category = 'Decor' WHERE category = 'Décor';
