import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LayoutDashboard, Utensils, Users, Landmark, LogOut, ShieldCheck, Settings, HeartPulse } from 'lucide-react';

const SuperAdminLayout = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/ironplate', end: true },
        { icon: Utensils, label: 'Partners', path: '/ironplate/partners' },
        { icon: Users, label: 'Global Staff', path: '/ironplate/staff' },
        { icon: Landmark, label: 'Finance', path: '/ironplate/finance' },
        { icon: Settings, label: 'System Settings', path: '/ironplate/settings' },
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row">
            {/* Sidebar */}
            <aside className="w-full lg:w-72 bg-card/40 backdrop-blur-xl border-r border-border/50 flex flex-col p-6 z-40 sticky top-0 lg:h-screen">
                <div className="flex items-center gap-3 mb-12 px-2">
                    <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-foreground leading-none">IRON<span className="text-primary">PLATE</span></h1>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Father App Control</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3.5 rounded-[1.2rem] font-bold text-sm transition-all group ${
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                                }`
                            }
                        >
                            <item.icon size={20} className="group-hover:scale-110 transition-transform" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="mt-auto pt-6 space-y-4">
                    <div className="bg-secondary/30 rounded-2xl p-4 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                            <HeartPulse size={16} className="text-primary" />
                            <span className="text-xs font-black uppercase tracking-widest text-foreground">Platform Health</span>
                        </div>
                        <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                            <div className="bg-primary w-[98%] h-full rounded-full" />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-tight">All systems operational</p>
                    </div>
                    
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[1.2rem] text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all font-bold text-sm"
                    >
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 p-6 lg:p-12 overflow-x-hidden">
                <div className="max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default SuperAdminLayout;
