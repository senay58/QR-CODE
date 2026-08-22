import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MENU_SECTIONS = [
  {
    title: 'Sandwiches',
    items: [
      { id: 'sand-chicken', name: 'Chicken Sandwich', description: '', price: 530 },
      { id: 'sand-bbq-chicken', name: 'BBQ Chicken Sandwich', description: '', price: 550 },
      { id: 'sand-special-chicken', name: 'Special Chicken Sandwich', description: '', price: 610 },
      { id: 'sand-beef', name: 'Beef Sandwich', description: '', price: 520 },
      { id: 'sand-bbq-beef', name: 'BBQ Beef Sandwich', description: '', price: 540 },
      { id: 'sand-special-beef', name: 'Special Beef Sandwich', description: '', price: 590 },
    ],
  },
  {
    title: 'Wraps',
    items: [
      { id: 'wrap-chicken', name: 'Chicken Wrap', description: '', price: 495 },
      { id: 'wrap-bbq-chicken', name: 'BBQ Chicken Wrap', description: '', price: 510 },
      { id: 'wrap-special-chicken', name: 'Special Chicken Wrap', description: '', price: 610 },
      { id: 'wrap-beef', name: 'Beef Wrap', description: '', price: 490 },
      { id: 'wrap-bbq-beef', name: 'BBQ Beef Wrap', description: '', price: 500 },
      { id: 'wrap-special-beef', name: 'Special Beef Wrap', description: '', price: 590 },
    ],
  },
  {
    title: 'Burgers',
    items: [
      { id: 'burger-beef', name: 'Beef Burger', description: '', price: 430 },
      { id: 'burger-cheese', name: 'Cheese Burger', description: '', price: 460 },
      { id: 'burger-double', name: 'Double Beef Burger', description: '', price: 595 },
      { id: 'burger-special', name: 'Special Burger', description: '', price: 650 },
      { id: 'fries', name: 'French Fries', description: '', price: 260 },
    ],
  },
  {
    title: 'Veggie / Fasting',
    items: [
      { id: 'veg-sandwich', name: 'Veggie Sandwich', description: '', price: 320 },
      { id: 'veg-wrap', name: 'Veggie Wrap', description: '', price: 280 },
      { id: 'tuna-sandwich', name: 'Tuna Sandwich', description: '', price: 500 },
      { id: 'tuna-wrap', name: 'Tuna Wrap', description: '', price: 510 },
      { id: 'pasta-veg', name: 'Pasta With Veggie', description: '', price: 270 },
      { id: 'pasta-tomato', name: 'Pasta With Tomato Sauce', description: '', price: 250 },
      { id: 'rice-veg', name: 'Rice with Veggie', description: '', price: 215 },
      { id: 'sambusa', name: 'Sambusa', description: '', price: 130 },
    ],
  },
  {
    title: 'Hot Drinks',
    items: [
      { id: 'tea', name: 'Tea', description: '', price: 40 },
      { id: 'tea-lemon', name: 'Tea With Lemon', description: '', price: 50 },
      { id: 'tea-spice', name: 'Tea With Coffee / Spice', description: '', price: 60 },
      { id: 'special-tea', name: 'Special Tea', description: '', price: 130 },
      { id: 'ginger-tea', name: 'Ginger Tea With Honey', description: '', price: 80 },
      { id: 'machine-coffee', name: 'Machine Coffee', description: '', price: 60 },
      { id: 'steamed-coffee', name: 'Steamed Coffee', description: '', price: 60 },
      { id: 'espresso', name: 'Espresso', description: '', price: 60 },
      { id: 'macchiato', name: 'Macchiato', description: '', price: 75 },
      { id: 'double-macchiato', name: 'Double Macchiato', description: '', price: 130 },
      { id: 'fasting-macchiato', name: 'Fasting Macchiato', description: '', price: 120 },
      { id: 'milk', name: 'Milk', description: '', price: 20 },
      { id: 'cafe-latte', name: 'Café Latte', description: '', price: 150 },
    ],
  },
];

let sql = `-- Migration script to insert Sandwich House data\n`;
sql += `DO $$\n`;
sql += `DECLARE\n`;
sql += `  v_restaurant_id uuid;\n`;
sql += `  v_category_id uuid;\n`;
sql += `BEGIN\n\n`;

sql += `  -- Get or Create Restaurant\n`;
sql += `  SELECT id INTO v_restaurant_id FROM restaurants WHERE slug = 'sandwich-house' LIMIT 1;\n`;
sql += `  IF v_restaurant_id IS NULL THEN\n`;
sql += `    INSERT INTO restaurants (name, slug, brand_name, primary_color, theme, status)\n`;
sql += `    VALUES ('Sandwich House', 'sandwich-house', 'Sandwich House', '#f97316', 'light', 'active')\n`;
sql += `    RETURNING id INTO v_restaurant_id;\n`;
sql += `  END IF;\n\n`;

for (let i = 0; i < MENU_SECTIONS.length; i++) {
  const section = MENU_SECTIONS[i];
  
  sql += `  -- Category: ${section.title}\n`;
  sql += `  SELECT id INTO v_category_id FROM categories WHERE name = '${section.title.replace(/'/g, "''")}' AND restaurant_id = v_restaurant_id LIMIT 1;\n`;
  sql += `  IF v_category_id IS NULL THEN\n`;
  sql += `    INSERT INTO categories (name, sort_order, restaurant_id)\n`;
  sql += `    VALUES ('${section.title.replace(/'/g, "''")}', ${i}, v_restaurant_id)\n`;
  sql += `    RETURNING id INTO v_category_id;\n`;
  sql += `  END IF;\n\n`;

  for (let j = 0; j < section.items.length; j++) {
    const item = section.items[j];
    
    sql += `  -- Item: ${item.name}\n`;
    sql += `  IF NOT EXISTS (SELECT 1 FROM menu_items WHERE name = '${item.name.replace(/'/g, "''")}' AND category_id = v_category_id) THEN\n`;
    sql += `    INSERT INTO menu_items (name, description, base_price, category_id, restaurant_id, is_active, sort_order, image_url)\n`;
    sql += `    VALUES ('${item.name.replace(/'/g, "''")}', '${item.description.replace(/'/g, "''")}', ${item.price}, v_category_id, v_restaurant_id, true, ${j}, 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80');\n`;
    sql += `  END IF;\n\n`;
  }
}

sql += `END\n`;
sql += `$$;\n`;

const outPath = path.resolve(__dirname, 'sandwich_house_migration.sql');
fs.writeFileSync(outPath, sql);
console.log('Migration SQL generated at:', outPath);
