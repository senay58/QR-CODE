import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { Bell, Star, ShoppingCart, Plus, Minus, X, ClipboardList, Download, Tag, UtensilsCrossed, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';

interface CartExtra {
    id: string;
    name: string;
    price: number;
}

interface CartItem {
    cartKey: string;
    id: string;
    name: string;
    price: number; // base + extras
    base_price: number;
    quantity: number;
    extras: CartExtra[];
}

interface GlobalExtra {
    id: string;
    name: string;
    price: number;
}

const CustomerMenu = () => {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const customerType = searchParams.get('type') || 'walkin';
    const entityId = searchParams.get('id') || searchParams.get('table') || 'Unknown';
    const isApartment = customerType === 'apartment';

    const [restaurant, setRestaurant] = useState<any>(null);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    const [orderCount, setOrderCount] = useState(0);

    const fetchOrderCount = async () => {
        if (entityId === 'Unknown' || !restaurantId) return;
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .ilike('table_number', `${entityId}%`)
            .gte('created_at', today);
        if (count !== null) setOrderCount(count);
    };

    // Fetch restaurant by slug
    useEffect(() => {
        const getRestaurant = async () => {
            try {
                if (slug) {
                    const { data, error } = await supabase
                        .from('restaurants')
                        .select('*')
                        .eq('slug', slug)
                        .maybeSingle();
                    if (data) {
                        setRestaurant(data);
                        setRestaurantId(data.id);
                    } else {
                        console.error("Restaurant not found for slug:", slug, error);
                    }
                } else {
                    // Root path: load first restaurant
                    const { data, error } = await supabase
                        .from('restaurants')
                        .select('*')
                        .limit(1)
                        .maybeSingle();
                    if (data) {
                        setRestaurant(data);
                        setRestaurantId(data.id);
                    } else {
                        console.error("No restaurants found:", error);
                        setLoadingMenu(false);
                    }
                }
            } catch (err) {
                console.error("Unexpected error loading restaurant:", err);
                setLoadingMenu(false);
            }
        };
        getRestaurant();
    }, [slug]);

    // Fetch daily order count for this table/room
    useEffect(() => {
        if (restaurantId) fetchOrderCount();
    }, [entityId, restaurantId]);

    // Generate personalized identifier: [W/A]-[Location]-[Date]-[Count]
    const getFormattedId = () => {
        const prefix = isApartment ? 'A' : 'W';
        const loc = entityId.replace(/\s+/g, '');
        const day = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '');
        return `${prefix}-${loc}-${day}-${orderCount + 1}`;
    };

    const tableNumber = entityId;
    const personalizedLabel = getFormattedId();

    // --- Live data from Supabase ---
    const [categories, setCategories] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [loadingMenu, setLoadingMenu] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);

    const [callingWaiter, setCallingWaiter] = useState(false);
    const [callSuccess, setCallSuccess] = useState(false);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [isTrackingOpen, setIsTrackingOpen] = useState(false);

    const receiptRef = useRef<HTMLDivElement>(null);
    const [savingImage, setSavingImage] = useState(false);

    // Notifications
    const [notification, setNotification] = useState<{ title: string, message: string } | null>(null);
    const prevStatusRef = useRef<Record<string, string>>({});

    // --- Extras ---
    const [allExtras, setAllExtras] = useState<GlobalExtra[]>([]);
    const [extrasModal, setExtrasModal] = useState<{ item: any; availableExtras: GlobalExtra[] } | null>(null);
    const [selectedExtras, setSelectedExtras] = useState<CartExtra[]>([]);
    const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'room'>('room');

    // --- Fetch categories & menu items from Supabase ---
    useEffect(() => {
        const fetchMenu = async () => {
            if (!restaurantId) return;
            setLoadingMenu(true);
            const [catsRes, itemsRes, extrasRes] = await Promise.all([
                supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('sort_order', { ascending: true }),
                supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).order('sort_order', { ascending: true }),
                supabase.from('global_extras').select('*').eq('restaurant_id', restaurantId).order('name', { ascending: true })
            ]);
            if (catsRes.data && catsRes.data.length > 0) {
                setCategories(catsRes.data);
                // Set first top-level category as active
                const firstTop = catsRes.data.find((c: any) => !c.parent_id);
                if (firstTop) setActiveCategory(firstTop.id);
            }
            if (itemsRes.data) setMenuItems(itemsRes.data);
            if (extrasRes.data) setAllExtras(extrasRes.data);
            setLoadingMenu(false);
        };
        fetchMenu();
    }, [restaurantId]);

    // --- Fetch active orders for tracking & notifications ---
    useEffect(() => {
        if (entityId === 'Unknown' || !restaurantId) return;

        const fetchOrders = async () => {
            const { data } = await supabase
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
                .ilike('table_number', `${entityId}%`)
                .in('status', ['pending', 'preparing', 'completed', 'cancelled'])
                .order('created_at', { ascending: false })
                .limit(5);

            if (data) {
                // Check for status updates to notify
                data.forEach(order => {
                    const prevStatus = prevStatusRef.current[order.id];
                    if (prevStatus && prevStatus !== order.status) {
                        if (order.status === 'preparing') {
                            setNotification({ title: '🍳 Cooking Started!', message: `The kitchen has started preparing your delicious meal!` });
                        } else if (order.status === 'completed') {
                            const isDelivery = order.table_number.toLowerCase().includes('room');
                            setNotification({
                                title: isDelivery ? '🚚 Food on the Way!' : '✅ Pickup is Ready!',
                                message: isDelivery
                                    ? "Your food is on the way! We'll be at your door in a moment."
                                    : "Don't let your food get cold! Your order is ready for pickup at the counter."
                            });
                        } else if (order.status === 'cancelled') {
                            setNotification({
                                title: '❌ Order Cancelled',
                                message: `Your order #${order.id.substring(0, 4)} has been cancelled. Please contact staff.`
                            });
                        }
                    }
                    prevStatusRef.current[order.id] = order.status;
                });
                setActiveOrders(data);
            }
        };

        fetchOrders();

        const channel = supabase
            .channel(`public:orders:${entityId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders'
            }, (payload: any) => {
                if (payload.new && payload.new.table_number && payload.new.table_number.startsWith(entityId)) {
                    fetchOrders();
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [entityId, restaurantId]);
    // Auto-hide notification (except for 'ready' status)
    useEffect(() => {
        if (notification && !notification.title.toLowerCase().includes('ready')) {
            const timer = setTimeout(() => setNotification(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Fallback polling for orders every 10s (ensures notifications work even if realtime is unstable)
    useEffect(() => {
        if (entityId === 'Unknown') return;
        const interval = setInterval(() => {
            const fetchOrders = async () => {
                const { data } = await supabase
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
                    .ilike('table_number', `${entityId}%`)
                    .in('status', ['pending', 'preparing', 'completed', 'cancelled'])
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (data) {
                    data.forEach(order => {
                        const prevStatus = prevStatusRef.current[order.id];
                        if (prevStatus && prevStatus !== order.status) {
                            if (order.status === 'preparing') {
                                setNotification({ title: '🍳 Cooking Started!', message: `Your meal is being prepared right now!` });
                            } else if (order.status === 'completed') {
                                const isDelivery = order.table_number.toLowerCase().includes('room');
                                setNotification({
                                    title: isDelivery ? '🚚 Food on the Way!' : '✅ Pickup is Ready!',
                                    message: isDelivery
                                        ? "Your food is on the way! Fresh and hot."
                                        : "Your order is ready at the counter. Friendly tip: Eat it while it's hot!"
                                });
                            } else if (order.status === 'cancelled') {
                                setNotification({
                                    title: '❌ Order Cancelled',
                                    message: `Order #${order.id.substring(0, 4)} was cancelled.`
                                });
                            }
                        }
                        prevStatusRef.current[order.id] = order.status;
                    });
                    setActiveOrders(data);
                }
            };
            fetchOrders();
        }, 10000);
        return () => clearInterval(interval);
    }, [entityId, restaurantId]);

    const handleAddToCart = (item: any, extras: CartExtra[] = []) => {
        const extrasKey = extras.map(e => e.id).sort().join('-');
        const cartKey = `${item.id}__${extrasKey}`;
        const extrasTotal = extras.reduce((s, e) => s + e.price, 0);
        const totalPrice = item.base_price + extrasTotal;

        setCart(prev => {
            const existing = prev.find(i => i.cartKey === cartKey);
            if (existing) {
                return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, {
                cartKey,
                id: item.id,
                name: item.name,
                price: totalPrice,
                base_price: item.base_price,
                quantity: 1,
                extras
            }];
        });
    };

    const handleOpenExtras = (item: any) => {
        const available = allExtras.filter(e => item.allowed_global_extras?.includes(e.id));
        if (available.length > 0) {
            setExtrasModal({ item, availableExtras: available });
            setSelectedExtras([]);
        } else {
            handleAddToCart(item, []);
        }
    };

    const toggleExtra = (extra: GlobalExtra) => {
        setSelectedExtras(prev => {
            const exists = prev.find(e => e.id === extra.id);
            return exists ? prev.filter(e => e.id !== extra.id) : [...prev, { id: extra.id, name: extra.name, price: extra.price }];
        });
    };

    const handleUpdateQuantity = (cartKey: string, delta: number) => {
        setCart(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

    // --- Call waiter or submit apartment order ---
    const handlePlaceOrder = async (isWalkin = false) => {
        if (cart.length === 0) return;
        setCallingWaiter(true);
        setCallSuccess(false);
        try {
            const finalTable = isWalkin ? tableNumber : `${tableNumber}${deliveryMethod === 'pickup' ? ' (Pickup)' : ' (Room)'}`;
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    table_number: finalTable,
                    status: 'pending',
                    total_amount: cartTotal,
                    source: isWalkin ? 'walkin' : 'apartment',
                    restaurant_id: restaurantId
                }])
                .select().single();
            if (orderError) throw orderError;

            const orderItems = cart.map(item => ({
                order_id: orderData.id,
                item_id: item.id,
                quantity: item.quantity,
                item_price: item.price,
                extras_snapshot: JSON.stringify(item.extras)
            }));
            const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
            if (itemsError) throw itemsError;

            setCart([]);
            setIsCartOpen(false);
            setCallSuccess(true);
            fetchOrderCount();
            setTimeout(() => setCallSuccess(false), 5000);
        } catch (e: any) {
            console.error(e);
            alert(`Failed to place order: ${e.message || 'Unknown error'}`);
        } finally {
            setCallingWaiter(false);
        }
    };

    // --- Call waiter or submit apartment order ---
    const handleCallWaiter = async () => {
        setCallingWaiter(true);
        setCallSuccess(false);
        try {
            // Waiter call (no order items)
            const { error } = await supabase
                .from('staff_calls')
                .insert([{
                    table_number: tableNumber,
                    status: 'pending',
                    source: isApartment ? 'apartment' : 'walkin',
                    cart_snapshot: cart.length > 0 ? JSON.stringify(cart) : null,
                    restaurant_id: restaurantId
                }]);
            if (error) throw error;
            setCallSuccess(true);
            setTimeout(() => setCallSuccess(false), 5000);
        } catch (error) {
            console.error('Error:', error);
            alert('Could not notify staff. Please try again or wave to a waiter.');
        } finally {
            setCallingWaiter(false);
        }
    };

    // --- Save cart as image (walk-in) ---
    const handleSaveAsImage = async () => {
        if (!receiptRef.current) return;
        setSavingImage(true);
        try {
            receiptRef.current.style.display = 'block';
            const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: '#ffffff' });
            receiptRef.current.style.display = 'none';
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `${restaurant?.name || 'Restaurant'}_${personalizedLabel}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Failed to save image:', error);
        } finally {
            setSavingImage(false);
        }
    };

    // Subcategories of the currently active top-level category
    const subCategories = categories.filter(c => c.parent_id === activeCategory);

    const currentItems = menuItems.filter(i =>
        i.is_active !== false &&
        (
            // Show all items under parent + its subcategories when "All" is active
            activeSubCategory
                ? i.category_id === activeSubCategory ||
                  (i.extra_category_ids && i.extra_category_ids.includes(activeSubCategory))
                : i.category_id === activeCategory ||
                  (i.extra_category_ids && i.extra_category_ids.includes(activeCategory)) ||
                  subCategories.some(sub => i.category_id === sub.id)
        )
    );

    const renderStars = (rating: number, count: number) => (
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} size={11} fill={star <= Math.round(rating) ? 'currentColor' : 'none'} className={star <= Math.round(rating) ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'} />
                ))}
            </div>
            <span>({count})</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-foreground pb-36 font-sans selection:bg-primary/20 relative overflow-x-hidden">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(var(--primary),0.05)_0%,_transparent_70%)] pointer-events-none -z-20" />

            {/* ── Header ── */}
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <h1 className="text-3xl font-black tracking-tighter text-foreground leading-none">
                                {restaurant?.name.split(' ')[0] || 'LOGO'}<span className="text-primary">{restaurant?.name.split(' ').slice(1).join(' ') || ''}</span>
                            </h1>
                            <span className="text-[10px] text-muted-foreground font-black tracking-widest uppercase mt-1 bg-secondary/80 self-start px-2 py-0.5 rounded border border-border">
                                ID: {personalizedLabel}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {activeOrders.length > 0 && (
                            <button
                                onClick={() => setIsTrackingOpen(true)}
                                className="p-2 bg-primary/10 text-primary rounded-xl relative hover:bg-primary/20 transition-all border border-primary/20 group shadow-sm active:scale-95"
                                aria-label="Track orders"
                            >
                                <Bell size={20} className="animate-pulse group-hover:animate-none" />
                                <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-primary text-white text-[10px] flex items-center justify-center rounded-full font-black ring-2 ring-background shadow-md">
                                    {activeOrders.length}
                                </span>
                            </button>
                        )}
                        <ThemeToggle />
                    </div>
                </div>

                {/* Main Category Tabs — top-level only */}
                <div className="flex overflow-x-auto hide-scrollbar py-2.5 px-4 gap-2 bg-secondary/30 border-t border-border/50">
                    {loadingMenu ? (
                        <div className="text-xs text-muted-foreground animate-pulse py-1.5">Loading categories...</div>
                    ) : (
                        categories.filter(c => !c.parent_id).map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => { setActiveCategory(cat.id); setActiveSubCategory(null); }}
                                className={`whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-bold transition-all border ${activeCategory === cat.id
                                    ? 'bg-primary text-primary-foreground border-primary shadow-md active:scale-95'
                                    : 'bg-card/50 text-muted-foreground border-border/50 hover:bg-secondary active:scale-95'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))
                    )}
                </div>

                {/* Subcategory Pills — shown when active category has children */}
                {!loadingMenu && subCategories.length > 0 && (
                    <div className="flex overflow-x-auto hide-scrollbar px-4 py-2 gap-2 border-t border-border/30 bg-background/60">
                        <button
                            onClick={() => setActiveSubCategory(null)}
                            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                !activeSubCategory
                                    ? 'bg-primary/15 text-primary border-primary/40'
                                    : 'bg-transparent text-muted-foreground border-border hover:bg-secondary'
                            }`}
                        >
                            All
                        </button>
                        {subCategories.map(sub => (
                            <button
                                key={sub.id}
                                onClick={() => setActiveSubCategory(activeSubCategory === sub.id ? null : sub.id)}
                                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    activeSubCategory === sub.id
                                        ? 'bg-primary/15 text-primary border-primary/40'
                                        : 'bg-transparent text-muted-foreground border-border hover:bg-secondary'
                                }`}
                            >
                                {sub.name}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            {/* ── Menu List ── */}
            <main className="max-w-3xl mx-auto p-4 space-y-4">
                {loadingMenu ? (
                    [1, 2, 3].map(n => <div key={n} className="bg-card/70 backdrop-blur-md flex flex-row gap-3.5 p-3.5 rounded-[1.5rem] shadow-sm border border-border/40 animate-pulse h-32" />)
                ) : currentItems.length > 0 ? (
                    currentItems.map((item) => (
                        <div key={item.id} className="bg-card/75 backdrop-blur-lg flex flex-row gap-3 p-3 sm:gap-4 sm:p-4 rounded-[1.5rem] shadow-sm border border-border/40 hover:shadow-md transition-all active:scale-[0.98]">
                            {/* Image */}
                            <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-[1.2rem] bg-secondary/40 overflow-hidden relative border border-border/40 shadow-inner">
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">🥪</div>
                                )}
                                {(item.is_fasting || categories.find(c => c.id === item.category_id)?.name.toLowerCase().includes('fasting')) && (
                                    <div className="absolute bottom-2 left-2 bg-green-500/20 backdrop-blur-md text-green-600 dark:text-green-400 p-1 rounded-full border border-green-500/30" title="Fasting Meal">
                                        🌿
                                    </div>
                                )}
                                {(item.allowed_global_extras && item.allowed_global_extras.length > 0) && (
                                    <div className="absolute top-2 right-2 bg-primary/20 backdrop-blur-md text-primary p-1 rounded-full border border-primary/30" title="Extras Available">
                                        <Tag size={10} />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex flex-col flex-grow justify-between min-w-0">
                                <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                                    <div className="min-w-0 flex-1 text-left">
                                        <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight break-words pr-1">
                                            {item.name}
                                        </h3>
                                        {item.average_rating > 0 && renderStars(item.average_rating, item.total_ratings || 0)}
                                    </div>
                                    <span className="shrink-0 bg-primary/10 text-primary font-extrabold rounded-lg border border-primary/20 text-[11px] sm:text-sm px-2 py-1 sm:px-2.5 sm:py-1 whitespace-nowrap">
                                        ETB {Number(item.base_price).toFixed(2)}
                                    </span>
                                </div>

                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 uppercase font-bold tracking-tight text-left leading-relaxed line-clamp-2 sm:line-clamp-none">{item.description}</p>

                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex flex-wrap gap-1">
                                        {(item.ingredients && item.ingredients.length > 0) && item.ingredients.slice(0, 3).map((ing: string, idx: number) => (
                                            <span key={idx} className="text-[9px] uppercase font-bold tracking-wider bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded border border-border/50">
                                                {ing}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => handleOpenExtras(item)}
                                        className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold transition-all flex items-center justify-center gap-1 shadow-sm hover:shadow-md px-4 py-2 text-sm active:scale-90"
                                        aria-label="Add to cart"
                                    >
                                        <Plus size={16} /> Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-muted-foreground bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50">
                        No items found in this category.
                    </div>
                )}
            </main>

            {/* ── Cart Sliding Overlay ── */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm pointer-events-auto" onClick={() => setIsCartOpen(false)} />
                    <div className="bg-card w-full max-h-[82vh] rounded-t-3xl shadow-2xl pointer-events-auto flex flex-col relative z-10 border-t border-x border-border p-4 sm:max-w-md sm:mx-auto">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                                <ShoppingCart size={20} className="text-primary" />
                                {isApartment ? 'Your Order' : 'Your Selections'}
                            </h2>
                            <div className="flex items-center gap-2">
                                {cart.length > 0 && (
                                    <button onClick={() => setCart([])} className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 transition-colors">Clear</button>
                                )}
                                <button onClick={() => setIsCartOpen(false)} className="p-2 text-muted-foreground hover:bg-secondary rounded-full">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3 pb-4">
                            {cart.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">Nothing in your cart yet.</p>
                            ) : (
                                cart.map(item => (
                                    <div key={item.cartKey} className="flex items-center justify-between bg-secondary/20 p-3 rounded-xl border border-border/50">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-foreground">{item.name}</span>
                                            {item.extras && item.extras.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                    {item.extras.map(ex => (
                                                        <span key={ex.id} className="text-[9px] bg-primary/10 text-primary px-1 rounded font-medium">+{ex.name}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <span className="text-xs text-muted-foreground mt-0.5">ETB {(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-background rounded-lg border border-border p-1">
                                            <button onClick={() => handleUpdateQuantity(item.cartKey, -1)} className="text-muted-foreground hover:text-destructive p-1"><Minus size={14} /></button>
                                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => handleUpdateQuantity(item.cartKey, 1)} className="text-muted-foreground hover:text-primary p-1"><Plus size={14} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="pt-3 border-t border-border flex justify-between items-center mb-3">
                                <span className="font-medium text-muted-foreground">Total</span>
                                <span className="text-2xl font-bold text-primary">ETB {cartTotal.toFixed(2)}</span>
                            </div>
                        )}

                        {!isApartment && (
                            <div className="space-y-2 pb-2">
                                {cart.length > 0 && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handlePlaceOrder(true)}
                                            disabled={callingWaiter || cart.length === 0}
                                            className="flex-1 py-3.5 rounded-xl font-bold text-base bg-primary text-primary-foreground flex items-center justify-center gap-2 transition-all hover:bg-primary/90 active:scale-95 shadow-lg shadow-primary/20"
                                        >
                                            <UtensilsCrossed size={18} /> Send to Kitchen
                                        </button>
                                        <button
                                            onClick={handleSaveAsImage}
                                            disabled={savingImage}
                                            title="Save Order as Image"
                                            className="p-3.5 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-all active:scale-95 border border-border/50 aspect-square flex items-center justify-center"
                                        >
                                            <Download size={20} className={savingImage ? 'animate-bounce' : ''} />
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={handleCallWaiter}
                                    disabled={callingWaiter || callSuccess}
                                    className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 border ${callSuccess
                                        ? 'bg-green-500 text-white border-green-500'
                                        : 'bg-secondary text-foreground border-border hover:bg-secondary/80'
                                        }`}
                                >
                                    <Bell size={18} />
                                    {callSuccess ? 'Waiter Notified!' : callingWaiter ? 'Notifying...' : 'Call Waiter'}
                                </button>
                            </div>
                        )}

                        {/* Apartment: place order button inside cart */}
                        {isApartment && cart.length > 0 && (
                            <div className="space-y-4 pb-2">
                                <div className="bg-secondary/30 p-1 rounded-xl flex gap-1 border border-border/50">
                                    <button
                                        onClick={() => setDeliveryMethod('room')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${deliveryMethod === 'room' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}`}
                                    >
                                        Room Delivery
                                    </button>
                                    <button
                                        onClick={() => setDeliveryMethod('pickup')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${deliveryMethod === 'pickup' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}`}
                                    >
                                        Pick up
                                    </button>
                                </div>
                                <button
                                    onClick={() => handlePlaceOrder(false)}
                                    disabled={callingWaiter || callSuccess || tableNumber === 'Unknown'}
                                    className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${callSuccess
                                        ? 'bg-green-500 text-white'
                                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                        }`}
                                >
                                    <ShoppingCart size={18} className={callingWaiter ? 'animate-pulse' : ''} />
                                    {callingWaiter ? 'Sending Order...' : callSuccess ? 'Order Submitted!' : `Place Order (${deliveryMethod === 'room' ? 'Room' : 'Pickup'})`}
                                </button>
                            </div>
                        )}
                        {isApartment && <div className="pb-4" />}
                    </div>
                </div>
            )}

            {/* ── Order Tracking Overlay ── */}
            {isTrackingOpen && (
                <div className="fixed inset-0 z-[55] flex flex-col justify-end pointer-events-none">
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm pointer-events-auto" onClick={() => setIsTrackingOpen(false)} />
                    <div className="bg-card w-full max-h-[80vh] rounded-t-3xl shadow-2xl pointer-events-auto flex flex-col relative z-20 border-t border-x border-border p-4 sm:max-w-md sm:mx-auto">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                            <h2 className="text-xl font-black tracking-tight flex items-center gap-2 text-foreground">
                                <ClipboardList size={22} className="text-primary" /> Active Orders
                            </h2>
                            <button onClick={() => setIsTrackingOpen(false)} className="p-2 bg-secondary/50 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3 pb-8">
                            {activeOrders.length === 0 ? (
                                <div className="text-center py-12 flex flex-col items-center gap-3 opacity-60">
                                    <CheckCircle2 size={48} className="text-muted-foreground" />
                                    <p className="font-bold text-sm">No active orders right now.</p>
                                </div>
                            ) : (
                                activeOrders.map(order => (
                                    <div key={order.id} className="bg-secondary/30 p-4 rounded-2xl border border-border relative overflow-hidden ring-1 ring-border/50">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-black text-xs text-foreground tracking-tight opacity-50 uppercase">Order #{order.id.substring(0, 4)}</span>
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${order.status === 'preparing' ? 'bg-orange-500 text-white' : order.status === 'completed' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : order.status === 'cancelled' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                                                {order.status === 'completed' ? 'ready' : order.status}
                                            </span>
                                        </div>

                                        {/* Row with food names */}
                                        <div className="space-y-1 mb-3">
                                            {order.order_items?.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-xs font-bold text-foreground/80">
                                                    <span>{item.quantity}x {item.menu_items?.name}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                                            <span className="text-primary font-black">ETB {order.total_amount?.toFixed(0)}</span>
                                            <span className="text-[10px] font-bold opacity-40">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="w-full bg-border h-1.5 rounded-full mt-3 overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-1000 ${order.status === 'preparing' ? 'bg-primary w-2/3' : order.status === 'completed' ? 'bg-green-500 w-full' : order.status === 'cancelled' ? 'bg-red-500 w-full' : 'bg-blue-500 w-1/3'}`} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Floating Cart Button (Consolidated) ── */}
            <div className={`fixed bottom-6 left-0 right-0 px-4 pointer-events-none flex justify-center ${isCartOpen ? 'z-[60]' : 'z-50'}`}>
                {cartCount > 0 && !isCartOpen ? (
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="pointer-events-auto backdrop-blur-xl shadow-2xl border border-white/20 flex items-center justify-between px-6 w-full max-w-sm py-4 rounded-[1.5rem] font-bold text-lg bg-primary/90 text-primary-foreground hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 shadow-primary/30"
                    >
                        <div className="flex items-center gap-2">
                            <div className="bg-white text-primary w-6 h-6 rounded-full flex items-center justify-center text-sm font-black shadow-sm">{cartCount}</div>
                            {isApartment ? 'View Order' : 'View Selections'}
                        </div>
                        <span>ETB {cartTotal.toFixed(2)}</span>
                    </button>
                ) : !isCartOpen && (
                    <button
                        onClick={handleCallWaiter}
                        disabled={callingWaiter || callSuccess || tableNumber === 'Unknown'}
                        className={`pointer-events-auto backdrop-blur-xl shadow-2xl flex items-center justify-center gap-2 w-full max-w-sm py-4 rounded-[1.5rem] font-bold text-lg transition-all active:scale-95 border ${callSuccess
                            ? 'bg-green-500/90 text-white border-green-500/50'
                            : callingWaiter
                                ? 'bg-muted/90 text-muted-foreground cursor-wait border-border'
                                : 'bg-card/90 text-foreground border-border/50 hover:bg-secondary hover:-translate-y-1'
                            }`}
                    >
                        <Bell size={20} className={callingWaiter ? 'animate-pulse' : ''} />
                        {callSuccess ? 'Waiter Coming!' : callingWaiter ? 'Notifying...' : 'Call Waiter'}
                    </button>
                )}
            </div>

            {/* ── Hidden Receipt for Image Export ── */}
            <div
                ref={receiptRef}
                style={{
                    display: 'none',
                    width: '400px',
                    padding: '32px',
                    background: '#ffffff',
                    color: '#111111',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.05em' }}>
                        {restaurant?.name.split(' ')[0] || 'LOGO'}<span style={{ color: '#2EA066' }}>{restaurant?.name.split(' ').slice(1).join(' ') || ''}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '6px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Order ID: {personalizedLabel}
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    {cart.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px' }}>
                            <div style={{ fontWeight: '700', fontSize: '14px' }}>{item.quantity}× {item.name}</div>
                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#2EA066' }}>ETB {(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e5e7eb', paddingTop: '16px', marginBottom: '20px' }}>
                    <span style={{ fontWeight: '900', fontSize: '18px' }}>TOTAL</span>
                    <span style={{ fontWeight: '900', fontSize: '22px', color: '#2EA066' }}>ETB {cartTotal.toFixed(0)}</span>
                </div>
            </div>

            {/* ── Extras Selection Modal ── */}
            {extrasModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/70 backdrop-blur-md" onClick={() => setExtrasModal(null)} />
                    <div className="relative bg-card border border-border rounded-3xl shadow-2xl w-full max-w-sm p-5 z-10 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-black text-xl text-foreground tracking-tight">{extrasModal.item.name}</h3>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Customize your order</p>
                            </div>
                            <button onClick={() => setExtrasModal(null)} className="p-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors"><X size={20} /></button>
                        </div>

                        <div className="space-y-2 mb-6 max-h-[40vh] overflow-y-auto pr-1 hide-scrollbar">
                            {extrasModal.availableExtras.map(extra => {
                                const isSelected = !!selectedExtras.find(e => e.id === extra.id);
                                return (
                                    <button
                                        key={extra.id}
                                        onClick={() => toggleExtra(extra)}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${isSelected
                                            ? 'border-primary bg-primary/5 shadow-inner'
                                            : 'border-border bg-secondary/20 text-muted-foreground hover:border-primary/40'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-primary border-primary scale-110' : 'border-border'}`}>
                                                {isSelected && <span className="text-white text-[10px] font-black">✓</span>}
                                            </div>
                                            <span className={`font-bold text-sm ${isSelected ? 'text-foreground' : ''}`}>{extra.name}</span>
                                        </div>
                                        <span className={`text-xs font-black ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {extra.price > 0 ? `+ETB ${extra.price.toFixed(0)}` : 'FREE'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { handleAddToCart(extrasModal.item, []); setExtrasModal(null); }}
                                className="flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-secondary text-muted-foreground hover:bg-secondary/80 transition-all active:scale-95"
                            >
                                Skip Extras
                            </button>
                            <button
                                onClick={() => { handleAddToCart(extrasModal.item, selectedExtras); setExtrasModal(null); }}
                                className="flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Notification Toast ── */}
            {notification && (
                <div className="fixed top-6 left-4 right-4 z-[99] animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-card/90 backdrop-blur-xl border border-primary/30 shadow-2xl p-4 rounded-2xl flex items-center gap-4 max-w-md mx-auto">
                        <div className="bg-primary/20 p-2 rounded-full text-primary shrink-0">
                            <CheckCircle2 size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black text-sm text-foreground">{notification.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
                        </div>
                        <button onClick={() => setNotification(null)} className="p-2 text-muted-foreground hover:bg-secondary rounded-full">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
        </div>
    );
};

export default CustomerMenu;
