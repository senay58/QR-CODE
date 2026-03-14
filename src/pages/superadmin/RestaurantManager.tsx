import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit2, Trash2, Globe, X, Check } from 'lucide-react';

const RestaurantManager = () => {
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRest, setEditingRest] = useState<any>(null);
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchRestaurants();
    }, []);

    const fetchRestaurants = async () => {
        setLoading(true);
        const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
        if (data) setRestaurants(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!name || !slug) return;
        setSaving(true);
        const payload = { name, slug: slug.toLowerCase().replace(/\s+/g, '-') };
        
        let res;
        if (editingRest) {
            res = await supabase.from('restaurants').update(payload).eq('id', editingRest.id);
        } else {
            res = await supabase.from('restaurants').insert([payload]);
        }

        if (!res.error) {
            setIsModalOpen(false);
            setEditingRest(null);
            setName('');
            setSlug('');
            fetchRestaurants();
        } else {
            alert(res.error.message);
        }
        setSaving(true); // Wait, this should be false
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Delete this restaurant? This will remove ALL associated data including menu items and orders!')) {
            await supabase.from('restaurants').delete().eq('id', id);
            fetchRestaurants();
        }
    };

    const filtered = restaurants.filter(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-2">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">Partner <span className="text-primary">Ecosystem</span></h2>
                    <p className="text-muted-foreground text-sm font-medium">Manage all child restaurants and cafes on the Ironplate platform.</p>
                </div>
                <button 
                    onClick={() => { setEditingRest(null); setName(''); setSlug(''); setIsModalOpen(true); }}
                    className="bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                >
                    <Plus size={18} /> Add Restaurant
                </button>
            </header>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name or slug..." 
                    className="w-full bg-card/40 backdrop-blur-md border border-border/50 pl-10 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-48 bg-card/20 rounded-[2rem] border border-border/30 animate-pulse" />)
                ) : filtered.map(rest => (
                    <div key={rest.id} className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] p-6 shadow-sm group hover:border-primary/30 transition-all hover:shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black text-xl uppercase tracking-tighter shadow-inner">
                                {rest.name[0]}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingRest(rest); setName(rest.name); setSlug(rest.slug); setIsModalOpen(true); }} className="p-2 text-muted-foreground hover:bg-secondary rounded-xl transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(rest.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"><Trash2 size={16} /></button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-black text-foreground">{rest.name}</h3>
                            <div className="flex items-center gap-2 text-muted-foreground mt-1 text-xs font-bold uppercase tracking-wider">
                                <Globe size={12} />
                                ironplate.app/r/{rest.slug}
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-border/30 grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status</span>
                                <span className="flex items-center gap-1.5 text-xs font-bold text-green-500 mt-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Created</span>
                                <span className="text-xs font-bold text-foreground mt-1">{new Date(rest.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-card border border-border/50 rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black tracking-tight text-foreground uppercase">{editingRest ? 'Modify' : 'Onboard'} <span className="text-primary italic">Child</span></h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-secondary rounded-full transition-colors"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1.5 block">Restaurant Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Sandwich House"
                                    className="w-full bg-background border border-border pl-4 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1.5 block">URL Slug (Unique ID)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold opacity-50 italic">/r/</span>
                                    <input 
                                        type="text" 
                                        value={slug}
                                        onChange={e => setSlug(e.target.value)}
                                        placeholder="sandwich-house"
                                        className="w-full bg-background border border-border pl-10 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2 px-1">Lowercase, no spaces. This becomes the scan destination.</p>
                            </div>

                            <div className="pt-6">
                                <button 
                                    onClick={handleSave}
                                    disabled={saving || !name || !slug}
                                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? 'Processing...' : editingRest ? <><Check size={18} /> Update Partner</> : <><Plus size={18} /> Register Partner</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RestaurantManager;
