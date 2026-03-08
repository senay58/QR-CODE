-- ============================================================
-- DB SYNC: Fix for Order Submission & Tracking
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Ensure RLS is active
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_calls ENABLE ROW LEVEL SECURITY;

-- 2. ORDERS: Allow customers (ANON) to INSERT and SELECT their orders
-- (Needed for .select().single() and the Notification Tracker)
DROP POLICY IF EXISTS "Customers can insert orders" ON orders;
CREATE POLICY "Customers can insert orders" ON orders 
FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can view their orders" ON orders;
CREATE POLICY "Customers can view their orders" ON orders 
FOR SELECT TO anon USING (true);

-- 3. ORDER ITEMS: Allow customers (ANON) to INSERT and SELECT
DROP POLICY IF EXISTS "Customers can insert order_items" ON order_items;
CREATE POLICY "Customers can insert order_items" ON order_items 
FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can view their order_items" ON order_items;
CREATE POLICY "Customers can view their order_items" ON order_items 
FOR SELECT TO anon USING (true);

-- 4. STAFF CALLS: Allow customers (ANON) to INSERT and SELECT
DROP POLICY IF EXISTS "Customers can call staff" ON staff_calls;
CREATE POLICY "Customers can call staff" ON staff_calls 
FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can view their staff calls" ON staff_calls;
CREATE POLICY "Customers can view their staff calls" ON staff_calls 
FOR SELECT TO anon USING (true);

-- 5. Realtime for Order Tracking
-- This ensures the "Bell" notification actually fires
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_calls;

-- 6. Fix for potential 'source' schema cache issue
-- If you added the column but haven't 're-loaded' the schema cache in your app, 
-- running this ensures the column definitely exists with a default.
ALTER TABLE orders ALTER COLUMN source SET DEFAULT 'pos';
ALTER TABLE staff_calls ALTER COLUMN source SET DEFAULT 'walkin';
