-- ============================================================
-- IRONPLATE SAAS PLATFORM — SCHEMA V2 (SaaS Extension)
-- Focus: Plans, Subscriptions, and Custom Branding
-- ============================================================

-- 1. Create Plans Table
CREATE TABLE IF NOT EXISTS plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE, -- e.g. 'Basic', 'Pro', 'Enterprise'
    price numeric(12,2) NOT NULL DEFAULT 0,
    features jsonb DEFAULT '{}', -- e.g. {"max_items": 100, "reports": true}
    billing_cycle text DEFAULT 'monthly', -- 'monthly', 'yearly'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed basic plans
INSERT INTO plans (name, price, features) VALUES 
('Free Trial', 0, '{"max_items": 20, "reports": false}'),
('Standard', 500, '{"max_items": 100, "reports": true}'),
('Premium', 1200, '{"max_items": null, "reports": true}')
ON CONFLICT (name) DO NOTHING;

-- 2. Enhance Restaurants Table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS brand_name text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#10b981'; -- Default emerald
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#064e3b'; -- Default dark green
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark'));
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES plans(id);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS trial_start_date timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS trial_end_date timestamp with time zone DEFAULT (timezone('utc'::text, now()) + interval '14 days');
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_unpaid boolean DEFAULT false;

-- 3. Revenue Tracking View (Helper for Super Admin)
CREATE OR REPLACE VIEW global_revenue AS
SELECT 
    r.id as restaurant_id,
    r.name as restaurant_name,
    COALESCE(SUM(o.total_amount), 0) as total_revenue,
    COUNT(o.id) as total_orders
FROM restaurants r
LEFT JOIN orders o ON r.id = o.restaurant_id AND o.status = 'completed'
GROUP BY r.id, r.name;

-- 4. Secure the new components
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Super Admin can see and manage plans
CREATE POLICY "Super Admin Manage Plans" ON plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM staff_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Everyone can view plans (for pricing page)
CREATE POLICY "Public View Plans" ON plans FOR SELECT USING (true);
