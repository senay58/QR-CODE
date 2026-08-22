import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');
console.log('Reading env from:', envPath);
const envFile = fs.readFileSync(envPath, 'utf-8');
console.log('File size:', envFile.length);

const envConfig = {};
envFile.split('\n').forEach(rawLine => {
  const line = rawLine.replace('\r', '');
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envConfig[match[1].trim()] = match[2].trim();
  }
});
const supabaseUrl = envConfig['VITE_SUPABASE_URL'];
const supabaseKey = envConfig['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local", "Keys found:", Object.keys(envConfig));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function migrate() {
  console.log('Starting migration for Sandwich House...');

  // 1. Create Sandwich House restaurant if not exists
  let { data: restaurant, error: rErr } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', 'sandwich-house')
    .single();

  let restaurantId;

  if (rErr || !restaurant) {
    console.log('Creating new restaurant: Sandwich House...');
    const { data: newRest, error: insertRErr } = await supabase
      .from('restaurants')
      .insert([{ 
        name: 'Sandwich House', 
        slug: 'sandwich-house', 
        brand_name: 'Sandwich House',
        primary_color: '#f97316', 
        theme: 'light' 
      }])
      .select()
      .single();

    if (insertRErr) {
        console.error('Error creating restaurant:', insertRErr.message);
        process.exit(1);
    }
    restaurantId = newRest.id;
  } else {
    restaurantId = restaurant.id;
    console.log(`Using existing restaurant id: ${restaurantId}`);
  }

  // 2. Iterate and insert categories and items
  for (let i = 0; i < MENU_SECTIONS.length; i++) {
    const section = MENU_SECTIONS[i];
    
    // Check if category exists
    let { data: cat, error: catErr } = await supabase
      .from('categories')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('name', section.title)
      .single();

    let categoryId;
    if (catErr || !cat) {
      console.log(`Creating category: ${section.title}`);
      const { data: newCat, error: insertCErr } = await supabase
        .from('categories')
        .insert([{ 
          restaurant_id: restaurantId, 
          name: section.title,
          sort_order: i 
        }])
        .select()
        .single();
      
      if (insertCErr) {
        console.error('Error creating category:', insertCErr);
        continue;
      }
      categoryId = newCat.id;
    } else {
      categoryId = cat.id;
    }

    // Insert items
    for (let j = 0; j < section.items.length; j++) {
      const item = section.items[j];
      
      // Check if item exists
      const { data: existingItem } = await supabase
        .from('items')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('category_id', categoryId)
        .eq('name', item.name)
        .single();

      if (!existingItem) {
        console.log(`- Inserting item: ${item.name}`);
        const { error: insertIErr } = await supabase
          .from('items')
          .insert([{
            restaurant_id: restaurantId,
            category_id: categoryId,
            name: item.name,
            description: item.description,
            price: item.price,
            image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            is_available: true
          }]);
        
        if (insertIErr) {
            console.error(`Error inserting item ${item.name}:`, insertIErr.message);
        }
      } else {
        console.log(`- Item ${item.name} already exists. Skipping.`);
      }
    }
  }

  console.log('Migration completed successfully!');
}

migrate();
