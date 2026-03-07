import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Check, X, Tag, ChevronDown, ChevronUp } from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface Extra {
    id: string;
    menu_item_id: string;
    name: string;
    price: number;
}

// ── Helpers ────────────────────────────────────────────
const inputCls = 'w-full bg-background border border-border p-2 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none';
const labelCls = 'text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block';
const saveBtnCls = 'flex-1 bg-primary text-primary-foreground py-2 font-bold rounded-lg flex justify-center items-center gap-2 text-sm hover:bg-primary/90 transition-colors';
const cancelBtnCls = 'p-2 bg-secondary text-muted-foreground rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors';

const AdminMenu = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [extras, setExtras] = useState<Extra[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'categories' | 'items' | 'extras'>('categories');
    const [error, setError] = useState('');

    // ── Category form ──
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [catName, setCatName] = useState('');
    const [catSaving, setCatSaving] = useState(false);

    // ── Item form ──
    const [editingItem, setEditingItem] = useState<any>(null);
    const [itemName, setItemName] = useState('');
    const [itemDesc, setItemDesc] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [itemCat, setItemCat] = useState('');
    const [itemImg, setItemImg] = useState('');
    const [itemActive, setItemActive] = useState(true);
    const [itemSaving, setItemSaving] = useState(false);

    // ── Extras form ──
    const [editingExtra, setEditingExtra] = useState<Extra | null>(null);
    const [extraItemId, setExtraItemId] = useState('');
    const [extraName, setExtraName] = useState('');
    const [extraPrice, setExtraPrice] = useState('');
    const [extraSaving, setExtraSaving] = useState(false);



    // ── Image Upload ──
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // ── Expanded extras per item in items tab ──
    const [expandedItemExtras, setExpandedItemExtras] = useState<string | null>(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const [catsRes, itemsRes, extrasRes] = await Promise.all([
            supabase.from('categories').select('*').order('sort_order', { ascending: true }),
            supabase.from('menu_items').select('*').order('name', { ascending: true }),
            supabase.from('extras').select('*').order('name', { ascending: true }),
        ]);
        if (catsRes.data) setCategories(catsRes.data);
        if (itemsRes.data) setItems(itemsRes.data);
        if (extrasRes.data) setExtras(extrasRes.data);
        setLoading(false);
    };

    // ── Category CRUD ──────────────────────────────────
    const handleSaveCategory = async () => {
        if (!catName.trim()) return;
        setCatSaving(true);
        setError('');

        const slug = catName.trim().toLowerCase().replace(/\s+/g, '-');
        let res;
        if (editingCategory) {
            res = await supabase.from('categories').update({ name: catName.trim(), slug }).eq('id', editingCategory.id);
        } else {
            // Try without slug first in case the column doesn't exist
            res = await supabase.from('categories').insert([{
                name: catName.trim(),
                slug,
                sort_order: categories.length,
            }]);
            // If it fails due to slug column missing, try without it
            if (res.error && res.error.message?.includes('slug')) {
                res = await supabase.from('categories').insert([{
                    name: catName.trim(),
                    sort_order: categories.length,
                }]);
            }
        }

        if (res.error) {
            setError(res.error.message);
        } else {
            setCatName('');
            setEditingCategory(null);
            fetchData();
        }
        setCatSaving(false);
    };

    const handleDeleteCategory = async (id: string) => {
        if (!window.confirm('Delete this category? Items linked to it may break.')) return;
        await supabase.from('categories').delete().eq('id', id);
        fetchData();
    };

    // ── Item CRUD ──────────────────────────────────────
    const handleSaveItem = async () => {
        if (!itemName.trim() || !itemPrice || !itemCat) {
            setError('Name, Category and Price are required.');
            return;
        }
        setItemSaving(true);
        setError('');

        const payload = {
            name: itemName.trim(),
            description: itemDesc.trim(),
            base_price: parseFloat(itemPrice),
            category_id: itemCat,
            image_url: itemImg.trim() || null,
            is_active: itemActive,
        };

        const res = editingItem
            ? await supabase.from('menu_items').update(payload).eq('id', editingItem.id)
            : await supabase.from('menu_items').insert([payload]);

        if (res.error) {
            setError(res.error.message);
        } else {
            setItemName(''); setItemDesc(''); setItemPrice(''); setItemCat(''); setItemImg('');
            setItemActive(true);
            setEditingItem(null);
            fetchData();
        }
        setItemSaving(false);
    };

    const handleImageUpload = async (file: File) => {
        if (!file) return;
        setUploading(true);
        setError('');

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `menu/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('menu-images')
                .getPublicUrl(filePath);

            setItemImg(publicUrl);
        } catch (err: any) {
            setError('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const onDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageUpload(e.dataTransfer.files[0]);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!window.confirm('Delete this menu item?')) return;
        await supabase.from('menu_items').delete().eq('id', id);
        fetchData();
    };

    // ── Extras CRUD ────────────────────────────────────
    const handleSaveExtra = async () => {
        if (!extraName.trim() || !extraItemId || !extraPrice) {
            setError('Extra needs a name, linked item, and price.');
            return;
        }
        setExtraSaving(true);
        setError('');

        const payload = {
            menu_item_id: extraItemId,
            name: extraName.trim(),
            price: parseFloat(extraPrice),
        };

        const res = editingExtra
            ? await supabase.from('extras').update(payload).eq('id', editingExtra.id)
            : await supabase.from('extras').insert([payload]);

        if (res.error) {
            setError(res.error.message);
        } else {
            setExtraName(''); setExtraPrice(''); setExtraItemId('');
            setEditingExtra(null);
            fetchData();
        }
        setExtraSaving(false);
    };

    const handleDeleteExtra = async (id: string) => {
        if (!window.confirm('Delete this extra option?')) return;
        await supabase.from('extras').delete().eq('id', id);
        fetchData();
    };

    const triggerEditExtra = (extra: Extra) => {
        setEditingExtra(extra);
        setExtraItemId(extra.menu_item_id);
        setExtraName(extra.name);
        setExtraPrice(extra.price.toString());
        setActiveTab('extras');
    };

    const extrasForItem = (itemId: string) => extras.filter(e => e.menu_item_id === itemId);

    return (
        <div className="pb-20">
            {/* Header */}
            <header className="mb-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Menu Editor Interface</h2>
                    <p className="text-muted-foreground text-sm">Manage Sandwich House offerings directly via the database.</p>
                </div>
                <div className="flex bg-secondary p-1 rounded-lg self-start sm:self-auto items-center gap-1">
                    {(['categories', 'items', 'extras'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setError(''); }}
                            className={`px-3 py-2 rounded-md font-medium text-sm transition-all capitalize ${activeTab === tab ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {tab === 'extras' ? '+ Extras' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}

                </div>
            </header>

            {/* Error banner */}
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError('')}><X size={14} /></button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-muted-foreground animate-pulse">Loading Menu Data...</div>
            ) : activeTab === 'categories' ? (
                // ── CATEGORIES TAB ──
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 bg-card border border-border rounded-xl p-4 shadow-sm h-fit">
                        <h3 className="font-bold text-base mb-4 text-foreground">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
                        <div className="space-y-3">
                            <div>
                                <label className={labelCls}>Name</label>
                                <input
                                    value={catName}
                                    onChange={e => setCatName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveCategory()}
                                    type="text"
                                    className={inputCls}
                                    placeholder="e.g. Salads"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSaveCategory} disabled={catSaving} className={saveBtnCls}>
                                    <Check size={15} /> {catSaving ? 'Saving...' : (editingCategory ? 'Update' : 'Add Category')}
                                </button>
                                {editingCategory && (
                                    <button onClick={() => { setEditingCategory(null); setCatName(''); }} className={cancelBtnCls}>
                                        <X size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-3">
                        {categories.length === 0 && <p className="text-muted-foreground text-sm py-6 text-center">No categories yet. Add one!</p>}
                        {categories.map(cat => (
                            <div key={cat.id} className="bg-card border border-border p-4 rounded-xl flex justify-between items-center shadow-sm hover:border-primary/30 transition-colors">
                                <div>
                                    <h4 className="font-bold text-foreground">{cat.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {items.filter(i => i.category_id === cat.id).length} items
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingCategory(cat); setCatName(cat.name); setError(''); }} className="p-2 bg-secondary text-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"><Edit2 size={15} /></button>
                                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"><Trash2 size={15} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            ) : activeTab === 'items' ? (
                // ── ITEMS TAB ──
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 bg-card border border-border rounded-xl p-4 shadow-sm h-fit">
                        <h3 className="font-bold text-base mb-4 text-foreground">{editingItem ? 'Edit Item' : 'New Item'}</h3>
                        <div className="space-y-3">
                            <div>
                                <label className={labelCls}>Name</label>
                                <input value={itemName} onChange={e => setItemName(e.target.value)} type="text" className={inputCls} placeholder="e.g. Club Sandwich" />
                            </div>
                            <div>
                                <label className={labelCls}>Category</label>
                                <select value={itemCat} onChange={e => setItemCat(e.target.value)} className={inputCls}>
                                    <option value="">Select a category...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Base Price (ETB)</label>
                                <input value={itemPrice} onChange={e => setItemPrice(e.target.value)} type="number" step="0.01" className={inputCls} placeholder="0.00" />
                            </div>
                            <div>
                                <label className={labelCls}>Description</label>
                                <textarea value={itemDesc} onChange={e => setItemDesc(e.target.value)} rows={2} className={inputCls} placeholder="Brief description..." />
                            </div>
                            <div>
                                <label className={labelCls}>Image</label>
                                <div
                                    onDragEnter={onDrag}
                                    onDragLeave={onDrag}
                                    onDragOver={onDrag}
                                    onDrop={onDrop}
                                    className={`relative border-2 border-dashed rounded-xl p-4 transition-all flex flex-col items-center justify-center text-center gap-2 ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-secondary/20'} ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    {itemImg ? (
                                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
                                            <img src={itemImg} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setItemImg('')}
                                                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                                                <Plus size={20} />
                                            </div>
                                            <div className="text-xs">
                                                <p className="font-bold text-foreground">Drag & drop here</p>
                                                <p className="text-muted-foreground">or click to browse</p>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                        </>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-[1px]">
                                            <div className="flex items-center gap-2 text-xs font-bold text-primary animate-pulse">
                                                <span>Uploading...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <input
                                    value={itemImg}
                                    onChange={e => setItemImg(e.target.value)}
                                    type="text"
                                    className={inputCls + " mt-2"}
                                    placeholder="Or paste URL here..."
                                />
                            </div>
                            <div className="flex gap-2 pt-1 border-t border-border mt-2 pt-4">
                                <button onClick={handleSaveItem} disabled={itemSaving} className={saveBtnCls}>
                                    <Check size={15} /> {itemSaving ? 'Saving...' : (editingItem ? 'Update Item' : 'Add Item')}
                                </button>
                                {editingItem && (
                                    <button onClick={() => { setEditingItem(null); setItemName(''); setItemDesc(''); setItemPrice(''); setItemCat(''); setItemImg(''); }} className={cancelBtnCls}>
                                        <X size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-3 max-h-[650px] overflow-y-auto pr-1 hide-scrollbar">
                        {items.length === 0 && <p className="text-muted-foreground text-sm py-6 text-center">No items yet. Add one!</p>}
                        {items.map(item => {
                            const itemExtras = extrasForItem(item.id);
                            const isExpanded = expandedItemExtras === item.id;
                            return (
                                <div key={item.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden hover:border-primary/30 transition-colors">
                                    <div className="p-3 flex gap-3">
                                        <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden shrink-0 flex items-center justify-center text-lg">
                                            {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : '🥪'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex items-center gap-2 truncate">
                                                    <h4 className="font-bold text-foreground text-sm truncate">{item.name}</h4>
                                                    {item.is_active === false && (
                                                        <span className="text-[8px] bg-secondary text-muted-foreground px-1 rounded font-bold uppercase tracking-tighter border border-border">Hidden</span>
                                                    )}
                                                </div>
                                                <span className="font-bold text-primary text-sm shrink-0">ETB {Number(item.base_price).toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center justify-between mt-1 gap-2 flex-wrap">
                                                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded border border-border">
                                                    {categories.find(c => c.id === item.category_id)?.name || 'Unknown'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            const newStatus = item.is_active === false;
                                                            await supabase.from('menu_items').update({ is_active: newStatus }).eq('id', item.id);
                                                            fetchData();
                                                        }}
                                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${item.is_active !== false ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                        title={item.is_active !== false ? 'Deactivate Item' : 'Activate Item'}
                                                    >
                                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${item.is_active !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                    <button
                                                        onClick={() => setExpandedItemExtras(isExpanded ? null : item.id)}
                                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-secondary px-2 py-1 rounded transition-colors"
                                                    >
                                                        <Tag size={11} /> {itemExtras.length} extras {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                                    </button>
                                                    <button onClick={() => {
                                                        setEditingItem(item);
                                                        setItemName(item.name);
                                                        setItemDesc(item.description || '');
                                                        setItemPrice(item.base_price.toString());
                                                        setItemCat(item.category_id);
                                                        setItemImg(item.image_url || '');
                                                        setItemActive(item.is_active !== false);
                                                        window.scrollTo(0, 0);
                                                    }} className="p-1.5 bg-secondary text-foreground hover:bg-primary/10 hover:text-primary rounded-md transition-colors"><Edit2 size={13} /></button>
                                                    <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"><Trash2 size={13} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inline Extras section */}
                                    {isExpanded && (
                                        <div className="border-t border-border bg-secondary/30 p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Extras / Add-ons</span>
                                                <button
                                                    onClick={() => { setExtraItemId(item.id); setExtraName(''); setExtraPrice(''); setEditingExtra(null); setActiveTab('extras'); }}
                                                    className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
                                                >
                                                    <Plus size={12} /> Add Extra
                                                </button>
                                            </div>
                                            {itemExtras.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic">No extras defined.</p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {itemExtras.map(ex => (
                                                        <div key={ex.id} className="flex justify-between items-center text-sm bg-background rounded-lg px-3 py-1.5 border border-border">
                                                            <span className="font-medium text-foreground">{ex.name}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-primary font-bold text-xs">+ETB {Number(ex.price).toFixed(2)}</span>
                                                                <button onClick={() => triggerEditExtra(ex)} className="text-muted-foreground hover:text-primary"><Edit2 size={12} /></button>
                                                                <button onClick={() => handleDeleteExtra(ex.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            ) : (
                // ── EXTRAS TAB ──
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 bg-card border border-border rounded-xl p-4 shadow-sm h-fit">
                        <h3 className="font-bold text-base mb-4 text-foreground">{editingExtra ? 'Edit Extra' : 'New Extra / Add-on'}</h3>
                        <div className="space-y-3">
                            <div>
                                <label className={labelCls}>Linked Menu Item</label>
                                <select value={extraItemId} onChange={e => setExtraItemId(e.target.value)} className={inputCls}>
                                    <option value="">Select an item...</option>
                                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Extra Name</label>
                                <input value={extraName} onChange={e => setExtraName(e.target.value)} type="text" className={inputCls} placeholder="e.g. Extra Cheese, No Onion" />
                            </div>
                            <div>
                                <label className={labelCls}>Added Price (ETB)</label>
                                <input value={extraPrice} onChange={e => setExtraPrice(e.target.value)} type="number" step="0.01" className={inputCls} placeholder="0.00 for free" />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button onClick={handleSaveExtra} disabled={extraSaving} className={saveBtnCls}>
                                    <Check size={15} /> {extraSaving ? 'Saving...' : (editingExtra ? 'Update Extra' : 'Add Extra')}
                                </button>
                                {editingExtra && (
                                    <button onClick={() => { setEditingExtra(null); setExtraName(''); setExtraPrice(''); setExtraItemId(''); }} className={cancelBtnCls}>
                                        <X size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-4 max-h-[650px] overflow-y-auto pr-1 hide-scrollbar">
                        {items.length === 0 && <p className="text-muted-foreground text-sm py-6 text-center">No items yet — add menu items first.</p>}
                        {items.map(item => {
                            const itemExtras = extrasForItem(item.id);
                            if (itemExtras.length === 0) return null;
                            return (
                                <div key={item.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                                    <div className="p-3 border-b border-border flex items-center gap-2 bg-secondary/30">
                                        <span className="font-bold text-foreground text-sm">{item.name}</span>
                                        <span className="text-xs text-muted-foreground">({itemExtras.length} extras)</span>
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {itemExtras.map(ex => (
                                            <div key={ex.id} className="flex justify-between items-center bg-background rounded-lg px-3 py-2 border border-border">
                                                <span className="font-medium text-sm text-foreground">{ex.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-primary font-bold text-sm">+ETB {Number(ex.price).toFixed(2)}</span>
                                                    <button onClick={() => triggerEditExtra(ex)} className="p-1 text-muted-foreground hover:text-primary transition-colors"><Edit2 size={14} /></button>
                                                    <button onClick={() => handleDeleteExtra(ex.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {extras.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <Tag size={40} className="mx-auto mb-3 opacity-20" />
                                <p className="text-sm">No extras defined yet.</p>
                                <p className="text-xs mt-1">Use the form to add extras to any menu item.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}` }} />
        </div>
    );
};

export default AdminMenu;
