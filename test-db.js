import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('attendance').select('*').limit(1);
    console.log("Data:", data, "Error:", error);
    
    // Attempt an insert to see the exact error
    const res = await supabase.from('attendance').insert([{
        staff_id: 'e86e1afb-01cf-4a49-afc3-9d413df12da3', // junk uuid
        restaurant_id: 'e86e1afb-01cf-4a49-afc3-9d413df12da3'
    }]);
    console.log("Insert Error:", res.error);
}

check();
