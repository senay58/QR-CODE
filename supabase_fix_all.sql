-- ============================================================
-- PROJECT FIX: Run this in Supabase SQL Editor
-- This script fixes missing columns and sets up image storage
-- ============================================================

-- 1. Fix 'orders' table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source text DEFAULT 'pos';

-- 2. Fix 'extras' table (Link directly to menu items)
ALTER TABLE extras ADD COLUMN IF NOT EXISTS menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE;

-- 3. Fix 'order_items' table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS extras_snapshot text;

-- 4. Fix 'staff_calls' table
ALTER TABLE staff_calls ADD COLUMN IF NOT EXISTS source text DEFAULT 'walkin';
ALTER TABLE staff_calls ADD COLUMN IF NOT EXISTS cart_snapshot text;

-- 5. Fix 'menu_items' table
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 6. Add staff tracking to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_name text;

-- 7. Create staff table for waiter registration
CREATE TABLE IF NOT EXISTS staff (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    role text DEFAULT 'waiter',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 4. Create storage bucket for menu images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('menu-images', 'menu-images', true) 
ON CONFLICT (id) DO NOTHING;

-- 5. Storage Policies for 'menu-images'
-- Allow public reading of images
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'menu-images');

-- Allow authenticated admins to manage images
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
CREATE POLICY "Admin Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'menu-images');

-- 6. Grant usage to public for reading images if needed
GRANT ALL ON TABLE storage.objects TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE storage.buckets TO postgres, service_role, authenticated, anon;
