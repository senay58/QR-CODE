import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dtonswnerrwtnduedprl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0b25zd25lcnJ3dG5kdWVkcHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg3MjcsImV4cCI6MjA4Nzg1NDcyN30.CNAAoREneh0MFwsmZIpBthA8m2Yex8ZaonKsBXdWoeo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
    const { data, error } = await supabase.auth.signUp({
        email: 'admin@sandwichhouse.com',
        password: 'SandwichHouse2026!',
    });

    if (error) {
        console.error('Error creating user:', error.message);
    } else {
        console.log('Successfully created initial admin user!');
        console.log('Email:', data?.user?.email);
    }
}

createAdminUser();
