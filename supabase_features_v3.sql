-- ============================================================
-- QR MENU — Features v3
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- 1. Allow a menu item to appear in multiple categories
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS extra_category_ids uuid[] DEFAULT '{}';

-- 2. Allow categories to have a parent (for subcategories)
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES categories(id) ON DELETE SET NULL;

-- 3. Add sort_order to menu_items if missing (fixes drag-drop)
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- 4. Add sort_order to categories if missing
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- 5. The 'source' column on orders now supports 'delivery'
--    No schema change needed — it's already a free text column.
--    Values: 'walkin', 'apartment', 'pos', 'delivery'
--    Delivery orders store the company name in table_number field.

-- Done!
