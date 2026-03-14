-- ============================================================
-- IRONPLATE DATA RECOVERY SCRIPT — V7
-- FIXES HIDDEN MENU ITEMS AND FORCES SCHEMA CACHE RELOAD
-- ============================================================

-- Explanation: Your menu items were NOT deleted. They were just hidden. 
-- The new security system hides items that don't belong to a specific restaurant.
-- Since your old items had no restaurant assigned (restaurant_id was NULL), they became invisible.
-- This script safely links all those orphaned items to your active restaurant.

DO $$
DECLARE
    active_rest_id uuid;
BEGIN
    -- 1. Find the active restaurant ID (assuming there's only one main one for now)
    SELECT id INTO active_rest_id FROM restaurants LIMIT 1;
    
    IF active_rest_id IS NOT NULL THEN
        -- 2. Rescue all orphaned menu items
        UPDATE menu_items 
        SET restaurant_id = active_rest_id 
        WHERE restaurant_id IS NULL;
        
        -- 3. Rescue all orphaned categories
        UPDATE categories 
        SET restaurant_id = active_rest_id 
        WHERE restaurant_id IS NULL;
        
        -- 4. Rescue all orphaned orders
        UPDATE orders 
        SET restaurant_id = active_rest_id 
        WHERE restaurant_id IS NULL;

        -- 5. Rescue all orphaned attendance logs
        UPDATE attendance 
        SET restaurant_id = active_rest_id 
        WHERE restaurant_id IS NULL;
    END IF;
END $$;

-- ============================================================
-- MAKE SURE ALL NEW COLUMNS EXIST
-- ============================================================
ALTER TABLE staff ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role text DEFAULT 'waiter';

-- ============================================================
-- THE MOST IMPORTANT PART: FORCE SCHEMA CACHE RELOAD
-- This fixes the "Could not find column in schema cache" errors
-- ============================================================
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- To manually verify, run this:
-- SELECT name, restaurant_id FROM menu_items;
