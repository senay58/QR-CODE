import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Check, X, Tag, ChevronDown, ChevronUp, GripVertical, Search, FolderTree } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

// ── Sortable Item Component ─────────────────────────────
const SortableItem = ({ item, itemExtras, isExpanded, onExpand, onEdit, onDelete, onStatusChange }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-card border border-border rounded-xl shadow-sm overflow-hidden hover:border-primary/30 transition-colors ${isDragging ? 'shadow-xl border-primary' : ''}`}
        >
            <div className="p-3 flex gap-3 items-center">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="p-1 px-2 text-muted-foreground hover:text-primary cursor-grab active:cursor-grabbing border-r border-border/50"
                >
                    <GripVertical size={18} />
                </div>

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
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onStatusChange(item)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${item.is_active !== false ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
                                title={item.is_active !== false ? 'Deactivate Item' : 'Activate Item'}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${item.is_active !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                            <button
                                onClick={() => onExpand(isExpanded ? null : item.id)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-secondary px-2 py-1 rounded transition-colors"
                            >
                                <Tag size={11} /> {itemExtras.length} extras {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>
                            <button onClick={() => onEdit(item)} className="p-1.5 bg-secondary text-foreground hover:bg-primary/10 hover:text-primary rounded-md transition-colors"><Edit2 size={13} /></button>
                            <button onClick={() => onDelete(item.id)} className="p-1.5 bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"><Trash2 size={13} /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface GlobalExtra {
    id: string;
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
    const [extras, setExtras] = useState<GlobalExtra[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    // Keep track of which main tab (Items, Categories, Extras, Subcategories) is active
    const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'subcategories' | 'extras'>('items');
    const [error, setError] = useState('');

    // ── Category form ──
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [catName, setCatName] = useState('');
    const [catParentId, setCatParentId] = useState('');
    const [catSaving, setCatSaving] = useState(false);

    // ── Item form ──
    const [editingItem, setEditingItem] = useState<any>(null);
    const [itemName, setItemName] = useState('');
    const [itemDesc, setItemDesc] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [itemCat, setItemCat] = useState('');
    const [itemExtraCats, setItemExtraCats] = useState<string[]>([]);
    const [itemAllowedExtras, setItemAllowedExtras] = useState<string[]>([]);
    const [itemFasting, setItemFasting] = useState(false);
    const [itemImg, setItemImg] = useState('');
    const [itemActive, setItemActive] = useState(true);
    const [itemSaving, setItemSaving] = useState(false);

    // ── Extras form ──
    const [editingExtra, setEditingExtra] = useState<GlobalExtra | null>(null);
    const [extraName, setExtraName] = useState('');
    const [extraPrice, setExtraPrice] = useState('');
    const [extraSaving, setExtraSaving] = useState(false);

    // ── Image Upload ──
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const [catsRes, itemsRes, extrasRes] = await Promise.all([
            supabase.from('categories').select('*').order('sort_order', { ascending: true }),
            supabase.from('menu_items').select('*').order('sort_order', { ascending: true }),
            supabase.from('global_extras').select('*').order('name', { ascending: true }),
        ]);
        if (catsRes.data) setCategories(catsRes.data);
        if (itemsRes.data) setItems(itemsRes.data);
        if (extrasRes.data) setExtras(extrasRes.data);
        setLoading(false);
    };

    // ── Top-level categories (no parent) ──
    const topLevelCats = categories.filter(c => !c.parent_id);
    const childCats = (parentId: string) => categories.filter(c => c.parent_id === parentId);

    // ── Category CRUD ──────────────────────────────────
    const handleSaveCategory = async () => {
        if (!catName.trim()) return;
        setCatSaving(true);
        setError('');

        const slug = catName.trim().toLowerCase().replace(/\s+/g, '-');
        const payload: any = {
            name: catName.trim(),
            slug,
            sort_order: editingCategory ? editingCategory.sort_order : categories.length,
            parent_id: catParentId || null,
        };

        let res;
        if (editingCategory) {
            res = await supabase.from('categories').update(payload).eq('id', editingCategory.id);
        } else {
            res = await supabase.from('categories').insert([payload]);
            if (res.error && res.error.message?.includes('slug')) {
                const { slug: _s, ...payloadNoSlug } = payload;
                res = await supabase.from('categories').insert([payloadNoSlug]);
            }
        }

        if (res.error) {
            setError(res.error.message);
        } else {
            setCatName('');
            setCatParentId('');
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
            extra_category_ids: itemExtraCats,
            allowed_global_extras: itemAllowedExtras,
            is_fasting: itemFasting,
            image_url: itemImg.trim() || null,
            is_active: itemActive,
            sort_order: editingItem ? editingItem.sort_order : items.length,
        };

        const res = editingItem
            ? await supabase.from('menu_items').update(payload).eq('id', editingItem.id)
            : await supabase.from('menu_items').insert([payload]);

        if (res.error) {
            setError(res.error.message);
        } else {
            setItemName(''); setItemDesc(''); setItemPrice(''); setItemCat('');
            setItemExtraCats([]); setItemImg(''); setItemAllowedExtras([]);
            setItemFasting(false);
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
            const { error: uploadError } = await supabase.storage.from('menu-images').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(filePath);
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

    const handleStatusChange = async (item: any) => {
        const newStatus = item.is_active === false;
        const { error } = await supabase.from('menu_items').update({ is_active: newStatus }).eq('id', item.id);
        if (error) setError('Failed to update status: ' + error.message);
        else fetchData();
    };

    // ── FIX: Use individual update() calls instead of upsert() ──
    const handleDragEnd = async (event: DragEndEvent, categoryId: string) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const categoryItems = items.filter(i => i.category_id === categoryId);
        const oldIndex = categoryItems.findIndex(i => i.id === active.id);
        const newIndex = categoryItems.findIndex(i => i.id === over.id);

        const newCategoryItems = arrayMove(categoryItems, oldIndex, newIndex);

        // Optimistic UI update
        const updatedItems = items.map(item => {
            if (item.category_id === categoryId) {
                const idx = newCategoryItems.findIndex(i => i.id === item.id);
                return { ...item, sort_order: idx };
            }
            return item;
        }).sort((a, b) => a.sort_order - b.sort_order);

        setItems(updatedItems);

        // Update database — use individual .update() to avoid NOT NULL constraint on upsert
        try {
            await Promise.all(
                newCategoryItems.map((item, index) =>
                    supabase.from('menu_items').update({ sort_order: index }).eq('id', item.id)
                )
            );
        } catch (err: any) {
            setError('Failed to update sort order: ' + (err.message || 'Unknown error'));
            fetchData(); // Rollback
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!window.confirm('Delete this menu item?')) return;
        await supabase.from('menu_items').delete().eq('id', id);
        fetchData();
    };

    // ── Extras CRUD ────────────────────────────────────
    const handleSaveExtra = async () => {
        if (!extraName.trim() || !extraPrice) {
            setError('Extra needs a name and price.');
            return;
        }
        setExtraSaving(true);
        setError('');

        const payload = {
            name: extraName.trim(),
            price: parseFloat(extraPrice),
        };

        const res = editingExtra
            ? await supabase.from('global_extras').update(payload).eq('id', editingExtra.id)
            : await supabase.from('global_extras').insert([payload]);

        if (res.error) {
            setError(res.error.message);
        } else {
            setExtraName(''); setExtraPrice('');
            setEditingExtra(null);
            fetchData();
        }
        setExtraSaving(false);
    };

    const handleDeleteExtra = async (id: string) => {
        if (!window.confirm('Delete this global extra option?')) return;
        await supabase.from('global_extras').delete().eq('id', id);
        fetchData();
    };

    const triggerEditExtra = (extra: GlobalExtra) => {
        setEditingExtra(extra);
        setExtraName(extra.name);
        setExtraPrice(extra.price.toString());
        setActiveTab('extras');
    };

    const toggleExtraCat = (catId: string) => {
        setItemExtraCats(prev =>
            prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
        );
    };

    const toggleAllowedExtra = (extraId: string) => {
        setItemAllowedExtras(prev => 
            prev.includes(extraId) ? prev.filter(id => id !== extraId) : [...prev, extraId]
        );
    };

    // Toggle category collapse state
    const toggleCategoryCollapse = (categoryId: string) => {
        setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
    };

    const filteredCats = categories; // Assuming no search filter for categories in items tab for now

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
                                    placeholder="e.g. Cold Drinks"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>
                                    <FolderTree size={11} className="inline mr-1" />
                                    Parent Category (for subcategory)
                                </label>
                                <select value={catParentId} onChange={e => setCatParentId(e.target.value)} className={inputCls}>
                                    <option value="">None (top-level)</option>
                                    {/* Only top-level cats can be parents */}
                                    {categories.filter(c => !c.parent_id && c.id !== editingCategory?.id).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                {catParentId && (
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        This will appear as a sub-tab inside the selected category on the customer menu.
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSaveCategory} disabled={catSaving} className={saveBtnCls}>
                                    <Check size={15} /> {catSaving ? 'Saving...' : (editingCategory ? 'Update' : 'Add Category')}
                                </button>
                                {editingCategory && (
                                    <button onClick={() => { setEditingCategory(null); setCatName(''); setCatParentId(''); }} className={cancelBtnCls}>
                                        <X size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        {categories.length === 0 && <p className="text-muted-foreground text-sm py-6 text-center">No categories yet. Add one!</p>}

                        {/* Top-level categories */}
                        {topLevelCats.map(cat => (
                            <div key={cat.id}>
                                {/* Parent card */}
                                <div className="bg-card border border-border p-4 rounded-xl flex justify-between items-center shadow-sm hover:border-primary/30 transition-colors">
                                    <div>
                                        <h4 className="font-bold text-foreground">{cat.name}</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {items.filter(i => i.category_id === cat.id).length} items
                                            {childCats(cat.id).length > 0 && (
                                                <span className="ml-2 text-primary font-bold">· {childCats(cat.id).length} subcategories</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingCategory(cat); setCatName(cat.name); setCatParentId(cat.parent_id || ''); setError(''); }} className="p-2 bg-secondary text-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"><Edit2 size={15} /></button>
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"><Trash2 size={15} /></button>
                                    </div>
                                </div>

                                {/* Subcategory cards — indented */}
                                {childCats(cat.id).map(sub => (
                                    <div key={sub.id} className="ml-6 mt-1 bg-secondary/30 border border-border/60 p-3 rounded-xl flex justify-between items-center hover:border-primary/20 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <FolderTree size={12} className="text-primary" />
                                                <h4 className="font-semibold text-sm text-foreground">{sub.name}</h4>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 ml-5">
                                                {items.filter(i => i.category_id === sub.id).length} items
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingCategory(sub); setCatName(sub.name); setCatParentId(sub.parent_id || ''); setError(''); }} className="p-2 bg-secondary text-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"><Edit2 size={15} /></button>
                                            <button onClick={() => handleDeleteCategory(sub.id)} className="p-2 bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"><Trash2 size={15} /></button>
                                        </div>
                                    </div>
                                ))}
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
                                <label className={labelCls}>Primary Category</label>
                                <select value={itemCat} onChange={e => { setItemCat(e.target.value); setItemExtraCats(prev => prev.filter(id => id !== e.target.value)); }} className={inputCls}>
                                    <option value="">Select a category...</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.parent_id ? `  ↳ ${c.name}` : c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Multi-category (show in other categories too) */}
                            {categories.filter(c => c.id !== itemCat).length > 0 && (
                                <div>
                                    <label className={labelCls}>Also show in…</label>
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 border border-border rounded-lg p-2 bg-background">
                                        {categories.filter(c => c.id !== itemCat).map(c => (
                                            <label key={c.id} className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={itemExtraCats.includes(c.id)}
                                                    onChange={() => toggleExtraCat(c.id)}
                                                    className="w-3.5 h-3.5 accent-primary"
                                                />
                                                <span className="text-xs text-foreground group-hover:text-primary transition-colors">
                                                    {c.parent_id ? `↳ ${c.name}` : c.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    {itemExtraCats.length > 0 && (
                                        <p className="text-[10px] text-primary mt-1 font-medium">
                                            This item will appear in {itemExtraCats.length + 1} categories total.
                                        </p>
                                    )}
                                </div>
                            )}

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

                            {/* Global Extras and Fasting Details */}
                            <div className="pt-2 border-t border-border mt-2 space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer group mb-2">
                                    <input
                                        type="checkbox"
                                        checked={itemFasting}
                                        onChange={e => setItemFasting(e.target.checked)}
                                        className="w-4 h-4 accent-green-600 rounded bg-background border-border"
                                    />
                                    <span className="text-sm font-bold text-foreground group-hover:text-green-600 transition-colors flex items-center gap-1.5">
                                        🌿 Mark as Fasting Meal
                                    </span>
                                </label>

                                <div>
                                    <label className={labelCls}>Allowed Global Extras</label>
                                    {extras.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic bg-secondary/30 p-2 rounded border border-border">No global extras defined yet.</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 border border-border rounded-lg p-2 bg-background">
                                            {extras.map(ex => (
                                                <label key={ex.id} className="flex items-center justify-between cursor-pointer group py-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={itemAllowedExtras.includes(ex.id)}
                                                            onChange={() => toggleAllowedExtra(ex.id)}
                                                            className="w-3.5 h-3.5 accent-primary"
                                                        />
                                                        <span className="text-xs text-foreground font-medium group-hover:text-primary transition-colors">
                                                            {ex.name}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">+ETB {Number(ex.price).toFixed(2)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1 border-t border-border mt-2 pt-4">
                                <button onClick={handleSaveItem} disabled={itemSaving} className={saveBtnCls}>
                                    <Check size={15} /> {itemSaving ? 'Saving...' : (editingItem ? 'Update Item' : 'Add Item')}
                                </button>
                                {editingItem && (
                                    <button onClick={() => { setEditingItem(null); setItemName(''); setItemDesc(''); setItemPrice(''); setItemCat(''); setItemExtraCats([]); setItemImg(''); setItemAllowedExtras([]); setItemFasting(false); }} className={cancelBtnCls}>
                                        <X size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        {/* Expand/Collapse All Categories Toggle */}
                        <div className="flex justify-end mb-2 pr-2">
                            <button
                                onClick={() => {
                                    const allExpanded = filteredCats.every(c => expandedCategories[c.id]);
                                    const nextState = !allExpanded;
                                    setExpandedCategories(filteredCats.reduce((acc, cat) => ({ ...acc, [cat.id]: nextState }), {}));
                                }}
                                className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                            >
                                {filteredCats.every(c => expandedCategories[c.id]) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {filteredCats.every(c => expandedCategories[c.id]) ? 'Collapse All Categories' : 'Expand All Categories'}
                            </button>
                        </div>
                        {items.length === 0 && <p className="text-muted-foreground text-sm py-6 text-center">No items yet. Add one!</p>}
                        {filteredCats.map((category) => {
                            const categoryItems = items.filter(i => i.category_id === category.id).sort((a, b) => a.sort_order - b.sort_order);
                            if (categoryItems.length === 0) return null;

                            const isSubcat = !!category.parent_id;
                            const isCollapsed = !expandedCategories[category.id];
                            
                            return (
                                <div key={category.id} className="space-y-3 mb-8">
                                    <button 
                                        onClick={() => toggleCategoryCollapse(category.id)}
                                        className={`w-full text-left text-sm font-black text-muted-foreground uppercase tracking-[0.2em] pt-4 flex items-center justify-between border-b border-border pb-2 sticky top-0 bg-background z-10 hover:text-foreground transition-colors ${isSubcat ? 'ml-4 text-xs opacity-70' : ''}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            {isSubcat ? <FolderTree size={12} className={isCollapsed ? "text-muted-foreground" : "text-primary"} /> : <Tag size={14} className={isCollapsed ? "text-muted-foreground" : "text-primary"} />}
                                            {category.name}
                                        </span>
                                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                    </button>

                                    {!isCollapsed && (
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={(event) => handleDragEnd(event, category.id)}
                                            modifiers={[restrictToVerticalAxis]}
                                        >
                                            <SortableContext
                                                items={categoryItems.map(i => i.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="space-y-3 animate-in fade-in duration-300">
                                                    {categoryItems.map((item) => (
                                                        <div key={item.id}>
                                                            <SortableItem
                                                                item={item}
                                                                itemExtras={extras.filter(e => item.allowed_global_extras?.includes(e.id))}
                                                                isExpanded={false}
                                                                onExpand={() => {}} // Disabled expand logic as extras are now global and editing is inline
                                                                onEdit={(item: any) => {
                                                                    setEditingItem(item);
                                                                    setItemName(item.name);
                                                                    setItemDesc(item.description || '');
                                                                    setItemPrice(item.base_price.toString());
                                                                    setItemCat(item.category_id);
                                                                    setItemExtraCats(item.extra_category_ids || []);
                                                                    setItemAllowedExtras(item.allowed_global_extras || []);
                                                                    setItemFasting(item.is_fasting || false);
                                                                    setItemImg(item.image_url || '');
                                                                    setItemActive(item.is_active !== false);
                                                                    window.scrollTo(0, 0);
                                                                }}
                                                                onDelete={handleDeleteItem}
                                                                onStatusChange={handleStatusChange}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                // ── EXTRAS TAB ──
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input
                                type="text"
                                placeholder="Search extras..."
                                className={`${inputCls} pl-10`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                            <Tag size={20} className="text-primary" />
                            All Extras / Add-ons
                        </h3>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Form Column */}
                        <div className="md:col-span-1 bg-card border border-border rounded-xl p-4 shadow-sm h-fit sticky top-6">
                            <h3 className="font-bold text-base mb-4 text-foreground">{editingExtra ? 'Update Global Extra' : 'New Global Extra'}</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className={labelCls}>Name</label>
                                    <input value={extraName} onChange={e => setExtraName(e.target.value)} type="text" className={inputCls} placeholder="e.g. Extra Cheese" />
                                </div>
                                <div>
                                    <label className={labelCls}>Price (ETB)</label>
                                    <input value={extraPrice} onChange={e => setExtraPrice(e.target.value)} type="number" step="0.01" className={inputCls} placeholder="0.00" />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button onClick={handleSaveExtra} disabled={extraSaving} className={saveBtnCls}>
                                        <Check size={15} /> {extraSaving ? 'Saving...' : (editingExtra ? 'Update' : 'Add Extra')}
                                    </button>
                                    {editingExtra && (
                                        <button onClick={() => { setEditingExtra(null); setExtraName(''); setExtraPrice(''); }} className={cancelBtnCls}>
                                            <X size={15} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Table Column */}
                        <div className="md:col-span-2">
                            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-muted/50 border-b border-border">
                                                <th className="p-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Extra Name</th>
                                                <th className="p-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                                                <th className="p-3 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Price</th>
                                                <th className="p-3 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {extras.filter(ex =>
                                                ex.name.toLowerCase().includes(searchTerm.toLowerCase())
                                            ).length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-muted-foreground text-sm italic">
                                                        No global extras found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                extras.filter(ex => ex.name.toLowerCase().includes(searchTerm.toLowerCase())).map(ex => {
                                                    const assignedCount = items.filter(i => i.allowed_global_extras?.includes(ex.id)).length;
                                                    return (
                                                        <tr key={ex.id} className="hover:bg-muted/30 transition-colors">
                                                            <td className="p-3 text-sm font-bold text-foreground">{ex.name}</td>
                                                            <td className="p-3 text-sm text-muted-foreground">
                                                                {assignedCount} {assignedCount === 1 ? 'item' : 'items'}
                                                            </td>
                                                            <td className="p-3 text-sm text-primary font-bold text-right whitespace-nowrap">
                                                                ETB {Number(ex.price).toFixed(2)}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        onClick={() => triggerEditExtra(ex)}
                                                                        className="p-1.5 text-muted-foreground hover:text-primary bg-secondary/50 rounded-md transition-colors"
                                                                    >
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteExtra(ex.id)}
                                                                        className="p-1.5 text-muted-foreground hover:text-destructive bg-secondary/50 rounded-md transition-colors"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}` }} />
        </div>
    );
};

export default AdminMenu;
