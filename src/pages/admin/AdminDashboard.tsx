import { useState, useEffect } from 'react';
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, UtensilsCrossed, QrCode, Settings, FileText, Menu, X as CloseIcon, Flame } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ThemeToggle } from '../../components/ThemeToggle';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) navigate('/admin/login');
    };

    const navItems = [
        { to: "/admin", icon: LayoutDashboard, label: "Overview" },
        { to: "/admin/pos", icon: UtensilsCrossed, label: "POS" },
        { to: "/admin/kitchen", icon: Flame, label: "Kitchen" },
        { to: "/admin/menu", icon: UtensilsCrossed, label: "Menu Editor" },
        { to: "/admin/qr", icon: QrCode, label: "QR Codes" },
        { to: "/admin/reports", icon: FileText, label: "Reports" },
        { to: "/admin/settings", icon: Settings, label: "Settings" },
    ];

    const navClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold ${isActive
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        } ${isCollapsed ? 'justify-center px-0 h-12 w-12 mx-auto' : ''}`;

    return (
        <div className="flex h-screen bg-background overflow-hidden font-sans text-foreground">
            {/* Mobile Header */}
            <div className="lg:hidden print:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 px-4 flex items-center justify-between">
                <h1 className="text-xl font-black tracking-tighter uppercase">
                    S<span className="text-primary">H</span>
                </h1>
                <div className="flex items-center gap-2">
                    <ThemeToggle className="bg-transparent hover:bg-secondary/20 h-9 w-9" />
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 bg-secondary rounded-lg text-foreground"
                    >
                        {isMobileMenuOpen ? <CloseIcon size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Sidebar (Desktop) */}
            <aside
                className={`hidden lg:flex print:hidden flex-col bg-card border-r border-border transition-all duration-500 ease-in-out relative z-40 ${isCollapsed ? 'w-20' : 'w-64'}`}
            >
                <div className="p-6">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="flex items-center gap-3 group outline-none"
                    >
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                            <span className="text-white font-black text-sm">SH</span>
                        </div>
                        {!isCollapsed && (
                            <h1 className="text-xl font-black tracking-tighter text-foreground uppercase group-hover:text-primary transition-colors">
                                SANDWICH<span className="text-primary">HOUSE</span>
                            </h1>
                        )}
                    </button>
                </div>

                <nav className="flex-1 px-3 space-y-2 overflow-y-auto hide-scrollbar">
                    {navItems.map((item) => (
                        <NavLink key={item.to} to={item.to} end={item.to === "/admin"} className={navClass}>
                            <item.icon size={20} />
                            {!isCollapsed && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-border flex flex-col gap-2">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/80 transition-all font-bold text-muted-foreground ${isCollapsed ? 'justify-center px-0' : ''}`}>
                        <ThemeToggle className="p-0 bg-transparent hover:bg-transparent h-5 w-5" />
                        {!isCollapsed && <span className="text-sm">Night Mode</span>}
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-red-500 transition-all font-bold w-full rounded-xl hover:bg-red-500/10 ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <LogOut size={20} />
                        {!isCollapsed && <span>Logout</span>}
                    </button>
                </div>

            </aside>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-[55]"
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    <div
                        className="absolute right-0 top-0 bottom-0 w-64 bg-card border-l border-border p-6 shadow-2xl animate-in slide-in-from-right duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-10">
                            <h1 className="text-xl font-black tracking-tighter">
                                SANDWICH<span className="text-primary">HOUSE</span>
                            </h1>
                            <button onClick={() => setIsMobileMenuOpen(false)}>
                                <CloseIcon size={24} />
                            </button>
                        </div>
                        <nav className="space-y-4">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === "/admin"}
                                    className={({ isActive }) =>
                                        `flex items-center gap-4 p-3 rounded-xl font-bold transition-all ${isActive ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground'}`
                                    }
                                >
                                    <item.icon size={22} />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-4 p-3 text-red-500 font-bold mt-10 w-full"
                        >
                            <LogOut size={22} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 pt-20 lg:pt-8 transition-all duration-300 bg-background/40">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
