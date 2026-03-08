import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Clock,
    CheckCircle2,
    Flame,
    Utensils,
    Hash,
    Navigation,
    Home,
    RefreshCw,
    Check
} from 'lucide-react';

interface OrderItem {
    quantity: number;
    item_price: number;
    extras_snapshot: string;
    menu_items: { name: string } | null;
}

interface Order {
    id: string;
    table_number: string;
    status: 'pending' | 'preparing' | 'completed' | 'cancelled';
    total_amount: number;
    source: 'apartment' | 'walkin' | 'pos' | null;
    created_at: string;
    order_items: OrderItem[];
}

const AdminKitchen = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchKitchenOrders();

        // Realtime subscription
        const channel = supabase
            .channel('kitchen_orders')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders'
            }, () => fetchKitchenOrders())
            .subscribe();

        const interval = setInterval(fetchKitchenOrders, 5000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    const fetchKitchenOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    quantity,
                    item_price,
                    extras_snapshot,
                    menu_items ( name )
                )
            `)
            .in('status', ['pending', 'preparing'])
            .order('created_at', { ascending: true });

        if (error) console.error('Kitchen error:', error);
        else setOrders(data || []);
        setLoading(false);
    };

    const updateStatus = async (orderId: string, status: 'preparing' | 'completed') => {
        const { error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId);
        if (!error) fetchKitchenOrders();
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchKitchenOrders();
        setTimeout(() => setRefreshing(false), 500);
    };

    if (loading) return (
        <div className="flex h-96 items-center justify-center">
            <RefreshCw className="animate-spin text-primary" size={32} />
        </div>
    );

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <Flame className="text-orange-500" /> KITCHEN DISPLAY
                    </h2>
                    <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-1">
                        Active Food Orders • {orders.length} Remaining
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    className={`p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-all ${refreshing ? 'animate-spin' : ''}`}
                >
                    <RefreshCw size={20} />
                </button>
            </header>

            {orders.length === 0 ? (
                <div className="bg-card border border-border rounded-3xl p-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                        <CheckCircle2 size={40} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Kitchen is Clear!</h3>
                        <p className="text-muted-foreground">No pending or preparing orders right now.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className={`bg-card border-2 rounded-3xl overflow-hidden shadow-sm flex flex-col ${order.status === 'preparing' ? 'border-orange-500/50' : 'border-blue-500/50'
                                }`}
                        >
                            {/* Card Header */}
                            <div className={`p-4 flex justify-between items-start ${order.status === 'preparing' ? 'bg-orange-500/10' : 'bg-blue-500/10'
                                }`}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="bg-background px-2 py-0.5 rounded-lg border border-border/50 flex items-center gap-1">
                                            <Hash size={12} className="text-muted-foreground" />
                                            <span className="font-black text-sm">{order.id.substring(0, 4).toUpperCase()}</span>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest ${order.status === 'preparing' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-black flex items-center gap-2">
                                        {order.source === 'apartment' ? <Home size={20} /> : <Navigation size={20} />}
                                        {order.table_number}
                                    </h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Placed At</p>
                                    <p className="font-black text-sm">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="p-5 flex-1 space-y-4">
                                {order.order_items.map((item, idx) => {
                                    const extras = item.extras_snapshot ? JSON.parse(item.extras_snapshot) : [];
                                    return (
                                        <div key={idx} className="flex gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-black text-primary">
                                                {item.quantity}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-lg leading-tight">{item.menu_items?.name || 'Unknown Item'}</p>
                                                {extras.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {extras.map((ex: any, eIdx: number) => (
                                                            <span key={eIdx} className="text-[10px] font-bold bg-secondary px-2 py-0.5 rounded uppercase tracking-tighter text-muted-foreground">
                                                                + {ex.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Actions */}
                            <div className="p-4 bg-background/50 border-t border-border flex gap-3">
                                {order.status === 'pending' ? (
                                    <button
                                        onClick={() => updateStatus(order.id, 'preparing')}
                                        className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                                    >
                                        <Utensils size={18} /> Start Cooking
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => updateStatus(order.id, 'completed')}
                                        className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                                    >
                                        <Check size={20} className="stroke-[3]" /> Mark Ready
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminKitchen;
