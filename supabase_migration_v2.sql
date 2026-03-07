-- ============================================================
-- MIGRATION: Update schema for extras with direct item link
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Drop the old junction table (no longer needed)
DROP TABLE IF EXISTS item_extras;

-- 2. Drop the old extras table and recreate with menu_item_id
DROP TABLE IF EXISTS extras;

CREATE TABLE extras (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Add missing columns to orders (source + extras_snapshot on order_items)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'pos';

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS extras_snapshot text;

-- 4. Add missing column to staff_calls (source)
ALTER TABLE staff_calls
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'walkin';

-- 5. Make sure categories does NOT require a slug (it's optional)
-- (slug col may or may not exist depending on your DB version)
-- Only run the next line if you get "column slug does not exist" errors:
-- ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug text;

-- 6. Enable RLS + policies for the new extras table
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Public can read extras" ON extras;
DROP POLICY IF EXISTS "Admins can do everything on extras" ON extras;

-- Recreate
CREATE POLICY "Public can read extras" ON extras FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can do everything on extras" ON extras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Also allow anon customers to insert orders (walk-in cart ordering — optional)
DROP POLICY IF EXISTS "Customers can insert orders" ON orders;
CREATE POLICY "Customers can insert orders" ON orders FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can insert order_items" ON order_items;
CREATE POLICY "Customers can insert order_items" ON order_items FOR INSERT TO anon WITH CHECK (true);

-- 8. Add realtime for extras
ALTER PUBLICATION supabase_realtime ADD TABLE extras;
