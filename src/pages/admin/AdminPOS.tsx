import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShoppingCart, Plus, Minus, CheckCircle2, Tag, X, Truck, FolderTree } from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface GlobalExtra {
    id: string;
    name: string;
    price: number;
}

interface CartExtra {
    id: string;
    name: string;
    price: number;
}

interface CartItem {
    cartKey: string;
    id: string;
    name: string;
    base_price: number;
    quantity: number;
    extras: CartExtra[];
    image_url?: string;
    lineTotal: number;
}

const DELIVERY_COMPANIES = ['BEU DELIVERY', 'Deliver Addis', 'Z-Mall', 'Klik'];

// ── Component ──────────────────────────────────────────
const AdminPOS = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [allExtras, setAllExtras] = useState<GlobalExtra[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Cart
    const [cart, setCart] = useState<CartItem[]>([]);
    const [tableNumber, setTableNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [orderSource, setOrderSource] = useState<'walkin' | 'apartment' | 'delivery'>('walkin');
    const [deliveryMethod, setDeliveryMethod] = useState<'room' | 'pickup'>('room');
    const [deliveryCompany, setDeliveryCompany] = useState('');

    // Staff
    const [staffList, setStaffList] = useState<any[]>([]);
    const [selectedStaff, setSelectedStaff] = useState('');

    // Extras selection modal
    const [extrasModal, setExtrasModal] = useState<{ item: any; availableExtras: GlobalExtra[] } | null>(null);
    const [selectedExtras, setSelectedExtras] = useState<CartExtra[]>([]);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const [catsRes, itemsRes, extrasRes] = await Promise.all([
            supabase.from('categories').select('*').order('sort_order', { ascending: true }),
            supabase.from('menu_items').select('*').order('name', { ascending: true }),
            supabase.from('global_extras').select('*').order('name', { ascending: true }),
        ]);
        if (catsRes.data) {
            setCategories(catsRes.data);
            // Set first top-level category active
            const firstTop = catsRes.data.find((c: any) => !c.parent_id);
            if (firstTop) setActiveCategory(firstTop.id);
        }
        if (itemsRes.data) setItems(itemsRes.data);
        if (extrasRes.data) setAllExtras(extrasRes.data);

        const { data: sData } = await supabase.from('staff').select('name').eq('is_active', true);
        if (sData) setStaffList(sData);
        setLoading(false);
    };

    // ── Subcategory helpers ──
    const topLevelCats = categories.filter(c => !c.parent_id);
    const subCats = categories.filter(c => c.parent_id === activeCategory);

    // Item filter: show items from active (sub)category, and items with extra_category_ids matching
    const effectiveCatId = activeSubCategory || activeCategory;
    const currentItems = items.filter(i => {
        if (i.is_active === false) return false;
        if (activeSubCategory) {
            return i.category_id === activeSubCategory ||
                (i.extra_category_ids && i.extra_category_ids.includes(activeSubCategory));
        }
        // No sub selected → show parent + all its subcategory items
        return i.category_id === activeCategory ||
            (i.extra_category_ids && i.extra_category_ids.includes(activeCategory)) ||
            subCats.some(sub => i.category_id === sub.id);
    });

    // ── When clicking an item on the grid, open extras picker ──
    const handleClickItem = (item: any) => {
        const available = allExtras.filter(e => item.allowed_global_extras?.includes(e.id));
        if (available.length > 0) {
            setExtrasModal({ item, availableExtras: available });
            setSelectedExtras([]);
        } else {
            addToCart(item, []);
        }
    };

    const toggleExtra = (extra: GlobalExtra) => {
        setSelectedExtras(prev => {
            const exists = prev.find(e => e.id === extra.id);
            return exists ? prev.filter(e => e.id !== extra.id) : [...prev, { id: extra.id, name: extra.name, price: extra.price }];
        });
    };

    const confirmExtrasAndAdd = () => {
        if (!extrasModal) return;
        addToCart(extrasModal.item, selectedExtras);
        setExtrasModal(null);
        setSelectedExtras([]);
    };

    const addToCart = (item: any, extras: CartExtra[]) => {
        const extrasKey = extras.map(e => e.id).sort().join('-');
        const cartKey = `${item.id}__${extrasKey}`;
        const extrasTotal = extras.reduce((s, e) => s + e.price, 0);
        const lineTotal = item.base_price + extrasTotal;

        setCart(prev => {
            const existing = prev.find(i => i.cartKey === cartKey);
            if (existing) {
                return prev.map(i => i.cartKey === cartKey
                    ? { ...i, quantity: i.quantity + 1, lineTotal: (i.quantity + 1) * lineTotal }
                    : i
                );
            }
            return [...prev, {
                cartKey,
                id: item.id,
                name: item.name,
                base_price: item.base_price,
                quantity: 1,
                extras,
                image_url: item.image_url,
                lineTotal,
            }];
        });
    };

    const handleUpdateQuantity = (cartKey: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.cartKey !== cartKey) return i;
            const newQty = Math.max(0, i.quantity + delta);
            const singleTotal = i.base_price + i.extras.reduce((s, e) => s + e.price, 0);
            return { ...i, quantity: newQty, lineTotal: newQty * singleTotal };
        }).filter(i => i.quantity > 0));
    };

    const removeFromCart = (cartKey: string) => setCart(prev => prev.filter(i => i.cartKey !== cartKey));
    const cartTotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);

    const handleSubmitOrder = async () => {
        if (cart.length === 0) { setError('Please add items to the order.'); return; }
        if (orderSource !== 'delivery' && !tableNumber.trim()) {
            setError('Please enter a table/room identifier.');
            return;
        }
        if (orderSource === 'delivery' && !deliveryCompany) {
            setError('Please select a delivery company.');
            return;
        }

        setSubmitting(true);
        setError('');

        let finalTableNumber = '';
        if (orderSource === 'delivery') {
            finalTableNumber = `${deliveryCompany}${tableNumber.trim() ? ` #${tableNumber.trim()}` : ''}`;
        } else if (orderSource === 'walkin') {
            finalTableNumber = tableNumber;
        } else {
            finalTableNumber = `${tableNumber} (${deliveryMethod === 'room' ? 'Room' : 'Pickup'})`;
        }

        try {
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    table_number: finalTableNumber,
                    status: 'pending',
                    total_amount: cartTotal,
                    source: orderSource === 'delivery' ? 'delivery' : orderSource,
                    staff_name: selectedStaff || 'POS Admin'
                }])
                .select().single();
            if (orderError) throw orderError;

            const orderItems = cart.map(item => ({
                order_id: orderData.id,
                item_id: item.id,
                quantity: item.quantity,
                item_price: item.lineTotal / item.quantity,
                extras_snapshot: JSON.stringify(item.extras),
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
            if (itemsError) throw itemsError;

            setSuccess(true);
            setCart([]);
            setTableNumber('');
            setDeliveryCompany('');
            setTimeout(() => setSuccess(false), 4000);
        } catch (e: any) {
            setError(e.message || 'Failed to place order.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render ─────────────────────────────────────────
    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <header className="mb-4">
                <h2 className="text-2xl font-bold text-foreground">Point of Sale</h2>
                <p className="text-muted-foreground text-sm">Create orders for walk-ins, apartments, or third-party delivery.</p>
            </header>

            {error && (
                <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex justify-between items-center">
                    {error}
                    <button onClick={() => setError('')}><X size={14} /></button>
                </div>
            )}

            <div className="flex-1 flex gap-4 overflow-hidden">

                {/* ── Left: Menu Grid ── */}
                <div className="flex-[2] flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

                    {/* Top-level Category strip */}
                    <div className="flex overflow-x-auto hide-scrollbar p-2 gap-2 bg-secondary/50 border-b border-border shrink-0">
                        {loading ? (
                            <span className="text-xs text-muted-foreground animate-pulse py-2 px-3">Loading...</span>
                        ) : topLevelCats.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => { setActiveCategory(cat.id); setActiveSubCategory(null); }}
                                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeCategory === cat.id
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'bg-background text-muted-foreground hover:bg-secondary border border-border'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Subcategory pills — shown when current category has children */}
                    {!loading && subCats.length > 0 && (
                        <div className="flex overflow-x-auto hide-scrollbar px-2 py-1.5 gap-2 bg-background/50 border-b border-border/40 shrink-0">
                            <button
                                onClick={() => setActiveSubCategory(null)}
                                className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${!activeSubCategory
                                    ? 'bg-primary/15 text-primary border-primary/40'
                                    : 'text-muted-foreground border-border hover:bg-secondary'
                                    }`}
                            >
                                All
                            </button>
                            {subCats.map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => setActiveSubCategory(activeSubCategory === sub.id ? null : sub.id)}
                                    className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-bold transition-all border flex items-center gap-1 ${activeSubCategory === sub.id
                                        ? 'bg-primary/15 text-primary border-primary/40'
                                        : 'text-muted-foreground border-border hover:bg-secondary'
                                        }`}
                                >
                                    <FolderTree size={10} />
                                    {sub.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Items grid */}
                    <div className="flex-1 overflow-y-auto p-3 hide-scrollbar bg-background/40">
                        {loading ? (
                            <div className="text-center text-muted-foreground animate-pulse py-10">Loading Menu...</div>
                        ) : currentItems.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">No items in this category.</div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {currentItems.map(item => {
                                    const hasExtras = item.allowed_global_extras && item.allowed_global_extras.length > 0;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleClickItem(item)}
                                            className="bg-card border border-border rounded-xl p-3 flex flex-col items-center text-center gap-1.5 hover:border-primary hover:shadow-lg hover:-translate-y-0.5 transition-all group relative"
                                        >
                                            {item.is_fasting && (
                                                <span className="absolute bottom-2 left-2 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full p-1 border border-green-500/30 z-10" title="Fasting Meal">
                                                    🌿
                                                </span>
                                            )}
                                            {hasExtras && (
                                                <span className="absolute top-2 right-2 bg-primary/10 text-primary rounded-full p-0.5 z-10" title="Extras Available">
                                                    <Tag size={10} />
                                                </span>
                                            )}
                                            <div className="w-full aspect-square rounded-lg bg-secondary overflow-hidden">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl">🥪</div>
                                                )}
                                            </div>
                                            <h4 className="font-bold text-sm text-foreground leading-tight line-clamp-2">{item.name}</h4>
                                            <span className="text-primary font-bold text-sm">ETB {Number(item.base_price).toFixed(2)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right: Current Order / Cart ── */}
                <div className="flex-1 flex flex-col bg-card border border-border rounded-2xl shadow-sm overflow-hidden max-w-xs shrink-0">
                    <div className="p-3 bg-secondary/50 border-b border-border flex items-center justify-between">
                        <h3 className="font-bold text-base flex items-center gap-2">
                            <ShoppingCart size={17} className="text-primary" /> Current Order
                        </h3>
                        {cart.length > 0 && (
                            <button onClick={() => setCart([])} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Clear</button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40 gap-2">
                                <ShoppingCart size={44} />
                                <p className="text-sm">No items yet</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.cartKey} className="bg-background border border-border p-2.5 rounded-lg">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-foreground truncate">{item.name}</p>
                                            {item.extras.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {item.extras.map(ex => (
                                                        <span key={ex.id} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                                            +{ex.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => removeFromCart(item.cartKey)} className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-1.5 bg-secondary rounded-md p-0.5">
                                            <button onClick={() => handleUpdateQuantity(item.cartKey, -1)} className="p-1 hover:text-destructive text-muted-foreground"><Minus size={12} /></button>
                                            <span className="w-4 text-center text-sm font-bold">{item.quantity}</span>
                                            <button onClick={() => handleUpdateQuantity(item.cartKey, 1)} className="p-1 hover:text-primary text-muted-foreground"><Plus size={12} /></button>
                                        </div>
                                        <span className="text-sm font-bold text-primary">ETB {item.lineTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Cart Footer */}
                    <div className="p-3 border-t border-border space-y-3 bg-background overflow-y-auto max-h-[420px] hide-scrollbar">
                        <div className="flex justify-between items-center bg-secondary/50 p-2.5 rounded-lg border border-border/60">
                            <span className="text-sm font-bold text-muted-foreground">Total</span>
                            <span className="text-lg font-bold text-primary">ETB {cartTotal.toFixed(2)}</span>
                        </div>

                        {/* Order Source */}
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Order Source</label>
                            <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-3">
                                <button
                                    onClick={() => setOrderSource('walkin')}
                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${orderSource === 'walkin' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-card'}`}
                                >
                                    Walk-in
                                </button>
                                <button
                                    onClick={() => setOrderSource('apartment')}
                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${orderSource === 'apartment' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-card'}`}
                                >
                                    Apartment
                                </button>
                                <button
                                    onClick={() => setOrderSource('delivery')}
                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 ${orderSource === 'delivery' ? 'bg-orange-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-card'}`}
                                >
                                    <Truck size={10} /> Delivery
                                </button>
                            </div>

                            {/* Apartment sub-options */}
                            {orderSource === 'apartment' && (
                                <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-3">
                                    <button
                                        onClick={() => setDeliveryMethod('room')}
                                        className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase transition-all ${deliveryMethod === 'room' ? 'bg-card text-primary shadow-sm border border-primary/20' : 'text-muted-foreground'}`}
                                    >
                                        Room
                                    </button>
                                    <button
                                        onClick={() => setDeliveryMethod('pickup')}
                                        className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase transition-all ${deliveryMethod === 'pickup' ? 'bg-card text-primary shadow-sm border border-primary/20' : 'text-muted-foreground'}`}
                                    >
                                        Pickup
                                    </button>
                                </div>
                            )}

                            {/* Delivery company selector */}
                            {orderSource === 'delivery' && (
                                <div className="mb-3">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">
                                        <Truck size={10} className="inline mr-1" />
                                        Delivery Company
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {DELIVERY_COMPANIES.map(company => (
                                            <button
                                                key={company}
                                                onClick={() => setDeliveryCompany(company)}
                                                className={`py-2 px-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border text-left ${deliveryCompany === company
                                                    ? 'bg-orange-500/10 border-orange-500/60 text-orange-600 dark:text-orange-400'
                                                    : 'border-border text-muted-foreground hover:bg-secondary'
                                                    }`}
                                            >
                                                {company}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">
                                {orderSource === 'walkin' ? 'Table Number' : orderSource === 'apartment' ? 'Room Number' : 'Order Reference (optional)'}
                            </label>
                            <input
                                type="text"
                                value={tableNumber}
                                onChange={e => setTableNumber(e.target.value)}
                                placeholder={orderSource === 'walkin' ? 'e.g. Table 5' : orderSource === 'apartment' ? 'e.g. 402' : 'e.g. Order #1234'}
                                className="w-full p-2.5 rounded-lg border border-border bg-card focus:ring-2 focus:ring-primary outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Staff / Waiter</label>
                            <select
                                value={selectedStaff}
                                onChange={e => setSelectedStaff(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-border bg-card focus:ring-2 focus:ring-primary outline-none text-sm appearance-none cursor-pointer"
                            >
                                <option value="">Select Staff...</option>
                                {staffList.map(s => (
                                    <option key={s.name} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleSubmitOrder}
                            disabled={cart.length === 0 || submitting || success}
                            className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${success
                                ? 'bg-green-500 text-white'
                                : (cart.length === 0 || submitting)
                                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-primary/20 hover:-translate-y-0.5'
                                }`}
                        >
                            {success ? <><CheckCircle2 size={18} /> Order Sent!</> : submitting ? 'Sending...' : 'Submit Order'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Extras Selection Modal ── */}
            {extrasModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setExtrasModal(null)} />
                    <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-5 z-10">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-foreground">{extrasModal.item.name}</h3>
                                <p className="text-sm text-muted-foreground">Select optional extras / add-ons</p>
                            </div>
                            <button onClick={() => setExtrasModal(null)} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground"><X size={18} /></button>
                        </div>

                        <div className="space-y-2 mb-5">
                            {extrasModal.availableExtras.map(extra => {
                                const isSelected = !!selectedExtras.find(e => e.id === extra.id);
                                return (
                                    <button
                                        key={extra.id}
                                        onClick={() => toggleExtra(extra)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${isSelected
                                            ? 'border-primary bg-primary/5 text-foreground'
                                            : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                                                {isSelected && <span className="text-white text-[10px] font-black">✓</span>}
                                            </div>
                                            <span className="font-medium text-sm">{extra.name}</span>
                                        </div>
                                        <span className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {extra.price > 0 ? `+ETB ${extra.price.toFixed(2)}` : 'Free'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => { addToCart(extrasModal.item, []); setExtrasModal(null); }}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border transition-colors"
                            >
                                Add Plain
                            </button>
                            <button
                                onClick={confirmExtrasAndAdd}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                            >
                                <Plus size={15} />
                                {selectedExtras.length > 0 ? `Add with ${selectedExtras.length} extra${selectedExtras.length > 1 ? 's' : ''}` : 'Add to Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}` }} />
        </div>
    );
};

export default AdminPOS;
