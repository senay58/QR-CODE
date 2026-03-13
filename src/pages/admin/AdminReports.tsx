import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Search, TrendingUp, DollarSign, Package, RotateCcw, Trash2, AlertTriangle, X } from 'lucide-react';

interface ReportOrder {
    id: string;
    table_number: string;
    status: string;
    total_amount: number;
    source: string;
    staff_name?: string;
    created_at: string;
    order_items: {
        quantity: number;
        item_price: number;
        extras_snapshot: string;
        menu_items: { name: string } | null;
    }[];
}

const AdminReports = () => {
    const [orders, setOrders] = useState<ReportOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');

    // Delete state
    const [deletingFiltered, setDeletingFiltered] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [resetMostOrdered, setResetMostOrdered] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [actionMsg, setActionMsg] = useState('');

    useEffect(() => {
        fetchReports();
    }, [startDate, endDate]);

    const fetchReports = async () => {
        setLoading(true);
        let query = supabase
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
            .order('created_at', { ascending: false });

        if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`);
        if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);

        const { data } = await query;
        if (data) setOrders(data);
        setLoading(false);
    };

    const handleResetFilters = () => {
        setStartDate('');
        setEndDate('');
        setSearchQuery('');
        setSourceFilter('all');
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.table_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSource = sourceFilter === 'all' || o.source === sourceFilter;
        return matchesSearch && matchesSource;
    });

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalOrders = filteredOrders.length;

    // ── Delivery Breakdown ──
    const deliveryStats = [
        { name: 'BEU DELIVERY', count: filteredOrders.filter(o => o.table_number.toUpperCase().includes('BEU DELIVERY') && o.source === 'delivery').length, className: 'text-orange-600 bg-orange-500/10 border-orange-500/20' },
        { name: 'Deliver Addis', count: filteredOrders.filter(o => o.table_number.toUpperCase().includes('DELIVER ADDIS') && o.source === 'delivery').length, className: 'text-red-600 bg-red-500/10 border-red-500/20' },
        { name: 'Z-Mall', count: filteredOrders.filter(o => o.table_number.toUpperCase().includes('Z-MALL') && o.source === 'delivery').length, className: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
        { name: 'Klik', count: filteredOrders.filter(o => o.table_number.toUpperCase().includes('KLIK') && o.source === 'delivery').length, className: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20' }
    ];
    const totalDeliveries = deliveryStats.reduce((sum, s) => sum + s.count, 0);

    // ── Delete filtered orders ──
    const handleDeleteFiltered = async () => {
        if (!confirmDelete) { setConfirmDelete(true); return; }
        setDeletingFiltered(true);
        setConfirmDelete(false);
        const ids = filteredOrders.map(o => o.id);
        const { error } = await supabase.from('orders').delete().in('id', ids);
        if (error) {
            setActionMsg('Error deleting orders: ' + error.message);
        } else {
            setActionMsg(`✅ Deleted ${ids.length} orders`);
            fetchReports();
        }
        setDeletingFiltered(false);
        setTimeout(() => setActionMsg(''), 4000);
    };

    // ── Reset most-ordered stats (deletes all order_items tracking) ──
    // This means clearing completed orders so the "itemized sales" count resets
    const handleResetMostOrdered = async () => {
        if (!confirmReset) { setConfirmReset(true); return; }
        setResetMostOrdered(true);
        setConfirmReset(false);
        // Archive by marking completed orders as 'archived' (or delete them)
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('status', 'completed');
        if (error) {
            setActionMsg('Error resetting: ' + error.message);
        } else {
            setActionMsg('✅ Most-ordered stats reset (completed orders cleared)');
            fetchReports();
        }
        setResetMostOrdered(false);
        setTimeout(() => setActionMsg(''), 5000);
    };

    const hasFilters = startDate || endDate || searchQuery || sourceFilter !== 'all';

    return (
        <div className="space-y-6 pb-12">

            {/* Action message banner */}
            {actionMsg && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-bold flex items-center justify-between">
                    <span>{actionMsg}</span>
                    <button onClick={() => setActionMsg('')}><X size={14} /></button>
                </div>
            )}

            {/* Confirm delete banner */}
            {confirmDelete && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold text-destructive text-sm">Delete {filteredOrders.length} filtered orders permanently?</p>
                        <p className="text-xs text-muted-foreground mt-0.5">This cannot be undone. These order records will be gone.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-bold">Cancel</button>
                        <button onClick={handleDeleteFiltered} className="px-3 py-1.5 bg-destructive text-white rounded-lg text-xs font-bold">Yes, Delete</button>
                    </div>
                </div>
            )}

            {/* Confirm reset banner */}
            {confirmReset && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <AlertTriangle size={18} className="text-orange-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold text-orange-600 text-sm">Reset most-ordered rankings?</p>
                        <p className="text-xs text-muted-foreground mt-0.5">All <strong>completed</strong> orders will be deleted permanently to zero the counts.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-bold">Cancel</button>
                        <button onClick={handleResetMostOrdered} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold">Yes, Reset</button>
                    </div>
                </div>
            )}

            {/* Formal Header for Print */}
            <div className="hidden print:block print-header mb-8 text-center border-b-2 border-primary pb-6">
                <h1 className="text-4xl font-black tracking-tighter text-primary uppercase">SANDWICH<span className="text-foreground">HOUSE</span></h1>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">Daily Operations & Sales Report</p>
                <div className="mt-4 flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                    <span>Generated: {new Date().toLocaleString()}</span>
                    <span>Period: {startDate || 'All Time'} - {endDate || 'Today'}</span>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Sales & Activity Reports</h1>
                    <p className="text-muted-foreground text-sm">Analyze your business performance and logs.</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold shadow-md hover:bg-primary/90 transition-all active:scale-95"
                >
                    <Download size={18} /> Export PDF
                </button>
            </div>

            {/* Filters */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4 print:hidden">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[180px]">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Search Table / Order ID</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-secondary/30 border border-border pl-10 pr-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                                placeholder="Search..."
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-secondary/30 border border-border px-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">End Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-secondary/30 border border-border px-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Source</label>
                        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="bg-secondary/30 border border-border px-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none">
                            <option value="all">All Sources</option>
                            <option value="pos">POS (Manual)</option>
                            <option value="walkin">Walk-in</option>
                            <option value="apartment">Apartment</option>
                            <option value="delivery">🚚 Delivery</option>
                        </select>
                    </div>

                    {/* Reset / Action buttons */}
                    <div className="flex gap-2 items-end flex-wrap">
                        {hasFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all font-bold"
                                title="Clear all filters"
                            >
                                <RotateCcw size={14} /> Reset Filters
                            </button>
                        )}
                        {filteredOrders.length > 0 && (
                            <button
                                onClick={handleDeleteFiltered}
                                disabled={deletingFiltered}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-destructive/40 text-destructive text-sm hover:bg-destructive/10 transition-all font-bold"
                                title="Delete all filtered orders"
                            >
                                <Trash2 size={14} /> Delete Filtered ({filteredOrders.length})
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print-visible">
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl">
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-primary uppercase">Revenue</p>
                        <DollarSign size={18} className="text-primary" />
                    </div>
                    <h3 className="text-2xl font-black text-foreground mt-1">ETB {totalRevenue.toLocaleString()}</h3>
                </div>
                <div className="bg-secondary/50 border border-border p-4 rounded-2xl">
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Total Orders</p>
                        <Package size={18} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-black text-foreground mt-1">{totalOrders}</h3>
                </div>
                <div className="bg-secondary/50 border border-border p-4 rounded-2xl">
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Avg. Order</p>
                        <TrendingUp size={18} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-black text-foreground mt-1">ETB {totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : 0}</h3>
                </div>
            </div>

            {/* Delivery Stats Breakdown */}
            {(sourceFilter === 'all' || sourceFilter === 'delivery') && totalDeliveries > 0 && (
                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm print-visible">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                        <span>🚚</span> Delivery Breakdown <span className="text-xs text-muted-foreground font-normal">({totalDeliveries} total)</span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {deliveryStats.map(stat => (
                            <div key={stat.name} className={`flex items-center justify-between p-3 rounded-xl border ${stat.className}`}>
                                <span className="font-bold text-sm">{stat.name}</span>
                                <span className="text-lg font-black">{stat.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reports Table */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden overflow-x-auto print-visible">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-secondary/50 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Date & Time</th>
                            <th className="px-6 py-4">Order ID</th>
                            <th className="px-6 py-4">Location / Company</th>
                            <th className="px-6 py-4">Staff/Waiter</th>
                            <th className="px-6 py-4 min-w-[200px]">Items</th>
                            <th className="px-6 py-4">Source</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr><td colSpan={8} className="text-center py-12 animate-pulse text-muted-foreground">Generating report...</td></tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No records found for this period.</td></tr>
                        ) : filteredOrders.map(order => (
                            <tr key={order.id} className="hover:bg-secondary/20 transition-colors">
                                <td className="px-6 py-4 text-xs font-medium whitespace-nowrap">
                                    {new Date(order.created_at).toLocaleDateString()} <br />
                                    <span className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleTimeString()}</span>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold font-mono">#{order.id.substring(0, 8)}</td>
                                <td className="px-6 py-4 text-xs font-bold">
                                    {order.source === 'delivery' ? '🚚 ' : order.source === 'apartment' ? '🏠 ' : '🪑 '} 
                                    <span className={
                                        order.source === 'delivery' ? (
                                            order.table_number.toUpperCase().includes('BEU DELIVERY') ? 'text-orange-500' :
                                            order.table_number.toUpperCase().includes('DELIVER ADDIS') ? 'text-red-500' :
                                            order.table_number.toUpperCase().includes('Z-MALL') ? 'text-blue-500' :
                                            order.table_number.toUpperCase().includes('KLIK') ? 'text-yellow-500' : ''
                                        ) : ''
                                    }>{order.table_number}</span>
                                </td>
                                <td className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider italic">
                                    {order.staff_name || 'Admin'}
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    <div className="space-y-1">
                                        {order.order_items?.map((oi, i) => (
                                            <div key={i} className="flex flex-col">
                                                <span>{oi.quantity}x {oi.menu_items?.name}</span>
                                                {oi.extras_snapshot && (() => {
                                                    try {
                                                        const parsed = JSON.parse(oi.extras_snapshot);
                                                        return parsed.length > 0 ? (
                                                            <span className="text-[9px] text-muted-foreground italic">
                                                                +{parsed.map((ex: any) => ex.name).join(', ')}
                                                            </span>
                                                        ) : null;
                                                    } catch { return null; }
                                                })()}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                    <span className={`px-2 py-1 rounded-full ${order.source === 'delivery' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : ''}`}>
                                        {order.source}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-primary whitespace-nowrap">ETB {order.total_amount?.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-secondary text-muted-foreground'
                                        }`}>
                                        {order.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Itemized Sales Summary (Most Ordered) */}
            <div className="mt-6 bg-card border border-border rounded-2xl p-6 shadow-sm print-visible">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                        <Package size={22} className="text-primary" /> Most Ordered Items
                    </h3>
                    <button
                        onClick={handleResetMostOrdered}
                        disabled={resetMostOrdered}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-400/50 text-orange-600 dark:text-orange-400 text-xs font-bold hover:bg-orange-500/10 transition-all"
                        title="Delete all completed orders to reset rankings"
                    >
                        <RotateCcw size={13} className={resetMostOrdered ? 'animate-spin' : ''} />
                        Reset Rankings
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(
                        filteredOrders.flatMap(o => o.order_items).reduce((acc: any, item) => {
                            const name = item.menu_items?.name || 'Unknown';
                            acc[name] = (acc[name] || 0) + item.quantity;
                            return acc;
                        }, {})
                    ).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([name, qty], idx) => (
                        <div key={name} className="flex justify-between items-center p-3 rounded-xl bg-secondary/30 border border-border/50">
                            <div className="flex items-center gap-2">
                                {idx < 3 && (
                                    <span className="text-sm">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                                )}
                                <span className="font-bold text-sm">{name}</span>
                            </div>
                            <span className="bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full text-xs font-black">{qty as number} sold</span>
                        </div>
                    ))}
                    {filteredOrders.flatMap(o => o.order_items).length === 0 && (
                        <p className="text-muted-foreground text-sm col-span-3 text-center py-4">No order data in this period.</p>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: portrait; margin: 0.5in; }
                    html, body, #root, .h-screen, main, .w-full, .max-w-7xl { height: auto !important; overflow: visible !important; position: static !important; max-width: none !important; width: 100% !important; min-width: 100% !important; border: none !important; }
                    aside, .no-print, button, #theme-toggle, .shadow-sm, .fixed, .sticky, nav, header, [role="navigation"], .lg\\:hidden, .print\\:hidden { display: none !important; opacity: 0 !important; visibility: hidden !important; width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; pointer-events: none !important; }
                    body { background: white !important; color: black !important; font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 0 !important; font-size: 8pt; }
                    .space-y-6 > * + * { margin-top: 15px !important; }
                    main { padding: 0 !important; margin: 0 !important; display: block !important; overflow: visible !important; box-shadow: none !important; border: none !important; background: transparent !important; }
                    .print-header { display: block !important; visibility: visible !important; opacity: 1 !important; margin-bottom: 20px !important; border-bottom: 2px solid #2EA066 !important; padding-bottom: 12px !important; text-align: center; }
                    .print-header h1 { font-size: 20pt !important; margin: 0; }
                    .bg-card, .bg-secondary\\/30, .bg-secondary\\/50 { background: white !important; border: 1px solid #ddd !important; display: block !important; opacity: 1 !important; visibility: visible !important; border-radius: 4px !important; box-shadow: none !important; overflow: visible !important; page-break-inside: avoid; margin-bottom: 12px; width: 100% !important; max-width: none !important; padding: 8px !important; }
                    .print-visible { display: block !important; visibility: visible !important; }
                    table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #ddd !important; table-layout: fixed !important; page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    th { background: #f5f5f5 !important; border: 1px solid #ddd !important; padding: 4px !important; color: black !important; font-size: 6.5pt !important; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                    td { border: 1px solid #eee !important; padding: 4px !important; font-size: 6pt !important; color: black !important; vertical-align: top; word-break: break-word !important; overflow: hidden; }
                    
                    th:nth-child(1), td:nth-child(1) { width: 12%; } /* Date & Time */
                    th:nth-child(2), td:nth-child(2) { width: 10%; } /* Order ID */
                    th:nth-child(3), td:nth-child(3) { width: 15%; } /* Location */
                    th:nth-child(4), td:nth-child(4) { width: 10%; } /* Staff */
                    th:nth-child(5), td:nth-child(5) { width: 30%; } /* Items */
                    th:nth-child(6), td:nth-child(6) { width: 8%; }  /* Source */
                    th:nth-child(7), td:nth-child(7) { width: 7%; }  /* Amount */
                    th:nth-child(8), td:nth-child(8) { width: 8%; }  /* Status */
                    .text-primary { color: #2EA066 !important; }
                    .mt-6 { margin-top: 15px !important; }
                    .grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 6px !important; }
                    .grid > div { page-break-inside: avoid; border: 1px solid #eee !important; padding: 6px !important; }
                    /* Force layout reset */
                    .flex, .flex-1, .h-screen { display: block !important; width: 100% !important; max-width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
                }
                `
            }} />
        </div>
    );
};

export default AdminReports;
