ALTER TABLE notes ADD COLUMN IF NOT EXISTS honeymoon_items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS honeymoon_packing jsonb DEFAULT '{}'::jsonb;