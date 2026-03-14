import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Bell, CheckCircle2, TrendingUp, DollarSign, Package, Home, Users, Clock, RefreshCw, UtensilsCrossed, ChevronDown, ChevronUp } from 'lucide-react';


interface Order {
    id: string;
    table_number: string;
    status: 'pending' | 'preparing' | 'completed' | 'cancelled';
    total_amount: number;
    source: 'apartment' | 'walkin' | 'pos' | 'delivery' | null;
    created_at: string;
    order_items?: {
        quantity: number;
        item_price: number;
        extras_snapshot: string;
        menu_items: { name: string } | null;
    }[];
}

interface StaffCall {
    id: string;
    table_number: string;
    status: 'pending' | 'resolved';
    source: 'apartment' | 'walkin' | null;
    cart_snapshot?: string;
    created_at: string;
}

interface PopularItem {
    name: string;
    count: number;
    revenue: number;
}

const statusColor: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    preparing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const AdminOverview = () => {
    const { restaurantId } = useAuth();
    const [calls, setCalls] = useState<StaffCall[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [ordersTab, setOrdersTab] = useState<'all' | 'apartment' | 'walkin' | 'delivery'>('all');
    const [refreshing, setRefreshing] = useState(false);
    const [expandedCall, setExpandedCall] = useState<string | null>(null);

    useEffect(() => {
        fetchAll();

        // High-frequency refresh for "Dynamic" feeling
        const interval = setInterval(() => {
            fetchAll();
        }, 2000);

        // Real-time fallback
        const callsChannel = supabase
            .channel('public:staff_calls')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_calls' }, () => fetchAll())
            .subscribe();

        const ordersChannel = supabase
            .channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchAll())
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(callsChannel);
            supabase.removeChannel(ordersChannel);
        };
    }, [restaurantId]);

    const fetchAll = async () => {
        await Promise.all([fetchCalls(), fetchOrders(), fetchAnalytics()]);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAll();
        setTimeout(() => setRefreshing(false), 600);
    };

    const fetchCalls = async () => {
        if (!restaurantId) return;
        const { data } = await supabase
            .from('staff_calls')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        if (data) setCalls(data);
    };

    const fetchOrders = async () => {
        if (!restaurantId) return;
        const { data } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    quantity,
                    item_price,
                    extras_snapshot,
                    menu_items (name)
                )
            `)
            .eq('restaurant_id', restaurantId)
            .in('status', ['pending', 'preparing'])
            .order('created_at', { ascending: false });
        if (data) setOrders(data);
    };

    const fetchAnalytics = async () => {
        if (!restaurantId) return;
        const { data: orderItems, error } = await supabase
            .from('order_items')
            .select('quantity, item_price, menu_items!inner(name, restaurant_id), orders!inner(status, restaurant_id)')
            .eq('orders.status', 'completed')
            .eq('orders.restaurant_id', restaurantId);

        if (!error && orderItems) {
            let total = 0;
            const itemMap = new Map<string, PopularItem>();
            orderItems.forEach((oi: any) => {
                const name = oi.menu_items?.name || 'Unknown';
                const rev = oi.quantity * oi.item_price;
                total += rev;
                if (itemMap.has(name)) {
                    const e = itemMap.get(name)!;
                    e.count += oi.quantity;
                    e.revenue += rev;
                } else {
                    itemMap.set(name, { name, count: oi.quantity, revenue: rev });
                }
            });
            setTotalRevenue(total);
            setPopularItems(Array.from(itemMap.values()).sort((a, b) => b.count - a.count).slice(0, 5));
        }
    };

    const resolveCall = async (id: string) => {
        if (!restaurantId) return;
        await supabase.from('staff_calls').update({ status: 'resolved' }).eq('id', id).eq('restaurant_id', restaurantId);
        setCalls(cur => cur.filter(c => c.id !== id));
    };

    const sendCallToKitchen = async (call: StaffCall) => {
        if (!call.cart_snapshot) return;
        try {
            const cart = JSON.parse(call.cart_snapshot);
            const total = cart.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);

            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    table_number: call.table_number,
                    status: 'pending',
                    total_amount: total,
                    source: call.source,
                    restaurant_id: restaurantId
                }])
                .select().single();

            if (orderError) throw orderError;

            const orderItems = cart.map((item: any) => ({
                order_id: orderData.id,
                item_id: item.id,
                quantity: item.quantity,
                item_price: item.price,
                extras_snapshot: JSON.stringify(item.extras)
            }));

            await supabase.from('order_items').insert(orderItems);
            await resolveCall(call.id);
            fetchAll();
        } catch (e) {
            console.error(e);
            alert('Failed to send to kitchen');
        }
    };


    const updateOrderStatus = async (id: string, status: Order['status']) => {
        if (!restaurantId) return;
        const updatePayload: any = { status };
        if (status === 'completed') updatePayload.completed_at = new Date().toISOString();
        
        await supabase.from('orders').update(updatePayload).eq('id', id).eq('restaurant_id', restaurantId);
        if (status === 'completed' || status === 'cancelled') {
            setOrders(cur => cur.filter(o => o.id !== id));
        } else {
            setOrders(cur => cur.map(o => o.id === id ? { ...o, status } : o));
        }
    };

    const filteredOrders = orders.filter(o => {
        if (ordersTab === 'all') return true;
        if (ordersTab === 'apartment') return o.source === 'apartment';
        if (ordersTab === 'walkin') return o.source === 'walkin' || o.source === null;
        if (ordersTab === 'delivery') return o.source === 'delivery';
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
                <button
                    onClick={handleRefresh}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground bg-secondary px-3 py-2 rounded-lg transition-colors border border-border"
                >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0"><Bell size={20} /></div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Waiter Calls</p>
                        <h3 className="text-2xl font-bold text-foreground">{calls.length}</h3>
                    </div>
                </div>
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0"><Clock size={20} /></div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Active Orders</p>
                        <h3 className="text-2xl font-bold text-foreground">{orders.length}</h3>
                    </div>
                </div>
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><DollarSign size={20} /></div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
                        <h3 className="text-xl font-bold text-foreground">ETB {totalRevenue.toFixed(0)}</h3>
                    </div>
                </div>
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center shrink-0"><Package size={20} /></div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Top Items</p>
                        <h3 className="text-2xl font-bold text-foreground">{popularItems.length}</h3>
                    </div>
                </div>
            </div>

            {/* Active Orders Board */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                        <Clock size={18} className="text-primary" /> Live Orders
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${orders.length > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-secondary text-muted-foreground'}`}>
                            {orders.length} Active
                        </span>
                    </h2>
                    {/* Source filter tabs */}
                    <div className="flex bg-secondary p-1 rounded-lg self-start sm:self-auto overflow-x-auto hide-scrollbar max-w-full">
                        {(['all', 'apartment', 'walkin', 'delivery'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setOrdersTab(tab)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all capitalize whitespace-nowrap ${ordersTab === tab ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {tab === 'apartment' ? <Home size={12} /> : tab === 'walkin' ? <Users size={12} /> : tab === 'delivery' ? <Package size={12} /> : null}
                                {tab === 'all' ? 'All' : tab === 'apartment' ? 'Apartments' : tab === 'walkin' ? 'Walk-ins' : 'Delivery'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 grid gap-3 sm:grid-cols-2 max-h-[400px] overflow-y-auto hide-scrollbar">
                    {filteredOrders.length === 0 ? (
                        <div className="col-span-2 h-32 flex flex-col items-center justify-center text-muted-foreground">
                            <CheckCircle2 size={36} className="mb-2 opacity-20" />
                            <p className="text-sm">No active orders</p>
                        </div>
                    ) : (
                        filteredOrders.map(order => (
                            <div key={order.id} className="bg-background border border-border p-4 rounded-xl space-y-3 hover:border-primary/30 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-foreground text-sm flex items-center gap-1">
                                            {order.source === 'delivery' ? '🚚' : order.source === 'apartment' ? '🏠' : '🪑'}
                                            <span className={
                                                order.source === 'delivery' ? (
                                                    order.table_number.toUpperCase().includes('BEU DELIVERY') ? 'text-orange-500' :
                                                        order.table_number.toUpperCase().includes('DELIVER ADDIS') ? 'text-red-500' :
                                                            order.table_number.toUpperCase().includes('Z-MALL') ? 'text-blue-500' :
                                                                order.table_number.toUpperCase().includes('KLIK') ? 'text-yellow-500' : ''
                                                ) : ''
                                            }>
                                                {order.source === 'apartment' ? 'Room ' : order.source === 'walkin' ? 'Table ' : ''}
                                                {order.table_number}
                                            </span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">#{order.id.substring(0, 8)}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${statusColor[order.status]}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-primary text-sm">ETB {order.total_amount?.toFixed(2)}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                {/* Order details */}
                                <div className="bg-secondary/30 rounded-lg p-2 space-y-1.5 border border-border/50">
                                    {order.order_items?.map((item, i) => (
                                        <div key={i} className="text-xs">
                                            <div className="flex justify-between font-bold text-foreground">
                                                <span>{item.quantity}x {item.menu_items?.name}</span>
                                            </div>
                                            {item.extras_snapshot && (
                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                    {JSON.parse(item.extras_snapshot).map((ex: any, ei: number) => (
                                                        <span key={ei} className="text-[9px] bg-primary/10 text-primary px-1 rounded font-medium">+{ex.name}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {/* Quick action buttons */}
                                <div className="flex gap-2">
                                    {order.status === 'pending' && (
                                        <button
                                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                                            className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200 transition-colors"
                                        >
                                            Start Preparing
                                        </button>
                                    )}
                                    {order.status === 'preparing' && (
                                        <button
                                            onClick={() => updateOrderStatus(order.id, 'completed')}
                                            className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200 transition-colors"
                                        >
                                            Mark Complete
                                        </button>
                                    )}
                                    <button
                                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                        className="py-1.5 px-3 text-xs font-bold rounded-lg bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Bottom Row: Waiter Calls + Popular Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Waiter Calls */}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col h-[380px]">
                    <div className="p-4 border-b border-border flex justify-between items-center">
                        <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                            <Bell size={18} className="text-primary" /> Waiter Calls
                        </h2>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${calls.length > 0 ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
                            {calls.length} Active
                        </span>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto hide-scrollbar space-y-2">
                        {calls.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                <CheckCircle2 size={40} className="mb-3 opacity-20" />
                                <p className="text-sm">All caught up!</p>
                            </div>
                        ) : (
                            calls.map(call => {
                                const isExpanded = expandedCall === call.id;
                                const cart = call.cart_snapshot ? JSON.parse(call.cart_snapshot) : null;
                                return (
                                    <div key={call.id} className="bg-background border border-border rounded-xl hover:border-primary/30 transition-colors overflow-hidden">
                                        <div className="p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
                                                    {call.source === 'apartment' ? '🏠' : '🪑'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">
                                                        {call.source === 'apartment' ? 'Room' : 'Table'} {call.table_number}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {cart && <span className="ml-2 text-primary font-bold">• Order Details</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {cart && (
                                                    <button
                                                        onClick={() => setExpandedCall(isExpanded ? null : call.id)}
                                                        className="p-1.5 text-muted-foreground hover:bg-secondary rounded-md"
                                                    >
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => resolveCall(call.id)}
                                                    className="bg-secondary hover:bg-green-100 dark:hover:bg-green-900/40 text-muted-foreground hover:text-green-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Resolve
                                                </button>
                                            </div>
                                        </div>
                                        {isExpanded && cart && (
                                            <div className="px-3 pb-3 border-t border-border/50 pt-2 space-y-2">
                                                <div className="space-y-1">
                                                    {cart.map((item: any, i: number) => (
                                                        <div key={i} className="text-xs flex flex-col">
                                                            <div className="flex justify-between font-bold">
                                                                <span>{item.quantity}x {item.name}</span>
                                                                <span className="text-muted-foreground">ETB {item.price}</span>
                                                            </div>
                                                            {item.extras && item.extras.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {item.extras.map((ex: any, ei: number) => (
                                                                        <span key={ei} className="text-[9px] text-primary">+{ex.name}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => sendCallToKitchen(call)}
                                                    className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all"
                                                >
                                                    <UtensilsCrossed size={14} /> Send to Kitchen
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Popular Items */}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col h-[380px]">
                    <div className="p-4 border-b border-border">
                        <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                            <TrendingUp size={18} className="text-primary" /> Most Ordered
                        </h2>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto hide-scrollbar">
                        {popularItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                <Package size={40} className="mb-3 opacity-20" />
                                <p className="text-sm">No order data yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {popularItems.map((item, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-muted-foreground shrink-0">
                                            #{index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-bold text-foreground text-sm">{item.name}</span>
                                                <span className="text-xs text-muted-foreground">{item.count} orders</span>
                                            </div>
                                            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className="bg-primary h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${(item.count / popularItems[0].count) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
        </div>
    );
};

export default AdminOverview;
