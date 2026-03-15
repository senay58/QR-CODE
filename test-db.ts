import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const res = await supabase.from('attendance').insert([{
        staff_id: 'e86e1afb-01cf-4a49-afc3-9d413df12da3', 
        restaurant_id: 'e86e1afb-01cf-4a49-afc3-9d413df12da3'
    }]);
    console.log("Insert staff_id Error:", res.error?.message || res.error);

    const res2 = await supabase.from('attendance').insert([{
        staff_member_id: 'e86e1afb-01cf-4a49-afc3-9d413df12da3', 
        restaurant_id: 'e86e1afb-01cf-4a49-afc3-9d413df12da3'
    }]);
    console.log("Insert staff_member_id Error:", res2.error?.message || res2.error);
}

check();
