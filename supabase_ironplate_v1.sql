-- ============================================================
-- IRONPLATE SAAS PLATFORM — SCHEMA V1 (HARDENED)
-- Focus: Strict Tenant Isolation (Security) & High Performance (Speed)
-- ============================================================

-- 1. Create Restaurants Table (Silos)
CREATE TABLE IF NOT EXISTS restaurants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    logo_url text,
    owner_id uuid REFERENCES auth.users(id),
    status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optimize restaurant lookups by slug (Fast URL routing)
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);

-- 2. Create Staff Profiles (The "Who is Where" Access Control)
CREATE TABLE IF NOT EXISTS staff_profiles (
    id uuid REFERENCES auth.users(id) PRIMARY KEY,
    restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    role text DEFAULT 'staff' CHECK (role IN ('super_admin', 'owner', 'manager', 'waiter', 'kitchen', 'staff')),
    salary_per_month numeric(12,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast auth checks (Security & Speed)
CREATE INDEX IF NOT EXISTS idx_staff_profiles_restaurant ON staff_profiles(restaurant_id);

-- 3. Attendance Tracking (HR Module)
CREATE TABLE IF NOT EXISTS attendance (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
    staff_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
    check_in timestamp with time zone DEFAULT timezone('utc'::text, now()),
    check_out timestamp with time zone,
    notes text
);

-- Performance Index for attendance reports
CREATE INDEX IF NOT EXISTS idx_attendance_restaurant_date ON attendance(restaurant_id, check_in DESC);

-- 4. Payroll Management
CREATE TABLE IF NOT EXISTS payroll (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
    staff_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
    period_label text NOT NULL, -- e.g. "March 2026"
    amount_paid numeric(12,2) NOT NULL,
    paid_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    status text DEFAULT 'paid'
);

-- 5. Multi-tenant Hardening for Existing Tables
-- Categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON categories(restaurant_id);

-- Menu Items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id, category_id);

-- Orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders(restaurant_id, created_at DESC);

-- Global Extras
ALTER TABLE global_extras ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_global_extras_restaurant ON global_extras(restaurant_id);

-- 6. STRICT ROW LEVEL SECURITY (The Isolation Layer)

-- Enable RLS on ALL tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

-- REUSABLE SECURITY FUNCTION
-- Returns true if the current user belongs to the specified restaurant or is a super_admin
CREATE OR REPLACE FUNCTION check_restaurant_access(target_restaurant_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM staff_profiles 
        WHERE id = auth.uid() 
        AND (restaurant_id = target_restaurant_id OR role = 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- APPLICATION OF POLICIES
-- Example: STAFF can only see/edit their own restaurant's data
CREATE POLICY "Strict Tenant Isolation" ON categories
    FOR ALL USING (check_restaurant_access(restaurant_id));

CREATE POLICY "Strict Tenant Isolation" ON menu_items
    FOR ALL USING (check_restaurant_access(restaurant_id));

CREATE POLICY "Strict Tenant Isolation" ON orders
    FOR ALL USING (check_restaurant_access(restaurant_id));

CREATE POLICY "Strict Tenant Isolation" ON global_extras
    FOR ALL USING (check_restaurant_access(restaurant_id));

-- PUBLIC ACCESS POLICY (For customers viewing the menu by slug)
CREATE POLICY "Public Menu View" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Public Category View" ON categories FOR SELECT USING (true);

-- 7. MIGRATION BOOTSTRAP (For Sandwich House)
-- Run this AFTER creating your Super Admin user in Supabase Auth
/*
INSERT INTO restaurants (name, slug, status) 
VALUES ('Sandwich House', 'sandwich-house', 'active') 
RETURNING id;

-- Then assign your user ID to this restaurant in staff_profiles as 'owner'
*/
