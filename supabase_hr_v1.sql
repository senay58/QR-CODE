-- ============================================================
-- IRONPLATE SAFE PATCH — V6 (SAFE TO RUN — NO DATA LOSS)
-- Only ADDS missing columns. Never drops. Never deletes.
-- ============================================================

-- 1. Add restaurant_id to existing tables (safe - idempotent)
ALTER TABLE categories    ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE menu_items    ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE orders        ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE attendance    ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;

-- 2. Add Staff table HR columns (safe - idempotent)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS full_name              text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role                   text DEFAULT 'waiter';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hourly_rate            numeric(12,2) DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS base_salary_per_month  numeric(12,2) DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS working_days_per_week  integer DEFAULT 5;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS working_hours_per_day  integer DEFAULT 14;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_active              boolean DEFAULT true;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS restaurant_id          uuid REFERENCES restaurants(id) ON DELETE CASCADE;

-- 3. Add Attendance HR columns (safe)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS shift_type      text DEFAULT 'full';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_day_off      boolean DEFAULT false;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS overtime_hours  numeric(12,2);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS staff_member_id uuid;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS staff_id        uuid;

-- 4. Add Menu feature columns (safe)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS allowed_global_extras text[] DEFAULT '{}';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS extra_category_ids    text[] DEFAULT '{}';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_fasting            boolean DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description           text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url             text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_active             boolean DEFAULT true;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sort_order            int DEFAULT 0;

-- 5. Add Category columns (safe)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id  uuid REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;

-- 6. Add global_extras restaurant_id (safe)
ALTER TABLE global_extras ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;

-- 7. Create the staff table from scratch if it doesn't exist
CREATE TABLE IF NOT EXISTS staff (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name text NOT NULL DEFAULT '',
    role text NOT NULL DEFAULT 'waiter',
    hourly_rate numeric(12,2) DEFAULT 0,
    base_salary_per_month numeric(12,2) DEFAULT 0,
    working_days_per_week integer DEFAULT 5,
    working_hours_per_day integer DEFAULT 14,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. Update the security function to allow owners
CREATE OR REPLACE FUNCTION check_restaurant_access(target_restaurant_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Super admin bypass
    IF EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
        RETURN true;
    END IF;
    -- Owner bypass
    IF EXISTS (SELECT 1 FROM restaurants WHERE id = target_restaurant_id AND owner_id = auth.uid()) THEN
        RETURN true;
    END IF;
    -- Staff member
    IF EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND restaurant_id = target_restaurant_id) THEN
        RETURN true;
    END IF;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Enable RLS (safe to run multiple times)
ALTER TABLE staff      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 10. Add RLS policies for staff (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff' AND policyname = 'staff_access') THEN
        CREATE POLICY "staff_access" ON staff FOR ALL USING (check_restaurant_access(restaurant_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance' AND policyname = 'attendance_access') THEN
        CREATE POLICY "attendance_access" ON attendance FOR ALL USING (check_restaurant_access(restaurant_id));
    END IF;
    -- Allow public reads on menu & categories
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_items' AND policyname = 'menu_public_read') THEN
        CREATE POLICY "menu_public_read" ON menu_items FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'cat_public_read') THEN
        CREATE POLICY "cat_public_read" ON categories FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'rest_public_read') THEN
        CREATE POLICY "rest_public_read" ON restaurants FOR SELECT USING (true);
    END IF;
END $$;

-- 11. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ============================================================
-- VERIFY YOUR SETUP (run these SELECT statements)
-- ============================================================
-- SELECT id, email FROM auth.users;                              -- Find your user ID
-- SELECT id, name, slug, owner_id FROM restaurants;             -- Check your restaurant
-- SELECT id, role, restaurant_id FROM staff_profiles;           -- Check your profile link
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'staff';   -- Verify staff columns
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'order_items'; -- Verify order_items
