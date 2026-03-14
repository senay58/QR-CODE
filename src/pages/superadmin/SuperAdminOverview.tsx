import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LayoutDashboard, Users, Utensils, TrendingUp, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

const SuperAdminOverview = () => {
    const [stats, setStats] = useState({
        totalRestaurants: 0,
        totalRevenue: 0,
        activeStaff: 0,
        totalOrders: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGlobalStats = async () => {
            setLoading(true);
            const [restRes, ordersRes, staffRes] = await Promise.all([
                supabase.from('restaurants').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('total_amount'),
                supabase.from('staff_profiles').select('*', { count: 'exact', head: true })
            ]);

            const revenue = ordersRes.data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

            setStats({
                totalRestaurants: restRes.count || 0,
                totalRevenue: revenue,
                activeStaff: staffRes.count || 0,
                totalOrders: ordersRes.data?.length || 0
            });
            setLoading(false);
        };
        fetchGlobalStats();
    }, []);

    const statCards = [
        { label: 'Total Restaurants', value: stats.totalRestaurants, icon: Utensils, color: 'text-blue-600', bg: 'bg-blue-500/10' },
        { label: 'Total Revenue', value: `ETB ${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-500/10' },
        { label: 'Active Staff', value: stats.activeStaff, icon: Users, color: 'text-purple-600', bg: 'bg-purple-500/10' },
        { label: 'Platform Orders', value: stats.totalOrders, icon: LayoutDashboard, color: 'text-orange-600', bg: 'bg-orange-500/10' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">Ironplate <span className="text-primary not-italic">Platform Overview</span></h1>
                <p className="text-muted-foreground text-sm font-medium mt-1 uppercase tracking-widest">Master Control & Global Analytics</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, i) => (
                    <div key={i} className="bg-card/40 backdrop-blur-xl border border-border/50 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon size={24} />
                            </div>
                            {i % 2 === 0 ? <ArrowUpRight className="text-green-500" size={20} /> : <ArrowDownRight className="text-red-500" size={20} />}
                        </div>
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-black text-foreground tabular-nums tracking-tighter">{loading ? '...' : stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity or Chart Placeholder */}
                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Activity className="text-primary" size={22} /> System Status
                    </h3>
                    <div className="space-y-6">
                        {[
                            { name: 'Database Latency', status: 'Healthy', val: '42ms', color: 'bg-green-500' },
                            { name: 'Realtime Subscriptions', status: 'Active', val: '1.2k', color: 'bg-blue-500' },
                            { name: 'Storage Capacity', status: 'Optimal', val: '12%', color: 'bg-primary' }
                        ].map((s, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${s.color} animate-pulse`} />
                                    <span className="text-sm font-bold text-foreground">{s.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-black uppercase text-muted-foreground">{s.status}</span>
                                    <span className="text-sm font-mono font-bold bg-secondary px-2 py-1 rounded-lg">{s.val}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-primary to-primary-foreground/20 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-primary/20">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Expand the Empire</h3>
                        <p className="text-white/80 text-sm leading-relaxed mb-6 font-medium">Ready to onboard a new partner? Ironplate is built for scale. Add cafes, restaurants, or bars in seconds.</p>
                        <button className="bg-white text-primary px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/90 transition-all active:scale-95 shadow-lg">
                            Register New Restaurant
                        </button>
                    </div>
                    <Utensils className="absolute -bottom-10 -right-10 text-white/10 w-64 h-64 rotate-12" />
                </div>
            </div>
        </div>
    );
};

export default SuperAdminOverview;
