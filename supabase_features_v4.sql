-- ============================================================
-- QR MENU — Features v4
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- 1. Add fasting toggle to menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS is_fasting boolean DEFAULT false;

-- 2. Create global_extras table
CREATE TABLE IF NOT EXISTS global_extras (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    price numeric(10,2) NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Add allowed_global_extras array to menu_items
-- This stores the IDs of global_extras that this specific item allows.
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS allowed_global_extras uuid[] DEFAULT '{}';

-- 4. Set RLS policies for global_extras
ALTER TABLE global_extras ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'global_extras' AND policyname = 'Public can view global_extras'
    ) THEN
        CREATE POLICY "Public can view global_extras" ON global_extras FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'global_extras' AND policyname = 'Authenticated users can manage global_extras'
    ) THEN
        CREATE POLICY "Authenticated users can manage global_extras" ON global_extras FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
