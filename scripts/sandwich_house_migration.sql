-- Migration script to insert Sandwich House data
DO $$
DECLARE
  v_restaurant_id uuid;
  v_category_id uuid;
BEGIN

  -- Get or Create Restaurant
  SELECT id INTO v_restaurant_id FROM restaurants WHERE slug = 'sandwich-house' LIMIT 1;
  IF v_restaurant_id IS NULL THEN
    INSERT INTO restaurants (name, slug, brand_name, primary_color, theme, status)
    VALUES ('Sandwich House', 'sandwich-house', 'Sandwich House', '#f97316', 'light', 'active')
    RETURNING id INTO v_restaurant_id;
  END IF;

  -- Category: Sandwiches
  SELECT id INTO v_category_id FROM categories WHERE name = 'Sandwiches' AND restaurant_id = v_restaurant_id LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO categories (name, sort_order, restaurant_id)
    VALUES ('Sandwiches', 0, v_restaurant_id)
    RETURNING id INTO v_category_id;
  END IF;

  -- Item: Chicken Sandwich
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Chicken Sandwich' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Chicken Sandwich', '', 530, v_category_id, v_restaurant_id, true, 0, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: BBQ Chicken Sandwich
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'BBQ Chicken Sandwich' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('BBQ Chicken Sandwich', '', 550, v_category_id, v_restaurant_id, true, 1, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Special Chicken Sandwich
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Special Chicken Sandwich' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Special Chicken Sandwich', '', 610, v_category_id, v_restaurant_id, true, 2, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Beef Sandwich
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Beef Sandwich' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Beef Sandwich', '', 520, v_category_id, v_restaurant_id, true, 3, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: BBQ Beef Sandwich
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'BBQ Beef Sandwich' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('BBQ Beef Sandwich', '', 540, v_category_id, v_restaurant_id, true, 4, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Special Beef Sandwich
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Special Beef Sandwich' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Special Beef Sandwich', '', 590, v_category_id, v_restaurant_id, true, 5, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Category: Wraps
  SELECT id INTO v_category_id FROM categories WHERE name = 'Wraps' AND restaurant_id = v_restaurant_id LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO categories (name, sort_order, restaurant_id)
    VALUES ('Wraps', 1, v_restaurant_id)
    RETURNING id INTO v_category_id;
  END IF;

  -- Item: Chicken Wrap
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Chicken Wrap' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Chicken Wrap', '', 495, v_category_id, v_restaurant_id, true, 0, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: BBQ Chicken Wrap
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'BBQ Chicken Wrap' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('BBQ Chicken Wrap', '', 510, v_category_id, v_restaurant_id, true, 1, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Special Chicken Wrap
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Special Chicken Wrap' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Special Chicken Wrap', '', 610, v_category_id, v_restaurant_id, true, 2, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Beef Wrap
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Beef Wrap' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Beef Wrap', '', 490, v_category_id, v_restaurant_id, true, 3, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: BBQ Beef Wrap
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'BBQ Beef Wrap' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('BBQ Beef Wrap', '', 500, v_category_id, v_restaurant_id, true, 4, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Special Beef Wrap
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Special Beef Wrap' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Special Beef Wrap', '', 590, v_category_id, v_restaurant_id, true, 5, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Category: Burgers
  SELECT id INTO v_category_id FROM categories WHERE name = 'Burgers' AND restaurant_id = v_restaurant_id LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO categories (name, sort_order, restaurant_id)
    VALUES ('Burgers', 2, v_restaurant_id)
    RETURNING id INTO v_category_id;
  END IF;

  -- Item: Beef Burger
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Beef Burger' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Beef Burger', '', 430, v_category_id, v_restaurant_id, true, 0, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Cheese Burger
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Cheese Burger' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Cheese Burger', '', 460, v_category_id, v_restaurant_id, true, 1, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Double Beef Burger
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Double Beef Burger' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Double Beef Burger', '', 595, v_category_id, v_restaurant_id, true, 2, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Special Burger
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Special Burger' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Special Burger', '', 650, v_category_id, v_restaurant_id, true, 3, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: French Fries
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'French Fries' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('French Fries', '', 260, v_category_id, v_restaurant_id, true, 4, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Category: Veggie / Fasting
  SELECT id INTO v_category_id FROM categories WHERE name = 'Veggie / Fasting' AND restaurant_id = v_restaurant_id LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO categories (name, sort_order, restaurant_id)
    VALUES ('Veggie / Fasting', 3, v_restaurant_id)
    RETURNING id INTO v_category_id;
  END IF;

  -- Item: Veggie Sandwich
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Veggie Sandwich' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Veggie Sandwich', '', 320, v_category_id, v_restaurant_id, true, 0, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Veggie Wrap
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Veggie Wrap' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Veggie Wrap', '', 280, v_category_id, v_restaurant_id, true, 1, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Tuna Sandwich
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Tuna Sandwich' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Tuna Sandwich', '', 500, v_category_id, v_restaurant_id, true, 2, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Tuna Wrap
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Tuna Wrap' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Tuna Wrap', '', 510, v_category_id, v_restaurant_id, true, 3, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Pasta With Veggie
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Pasta With Veggie' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Pasta With Veggie', '', 270, v_category_id, v_restaurant_id, true, 4, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Pasta With Tomato Sauce
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Pasta With Tomato Sauce' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Pasta With Tomato Sauce', '', 250, v_category_id, v_restaurant_id, true, 5, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Rice with Veggie
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Rice with Veggie' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Rice with Veggie', '', 215, v_category_id, v_restaurant_id, true, 6, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Sambusa
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Sambusa' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Sambusa', '', 130, v_category_id, v_restaurant_id, true, 7, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Category: Hot Drinks
  SELECT id INTO v_category_id FROM categories WHERE name = 'Hot Drinks' AND restaurant_id = v_restaurant_id LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO categories (name, sort_order, restaurant_id)
    VALUES ('Hot Drinks', 4, v_restaurant_id)
    RETURNING id INTO v_category_id;
  END IF;

  -- Item: Tea
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Tea' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Tea', '', 40, v_category_id, v_restaurant_id, true, 0, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Tea With Lemon
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Tea With Lemon' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Tea With Lemon', '', 50, v_category_id, v_restaurant_id, true, 1, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Tea With Coffee / Spice
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Tea With Coffee / Spice' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Tea With Coffee / Spice', '', 60, v_category_id, v_restaurant_id, true, 2, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Special Tea
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Special Tea' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Special Tea', '', 130, v_category_id, v_restaurant_id, true, 3, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Ginger Tea With Honey
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Ginger Tea With Honey' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Ginger Tea With Honey', '', 80, v_category_id, v_restaurant_id, true, 4, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Machine Coffee
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Machine Coffee' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Machine Coffee', '', 60, v_category_id, v_restaurant_id, true, 5, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Steamed Coffee
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Steamed Coffee' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Steamed Coffee', '', 60, v_category_id, v_restaurant_id, true, 6, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Espresso
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Espresso' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Espresso', '', 60, v_category_id, v_restaurant_id, true, 7, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Macchiato
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Macchiato' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Macchiato', '', 75, v_category_id, v_restaurant_id, true, 8, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Double Macchiato
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Double Macchiato' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Double Macchiato', '', 130, v_category_id, v_restaurant_id, true, 9, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Fasting Macchiato
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Fasting Macchiato' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Fasting Macchiato', '', 120, v_category_id, v_restaurant_id, true, 10, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Milk
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Milk' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Milk', '', 20, v_category_id, v_restaurant_id, true, 11, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

  -- Item: Café Latte
  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Café Latte' AND category_id = v_category_id) THEN
    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)
    VALUES ('Café Latte', '', 150, v_category_id, v_restaurant_id, true, 12, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');
  END IF;

END
$$;
