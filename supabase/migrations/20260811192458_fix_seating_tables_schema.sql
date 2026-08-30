-- seating_tables was created by an earlier migration with columns
-- (name, pos_x, pos_y, sort_order) but the FloorPlanEditor expects
-- (label, x, y, width, height, table_number, rotation).
-- The CREATE TABLE IF NOT EXISTS in the floor-plan migration was a no-op
-- because the table already existed. Add the missing columns and backfill.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seating_tables' AND column_name='label') THEN
    ALTER TABLE seating_tables ADD COLUMN label text NOT NULL DEFAULT 'Table';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seating_tables' AND column_name='x') THEN
    ALTER TABLE seating_tables ADD COLUMN x double precision NOT NULL DEFAULT 200;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seating_tables' AND column_name='y') THEN
    ALTER TABLE seating_tables ADD COLUMN y double precision NOT NULL DEFAULT 200;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seating_tables' AND column_name='width') THEN
    ALTER TABLE seating_tables ADD COLUMN width double precision NOT NULL DEFAULT 120;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seating_tables' AND column_name='height') THEN
    ALTER TABLE seating_tables ADD COLUMN height double precision NOT NULL DEFAULT 120;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seating_tables' AND column_name='rotation') THEN
    ALTER TABLE seating_tables ADD COLUMN rotation double precision NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seating_tables' AND column_name='table_number') THEN
    ALTER TABLE seating_tables ADD COLUMN table_number int NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Backfill: copy name -> label, pos_x -> x, pos_y -> y, sort_order -> table_number
UPDATE seating_tables SET label = name WHERE label = 'Table' AND name <> 'Table';
UPDATE seating_tables SET x = pos_x WHERE x = 200 AND pos_x <> 200;
UPDATE seating_tables SET y = pos_y WHERE y = 200 AND pos_y <> 200;
UPDATE seating_tables SET table_number = sort_order WHERE table_number = 1 AND sort_order <> 1;

-- Set proper dimensions based on shape
UPDATE seating_tables SET width = 120, height = 120 WHERE shape = 'round' AND width = 120 AND height = 120;
UPDATE seating_tables SET width = 180, height = 80 WHERE shape = 'rectangle' AND width = 120;
UPDATE seating_tables SET width = 300, height = 80 WHERE shape = 'head' AND width = 120;
UPDATE seating_tables SET width = 100, height = 60 WHERE shape = 'sweetheart' AND width = 120;
