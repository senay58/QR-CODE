-- Create Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Menu Items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  ingredients text[],
  base_price numeric(10,2) NOT NULL,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Extras table
CREATE TABLE IF NOT EXISTS extras (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Junction Table for Items and Extras
CREATE TABLE IF NOT EXISTS item_extras (
  item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  extra_id uuid REFERENCES extras(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, extra_id)
);

-- Create Staff Calls table (For Call Waiter Feature)
-- Status: 'pending', 'resolved'
CREATE TABLE IF NOT EXISTS staff_calls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at timestamp with time zone
);

-- Create Orders table (Manual entry by staff)
-- Status: 'pending', 'preparing', 'completed', 'cancelled'
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at timestamp with time zone
);

-- Create Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  item_price numeric(10,2) NOT NULL, -- snapshot of price at time of order
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Anonymous users (customers) can read menu data and insert staff calls
CREATE POLICY "Public can read categories" ON categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can read active menu items" ON menu_items FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Public can read extras" ON extras FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can read item_extras" ON item_extras FOR SELECT TO anon, authenticated USING (true);

-- Customers can insert staff calls
CREATE POLICY "Public can insert staff calls" ON staff_calls FOR INSERT TO anon WITH CHECK (status = 'pending');

-- Admins (authenticated users) can do everything
CREATE POLICY "Admins can do everything on categories" ON categories TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can do everything on menu_items" ON menu_items TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can do everything on extras" ON extras TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can do everything on item_extras" ON item_extras TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can do everything on staff_calls" ON staff_calls TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can do everything on orders" ON orders TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can do everything on order_items" ON order_items TO authenticated USING (true) WITH CHECK (true);

-- Setup Realtime triggers for staff_calls to alert the dashboard
alter publication supabase_realtime add table staff_calls;
alter publication supabase_realtime add table orders;
