import { useState, useEffect } from 'react';
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, UtensilsCrossed, QrCode, Settings, FileText, Menu, X as CloseIcon, Flame, UserCheck, Banknote, CheckCircle, Shield, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ThemeToggle } from '../../components/ThemeToggle';

const AdminDashboard = () => {
    const { restaurantId } = useAuth();
    const [restaurant, setRestaurant] = useState<any>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Admin Gate State
    const [isAdminVerified, setIsAdminVerified] = useState(false);
    const [showAdminGate, setShowAdminGate] = useState(false);
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [gateError, setGateError] = useState('');

    useEffect(() => {
        if (restaurantId) {
            supabase.from('restaurants').select('name').eq('id', restaurantId).single()
                .then(({ data }) => setRestaurant(data));
        }
    }, [restaurantId]);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    // Check if we are already on an admin-only route upon initial load to handle direct visits
    useEffect(() => {
        const adminPaths = ['/admin/menu', '/admin/qr', '/admin/attendance', '/admin/payroll', '/admin/reports', '/admin/settings'];
        if (adminPaths.some(p => location.pathname.startsWith(p)) && !isAdminVerified) {
            setShowAdminGate(true);
        }
    }, [location.pathname, isAdminVerified]);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) navigate('/admin/login');
    };

    const handleVerifyAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);
        setGateError('');
        try {
            // Note: Even if logged in, this re-verifies credentials against Supabase
            const { error } = await supabase.auth.signInWithPassword({
                email: adminEmail,
                password: adminPassword
            });
            if (error) throw error;
            setIsAdminVerified(true);
            setShowAdminGate(false);
            
            // Navigate to management area so it doesn't stay on Completed Orders
            if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
            navigate('/admin/menu');
        } catch (err: any) {
            setGateError(err.message || "Invalid credentials");
        } finally {
            setVerifying(false);
        }
    };

    const publicNavItems = [
        { to: "/admin", icon: LayoutDashboard, label: "Overview" },
        { to: "/admin/pos", icon: UtensilsCrossed, label: "POS" },
        { to: "/admin/kitchen", icon: Flame, label: "Kitchen" },
        { to: "/admin/completed", icon: CheckCircle, label: "Completed Orders" },
    ];

    const adminNavItems = [
        { to: "/admin/menu", icon: UtensilsCrossed, label: "Menu Editor" },
        { to: "/admin/qr", icon: QrCode, label: "QR Codes" },
        { to: "/admin/attendance", icon: UserCheck, label: "Attendance" },
        { to: "/admin/payroll", icon: Banknote, label: "Payroll" },
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
                    {(restaurant?.name || 'SH').split(' ').map((s: string) => s[0]).join('')}
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
                className={`hidden lg:flex print:hidden flex-col bg-card border-r border-border transition-all duration-500 ease-in-out relative z-40 h-screen ${isCollapsed ? 'w-20' : 'w-64'}`}
            >
                <div className="p-6">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="flex items-center gap-3 group outline-none w-full"
                    >
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                            <span className="text-white font-black text-sm">SH</span>
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col items-start min-w-0 flex-1">
                                <h1 className="text-xl font-black tracking-tighter text-foreground uppercase group-hover:text-primary transition-colors truncate w-full text-left">
                                    {restaurant?.name.split(' ')[0] || 'SANDWICH'}
                                </h1>
                                <h1 className="text-xl font-black tracking-tighter text-primary uppercase transition-colors truncate w-full text-left -mt-1 shadow-primary/20">
                                    {restaurant?.name.split(' ').slice(1).join(' ') || 'HOUSE'}
                                </h1>
                            </div>
                        )}
                    </button>
                </div>

                <nav className="flex-1 px-3 space-y-2 overflow-y-auto min-h-0 pb-6">
                    {!isAdminVerified ? (
                        <>
                            <div className="mb-4">
                                <div className={`text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-2 px-4 flex items-center justify-between ${isCollapsed ? 'justify-center px-0' : ''}`}>
                                    <span>Operations</span>
                                </div>
                                {publicNavItems.map((item) => (
                                    <NavLink key={item.to} to={item.to} end={item.to === "/admin"} className={navClass}>
                                        <item.icon size={20} />
                                        {!isCollapsed && <span>{item.label}</span>}
                                    </NavLink>
                                ))}
                            </div>

                            <div>
                                <div className={`text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-2 px-4 flex justify-between items-center ${isCollapsed ? 'justify-center px-0' : ''}`}>
                                    {!isCollapsed && <span>Management</span>}
                                    {!isCollapsed && <Lock size={12} className="text-orange-500" />}
                                </div>
                                <button
                                    onClick={() => setShowAdminGate(true)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 w-full ${isCollapsed ? 'justify-center px-0 h-12 w-12 mx-auto' : ''}`}
                                >
                                    <Shield size={20} />
                                    {!isCollapsed && <span>Unlock Admin</span>}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="mb-4">
                                <div className={`text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-2 px-4 flex justify-between items-center ${isCollapsed ? 'justify-center px-0' : ''}`}>
                                    {!isCollapsed && <span className="text-orange-500">Management</span>}
                                    {!isCollapsed && (
                                        <button
                                            onClick={() => {
                                                setIsAdminVerified(false);
                                                navigate('/admin');
                                            }}
                                            className="text-orange-500 hover:text-white transition-colors bg-orange-500/10 hover:bg-orange-500 px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer"
                                            title="Lock Controls"
                                        >
                                            <Lock size={12} /> Lock
                                        </button>
                                    )}
                                    {isCollapsed && (
                                        <button onClick={() => { setIsAdminVerified(false); navigate('/admin'); }} className="mx-auto text-orange-500">
                                            <Lock size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {adminNavItems.map((item) => (
                                        <NavLink key={item.to} to={item.to} end={item.to === "/admin"} className={navClass}>
                                            <item.icon size={20} />
                                            {!isCollapsed && <span>{item.label}</span>}
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </nav>

                <div className="p-4 border-t border-border flex flex-col gap-2 relative">
                    {/* The ThemeToggle itself is perfectly positioned via absolute overlay so the whole row is clickable */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/80 transition-all font-bold text-muted-foreground relative cursor-pointer group ${isCollapsed ? 'justify-center px-0' : ''}`}>
                        <div className="absolute inset-0 z-10 opacity-0 child-pointer-events-none">
                            <ThemeToggle className="w-full h-full p-0" />
                        </div>
                        <div className="flex items-center gap-3 pointer-events-none">
                            <ThemeToggle className="p-0 bg-transparent hover:bg-transparent h-5 w-5 pointer-events-none" />
                            {!isCollapsed && <span className="text-sm group-hover:text-foreground transition-colors">Night Mode</span>}
                        </div>
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
                        className="absolute right-0 top-0 bottom-0 w-64 bg-card border-l border-border p-6 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-10 shrink-0">
                            <h1 className="text-xl font-black tracking-tighter">
                                {restaurant?.name.split(' ')[0] || 'SANDWICH'}<span className="text-primary">{restaurant?.name.split(' ').slice(1).join(' ') || 'HOUSE'}</span>
                            </h1>
                            <button onClick={() => setIsMobileMenuOpen(false)}>
                                <CloseIcon size={24} />
                            </button>
                        </div>
                        
                        <nav className="space-y-6 flex-1 overflow-y-auto">
                            {!isAdminVerified ? (
                                <>
                                    <div>
                                        <div className="text-xs font-black tracking-widest text-muted-foreground uppercase mb-3">Operations</div>
                                        <div className="space-y-2">
                                            {publicNavItems.map((item) => (
                                                <NavLink
                                                    key={item.to}
                                                    to={item.to}
                                                    end={item.to === "/admin"}
                                                    className={({ isActive }) =>
                                                        `flex items-center gap-4 p-3 rounded-xl font-bold transition-all ${isActive ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground'}`
                                                    }
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                >
                                                    <item.icon size={22} />
                                                    <span>{item.label}</span>
                                                </NavLink>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs font-black tracking-widest text-muted-foreground uppercase mb-3 flex items-center justify-between">
                                            <span>Management</span>
                                            <Lock size={12} className="text-orange-500" />
                                        </div>
                                        <button
                                            onClick={() => setShowAdminGate(true)}
                                            className="flex items-center gap-4 p-3 rounded-xl font-bold bg-orange-500/10 text-orange-600 w-full"
                                        >
                                            <Shield size={22} />
                                            <span>Unlock Admin</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-xs font-black tracking-widest text-orange-500 uppercase mb-3 flex justify-between items-center">
                                        <span>Management Controls</span>
                                        <button
                                            onClick={() => {
                                                setIsAdminVerified(false);
                                                navigate('/admin');
                                            }}
                                            className="text-white bg-orange-500 hover:bg-orange-600 transition-colors px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20"
                                        >
                                            <Lock size={12} /> Lock
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {adminNavItems.map((item) => (
                                            <NavLink
                                                key={item.to}
                                                to={item.to}
                                                end={item.to === "/admin"}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-4 p-3 rounded-xl font-bold transition-all ${isActive ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground'}`
                                                }
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                <item.icon size={22} />
                                                <span>{item.label}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </nav>
                        
                        <div className="mt-8 pt-6 border-t border-border shrink-0">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-4 p-3 text-red-500 font-bold w-full rounded-xl hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut size={22} />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Gate Modal */}
            {showAdminGate && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowAdminGate(false)} />
                    <div className="relative bg-card border border-border shadow-2xl rounded-3xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 mx-auto text-orange-500">
                            <Shield size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-center mb-2">Admin Required</h2>
                        <p className="text-muted-foreground text-center text-sm mb-6">Enter your email and password to access sensitive management areas.</p>
                        
                        {gateError && (
                            <div className="p-3 bg-red-500/10 text-red-500 text-sm font-medium rounded-xl mb-4 border border-red-500/20 text-center">
                                {gateError}
                            </div>
                        )}

                        <form onSubmit={handleVerifyAdmin} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-1 px-1">Email</label>
                                <input 
                                    type="email" 
                                    required 
                                    value={adminEmail}
                                    onChange={e => setAdminEmail(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-1 px-1">Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    value={adminPassword}
                                    onChange={e => setAdminPassword(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={verifying}
                                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-lg mt-2 disabled:opacity-50"
                            >
                                {verifying ? 'Verifying...' : 'Unlock Controls'}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setShowAdminGate(false)}
                                className="w-full text-muted-foreground py-2 text-sm font-bold hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 pt-20 lg:pt-8 transition-all duration-300 bg-background/40">
                <div className="max-w-7xl mx-auto h-full">
                    {!isAdminVerified && ['/admin/menu', '/admin/qr', '/admin/attendance', '/admin/payroll', '/admin/reports', '/admin/settings'].some(p => location.pathname.startsWith(p)) ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center p-8 space-y-4">
                            <Shield className="w-20 h-20 text-orange-500/20 mx-auto mb-4" />
                            <h2 className="text-3xl font-black">Management Locked</h2>
                            <p className="text-muted-foreground max-w-md mx-auto mb-6">You must unlock the admin controls in the sidebar to access sensitive management areas like this.</p>
                            <button 
                                onClick={() => setShowAdminGate(true)} 
                                className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest"
                            >
                                <Lock size={20} />
                                Unlock Admin
                            </button>
                        </div>
                    ) : (
                        <Outlet />
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
