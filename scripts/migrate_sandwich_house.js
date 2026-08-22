const { createClient } = require('@supabase/supabase-js');

// Config - Replace these with .env values or pass as arguments
const SUPABASE_URL = 'https://dtonswnerrwtnduedprl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0b25zd25lcnJ3dG5kdWVkcHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg3MjcsImV4cCI6MjA4Nzg1NDcyN30.CNAAoREneh0MFwsmZIpBthA8m2Yex8ZaonKsBXdWoeo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const RESTAURANT_SLUG = 'sandwich-house';
const RESTAURANT_NAME = 'Sandwich House';

const menuData = [
  {
    title: 'Specialty Sandwiches',
    items: [
      {
        name: 'The Mega Club',
        description: 'Triple decker with turkey, ham, bacon, cheddar, lettuce, tomato, and mayo.',
        price: 85,
        image_url: 'https://images.unsplash.com/photo-1524391148285-4e3011a43f82?w=800'
      },
      {
        name: 'Classic Reuben',
        description: 'Corned beef, sauerkraut, Swiss cheese, and Russian dressing on rye.',
        price: 75,
        image_url: 'https://images.unsplash.com/photo-1553909489-cd47e0907d3f?w=800'
      },
      {
        name: 'Philly Steak',
        description: 'Thinly sliced beef, grilled onions, peppers, and melted cheese.',
        price: 90,
        image_url: 'https://images.unsplash.com/photo-1550507992-eb63ffee0847?w=800'
      }
    ]
  },
  {
    title: 'Classic Subs',
    items: [
      {
        name: 'Italian Stallion',
        description: 'Salami, pepperoni, ham, provolone, lettuce, onion, and vinaigrette.',
        price: 80,
        image_url: 'https://images.unsplash.com/photo-1512152272829-e3139592d56f?w=800'
      },
      {
        name: 'Turkey Provolone',
        description: 'Smoked turkey, sharp provolone, lettuce, tomato, and mayo.',
        price: 70,
        image_url: 'https://images.unsplash.com/photo-1550507992-eb63ffee0847?w=800'
      }
    ]
  },
  {
    title: 'Sides & Drinks',
    items: [
      {
        name: 'Seasoned Fries',
        description: 'Crispy golden fries with our signature salt blend.',
        price: 25,
        image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800'
      },
      {
        name: 'Fresh Lemonade',
        description: 'Hand-squeezed daily with organic lemons.',
        price: 15,
        image_url: 'https://images.unsplash.com/photo-1523472721958-978152f4d69b?w=800'
      }
    ]
  }
];

async function migrate() {
    console.log('--- Starting Migration for Sandwich House ---');

    // 1. Get or Create Restaurant
    let { data: rest, error: restErr } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', RESTAURANT_SLUG)
        .maybeSingle();

    if (restErr) {
        console.error('Error fetching restaurant:', restErr);
        return;
    }

    let restaurantId = rest?.id;

    if (!restaurantId) {
        console.log(`Creating restaurant: ${RESTAURANT_NAME}...`);
        const { data: newRest, error: createErr } = await supabase
            .from('restaurants')
            .insert([{ name: RESTAURANT_NAME, slug: RESTAURANT_SLUG, status: 'active' }])
            .select()
            .single();

        if (createErr) {
            console.error('Error creating restaurant:', createErr);
            return;
        }
        restaurantId = newRest.id;
        console.log(`Created restaurant with ID: ${restaurantId}`);
    } else {
        console.log(`Found existing restaurant with ID: ${restaurantId}`);
    }

    // 2. Clear existing categories and items for this restaurant to avoid duplicates (optional, but safer for re-runs)
    // console.log('Clearing existing data for a fresh start...');
    // await supabase.from('menu_items').delete().eq('restaurant_id', restaurantId);
    // await supabase.from('categories').delete().eq('restaurant_id', restaurantId);

    // 3. Migrate Menu Data
    for (const section of menuData) {
        console.log(`Migrating Category: ${section.title}...`);
        
        // Create Category
        const { data: cat, error: catErr } = await supabase
            .from('categories')
            .insert([{ 
                name: section.title, 
                restaurant_id: restaurantId,
                sort_order: menuData.indexOf(section)
            }])
            .select()
            .single();

        if (catErr) {
            console.error(`Error creating category ${section.title}:`, catErr);
            continue;
        }

        const categoryId = cat.id;

        // Create Items
        for (const item of section.items) {
            console.log(`  Adding Item: ${item.name}...`);
            const { error: itemErr } = await supabase
                .from('menu_items')
                .insert([{
                    name: item.name,
                    description: item.description,
                    base_price: item.price,
                    image_url: item.image_url,
                    category_id: categoryId,
                    restaurant_id: restaurantId,
                    is_active: true,
                    sort_order: section.items.indexOf(item)
                }]);

            if (itemErr) {
                console.error(`  Error adding item ${item.name}:`, itemErr);
            }
        }
    }

    console.log('--- Migration Complete ---');
}

migrate().catch(console.error);
