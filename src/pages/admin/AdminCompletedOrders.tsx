import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { CheckCircle, Clock, Utensils, Hash, Navigation, Home, Truck } from 'lucide-react';

interface OrderItem {
    quantity: number;
    item_price: number;
    extras_snapshot: string;
    menu_items: { name: string } | null;
}

interface Order {
    id: string;
    table_number: string;
    status: 'completed' | 'resolved';
    total_amount: number;
    source: 'apartment' | 'walkin' | 'pos' | 'delivery' | null;
    created_at: string;
    completed_at?: string;
    order_items: OrderItem[];
}

const AdminCompletedOrders = () => {
    const { restaurantId } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        // Update current time every 10 seconds to refresh the color coding
        const timer = setInterval(() => setCurrentTime(new Date()), 10000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!restaurantId) return;
        fetchCompletedOrders();

        const channel = supabase
            .channel(`completed-${restaurantId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `restaurant_id=eq.${restaurantId}`
            }, () => fetchCompletedOrders())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [restaurantId]);

    const fetchCompletedOrders = async () => {
        if (!restaurantId) return;
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
            .eq('restaurant_id', restaurantId)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching completed orders:', error);
        else setOrders(data || []);
        setLoading(false);
    };

    const resolveOrder = async (orderId: string) => {
        if (!restaurantId) return;
        const { error } = await supabase
            .from('orders')
            .update({ status: 'resolved' })
            .eq('id', orderId)
            .eq('restaurant_id', restaurantId);
            
        if (!error) {
            setOrders(prev => prev.filter(o => o.id !== orderId));
        } else {
            console.error('Error resolving order:', error);
        }
    };

    const getOrderColorClass = (order: Order) => {
        // Use completed_at if available, otherwise fallback to created_at
        const timeRef = order.completed_at ? new Date(order.completed_at) : new Date(order.created_at);
        const diffInMinutes = (currentTime.getTime() - timeRef.getTime()) / (1000 * 60);

        if (diffInMinutes > 5) {
            return 'border-red-500/50 bg-red-500/5 hover:bg-red-500/10'; // Red
        } else if (diffInMinutes > 3) {
            return 'border-yellow-500/50 bg-yellow-500/5 hover:bg-yellow-500/10'; // Yellow
        } else {
            return 'border-green-500/50 bg-green-500/5 hover:bg-green-500/10'; // Green
        }
    };

    const getOrderHeaderColor = (order: Order) => {
        const timeRef = order.completed_at ? new Date(order.completed_at) : new Date(order.created_at);
        const diffInMinutes = (currentTime.getTime() - timeRef.getTime()) / (1000 * 60);

        if (diffInMinutes > 5) return 'bg-red-500 text-white';
        if (diffInMinutes > 3) return 'bg-yellow-500 text-yellow-950';
        return 'bg-green-500 text-white';
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Clock className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="mb-6">
                <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                    <CheckCircle className="text-green-500" /> COMPLETED ORDERS
                </h2>
                <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-1">
                    Recently Finished Orders • {orders.length} Total
                </p>
            </header>

            <div className="flex gap-4 mb-6">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div> &lt; 3 mins
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div> 3 - 5 mins
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div> &gt; 5 mins
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="bg-card border border-border rounded-3xl p-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                        <Utensils size={40} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">No Completed Orders Yet</h3>
                        <p className="text-muted-foreground">Orders marked as complete will appear here.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className={`border-2 rounded-3xl overflow-hidden shadow-sm flex flex-col transition-colors duration-500 ${getOrderColorClass(order)}`}
                        >
                            <div className="p-4 flex justify-between items-start border-b border-border/10">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="bg-background/80 px-2 py-0.5 rounded-lg border border-border/50 flex items-center gap-1">
                                            <Hash size={12} className="text-muted-foreground" />
                                            <span className="font-black text-sm">{order.id.substring(0, 4).toUpperCase()}</span>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest ${getOrderHeaderColor(order)}`}>
                                            READY
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black flex items-center gap-2">
                                        {order.source === 'apartment' ? <Home size={18} /> : order.source === 'delivery' ? <Truck size={18} /> : <Navigation size={18} />}
                                        <span className={
                                            order.source === 'delivery' ? (
                                                order.table_number.toUpperCase().includes('BEU DELIVERY') ? 'text-orange-500' :
                                                order.table_number.toUpperCase().includes('DELIVER ADDIS') ? 'text-red-500' :
                                                order.table_number.toUpperCase().includes('Z-MALL') ? 'text-blue-500' :
                                                order.table_number.toUpperCase().includes('KLIK') ? 'text-yellow-500' : ''
                                            ) : ''
                                        }>
                                            {order.table_number}
                                        </span>
                                    </h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Finished At</p>
                                    <p className="font-black text-sm">
                                        {new Date(order.completed_at || order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            <div className="p-5 flex-1 space-y-3">
                                {order.order_items.map((item, idx) => {
                                    const extras = item.extras_snapshot ? JSON.parse(item.extras_snapshot) : [];
                                    return (
                                        <div key={idx} className="flex gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background/50 border border-border flex items-center justify-center font-black text-sm">
                                                {item.quantity}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold leading-tight">{item.menu_items?.name || 'Unknown Item'}</p>
                                                {extras.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {extras.map((ex: any, eIdx: number) => (
                                                            <span key={eIdx} className="text-[10px] font-bold bg-background/50 px-2 py-0.5 rounded uppercase text-muted-foreground">
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

                            <div className="p-4 bg-background/50 border-t border-border/10">
                                <button
                                    onClick={() => resolveOrder(order.id)}
                                    className="w-full py-3 rounded-xl bg-secondary hover:bg-primary hover:text-white transition-all font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} /> Resolve
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminCompletedOrders;
