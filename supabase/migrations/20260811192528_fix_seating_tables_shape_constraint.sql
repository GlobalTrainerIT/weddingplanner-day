-- Drop the old shape constraint that only allowed 'round' and 'rect'
ALTER TABLE seating_tables DROP CONSTRAINT IF EXISTS seating_tables_shape_check;

-- Fix existing data: 'rect' -> 'rectangle' (now possible without constraint)
UPDATE seating_tables SET shape = 'rectangle' WHERE shape = 'rect';

-- Fix Head Table dimensions (was round 120x120, should be 300x80)
UPDATE seating_tables SET width = 300, height = 80 WHERE shape = 'head' AND width = 120;

-- Add the correct constraint matching FloorPlanEditor's shapes
ALTER TABLE seating_tables ADD CONSTRAINT seating_tables_shape_check
  CHECK (shape IN ('round','rectangle','head','sweetheart'));
