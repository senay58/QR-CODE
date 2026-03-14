import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
    user: User | null;
    session: Session | null;
    restaurantId: string | null;
    restaurantSlug: string | null;
    role: string | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    restaurantId: null,
    restaurantSlug: null,
    role: null,
    loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            // Step 1: Check staff_profiles (for staff with auth accounts)
            const { data: staffProfile } = await supabase
                .from('staff_profiles')
                .select('restaurant_id, role, restaurants(slug)')
                .eq('id', userId)
                .maybeSingle();

            if (staffProfile?.restaurant_id) {
                setRestaurantId(staffProfile.restaurant_id);
                setRole(staffProfile.role || 'admin');
                setRestaurantSlug((staffProfile.restaurants as any)?.slug || null);
                return;
            }

            // Step 2: Check if user owns a restaurant
            const { data: ownedRestaurant } = await supabase
                .from('restaurants')
                .select('id, slug')
                .eq('owner_id', userId)
                .maybeSingle();

            if (ownedRestaurant?.id) {
                setRestaurantId(ownedRestaurant.id);
                setRole('owner');
                setRestaurantSlug(ownedRestaurant.slug);
                return;
            }

            // Step 3: Check if user is a super admin
            // They can be identified by their email or a separate table
            // For now, default to 'superadmin' role with no restaurantId
            setRole('superadmin');
            setRestaurantId(null);

        } catch (err) {
            console.error('useAuth: Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                fetchProfile(currentUser.id);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                fetchProfile(currentUser.id);
            } else {
                setRestaurantId(null);
                setRestaurantSlug(null);
                setRole(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, restaurantId, restaurantSlug, role, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
