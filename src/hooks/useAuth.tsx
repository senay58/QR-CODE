import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Fana Kitchen is a SINGLE-RESTAURANT system.
// restaurantId is fetched once at startup from the DB — completely independent
// of which staff member is logged in. No multi-tenant lookup needed.
// ─────────────────────────────────────────────────────────────────────────────

type AuthContextType = {
    user: User | null;
    session: Session | null;
    restaurantId: string | null;
    restaurantSlug: string | null;
    role: string | null;
    branding: {
        logo_url: string | null;
        primary_color: string;
        secondary_color: string;
        theme: 'light' | 'dark';
    } | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    restaurantId: null,
    restaurantSlug: null,
    role: null,
    branding: null,
    loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [branding, setBranding] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // ── 1. Fetch the single Fana Kitchen restaurant record ──
        // Ordered by name so "Fana Kitchen" sorts naturally; change to created_at
        // if needed. No user filtering — there's only one restaurant.
        supabase
            .from('restaurants')
            .select('id, slug, name, brand_name, logo_url, primary_color, secondary_color, theme')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
                if (!mounted) return;
                if (data) {
                    setRestaurantId(data.id);
                    setRestaurantSlug(data.slug);
                    setBranding({
                        logo_url: data.logo_url,
                        primary_color: data.primary_color || '#0F3D2E',
                        secondary_color: data.secondary_color || '#C49A3A',
                        theme: data.theme || 'light',
                    });
                }
                setLoading(false);
            });

        // ── 2. Track auth state (for login/logout only) ──
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) setRole('admin');
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            setSession(session);
            setUser(session?.user ?? null);
            setRole(session?.user ? 'admin' : null);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, restaurantId, restaurantSlug, role, branding, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
