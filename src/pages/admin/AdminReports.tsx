import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Search, TrendingUp, DollarSign, Package } from 'lucide-react';

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

        if (startDate) {
            query = query.gte('created_at', `${startDate}T00:00:00`);
        }
        if (endDate) {
            query = query.lte('created_at', `${endDate}T23:59:59`);
        }

        const { data } = await query;
        if (data) setOrders(data);
        setLoading(false);
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.table_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSource = sourceFilter === 'all' || o.source === sourceFilter;
        return matchesSearch && matchesSource;
    });

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalOrders = filteredOrders.length;

    const handleDownloadPDF = () => {
        window.print();
    };

    return (
        <div className="space-y-6 pb-12">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Sales & Activity Reports</h1>
                    <p className="text-muted-foreground text-sm">Analyze your business performance and logs.</p>
                </div>
                <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold shadow-md hover:bg-primary/90 transition-all active:scale-95"
                >
                    <Download size={18} /> Export PDF
                </button>
            </div>

            {/* Filters */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Search Table/Order ID</label>
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
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-secondary/30 border border-border px-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-secondary/30 border border-border px-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Source</label>
                        <select
                            value={sourceFilter}
                            onChange={e => setSourceFilter(e.target.value)}
                            className="bg-secondary/30 border border-border px-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                        >
                            <option value="all">All Sources</option>
                            <option value="pos">POS (Manual)</option>
                            <option value="walkin">Walk-in</option>
                            <option value="apartment">Apartment</option>
                        </select>
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

            {/* Reports Table */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden overflow-x-auto print-visible">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-secondary/50 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Date & Time</th>
                            <th className="px-6 py-4">Order ID</th>
                            <th className="px-6 py-4">Location</th>
                            <th className="px-6 py-4">Staff/Waiter</th>
                            <th className="px-6 py-4">Items</th>
                            <th className="px-6 py-4">Source</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-12 animate-pulse text-muted-foreground">Generating report...</td></tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No records found for this period.</td></tr>
                        ) : filteredOrders.map(order => (
                            <tr key={order.id} className="hover:bg-secondary/20 transition-colors">
                                <td className="px-6 py-4 text-xs font-medium whitespace-nowrap">
                                    {new Date(order.created_at).toLocaleDateString()} <br />
                                    <span className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleTimeString()}</span>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold font-mono">#{order.id.substring(0, 8)}</td>
                                <td className="px-6 py-4 text-xs font-bold">
                                    {order.source === 'apartment' ? '🏠' : '🪑'} {order.table_number}
                                </td>
                                <td className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider italic">
                                    {order.staff_name || 'Admin'}
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    <div className="space-y-1">
                                        {order.order_items?.map((oi, i) => (
                                            <div key={i} className="flex flex-col">
                                                <span>{oi.quantity}x {oi.menu_items?.name}</span>
                                                {oi.extras_snapshot && (
                                                    <span className="text-[9px] text-muted-foreground italic">
                                                        +{JSON.parse(oi.extras_snapshot).map((ex: any) => ex.name).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{order.source}</td>
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

            {/* Sales Summary (Itemized) - Only visible when printing or at bottom */}
            <div className="mt-12 bg-card border border-border rounded-2xl p-6 shadow-sm print-visible">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
                    <Package size={22} className="text-primary" /> Itemized Sales Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(
                        filteredOrders.flatMap(o => o.order_items).reduce((acc: any, item) => {
                            const name = item.menu_items?.name || 'Unknown';
                            acc[name] = (acc[name] || 0) + item.quantity;
                            return acc;
                        }, {})
                    ).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([name, qty]) => (
                        <div key={name} className="flex justify-between items-center p-3 rounded-xl bg-secondary/30 border border-border/50">
                            <span className="font-bold text-sm">{name}</span>
                            <span className="bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full text-xs font-black">{qty as number} units</span>
                        </div>
                    ))}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: landscape; margin: 0.5in; }
                    /* Fix dashboard clipping */
                    html, body, #root, .h-screen, main { height: auto !important; overflow: visible !important; position: static !important; }
                    aside, .no-print, button, #theme-toggle, .shadow-sm, .fixed, .sticky { display: none !important; }
                    
                    body { background: white !important; color: black !important; font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 0; }
                    .space-y-6 { margin: 0 !important; }
                    main { padding: 0 !important; margin: 0 !important; width: 100% !important; display: block !important; overflow: visible !important; }
                    
                    /* Force Header Visibility */
                    .print-header { display: block !important; visibility: visible !important; opacity: 1 !important; margin-bottom: 2rem !important; border-bottom: 2px solid #2EA066 !important; padding-bottom: 1rem !important; }
                    
                    .bg-card, .bg-secondary/30, .bg-secondary/50 { 
                        background: white !important; 
                        border: 1px solid #ddd !important; 
                        display: block !important; 
                        opacity: 1 !important; 
                        visibility: visible !important; 
                        border-radius: 8px !important;
                        box-shadow: none !important;
                        overflow: visible !important;
                        page-break-inside: avoid;
                    }
                    .print-visible { display: block !important; visibility: visible !important; }
                    table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #ddd !important; table-layout: auto !important; page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    th { background: #f5f5f5 !important; border: 1px solid #ddd !important; padding: 6px !important; color: black !important; font-size: 7.5pt !important; text-transform: uppercase; }
                    td { border: 1px solid #eee !important; padding: 6px !important; font-size: 7pt !important; color: black !important; vertical-align: top; word-break: break-word !important; }
                    .text-primary { color: #2EA066 !important; }
                    .mt-12 { margin-top: 20px !important; }
                    .grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
                    .grid > div { page-break-inside: avoid; border: 1px solid #eee !important; padding: 8px !important; }
                }
            `}} />
        </div>
    );
};

export default AdminReports;
