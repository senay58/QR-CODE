-- Add sort_order column to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Optionally, initialize it with a sequential number for existing items
-- This is a bit tricky with SQL alone if we want to sort by current order,
-- but the manual rearrangement will fix it.
