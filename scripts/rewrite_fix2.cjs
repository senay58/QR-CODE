const fs = require('fs');

let content = fs.readFileSync('src/pages/CustomerMenu.tsx', 'utf8');

// 1. Imports
content = content.replace(
    '    ShoppingCart\n} from \'lucide-react\';',
    '    ShoppingCart,\n    Search\n} from \'lucide-react\';'
);

// 2. State
content = content.replace(
    '    const [loadingMenu, setLoadingMenu] = useState(true);',
    '    const [loadingMenu, setLoadingMenu] = useState(true);\n    const [searchQuery, setSearchQuery] = useState(\'\');'
);

// 3. ScrollSpy Helper Logic
const scrollLogic = `
    const topLevelCats = categories.filter(c => !c.parent_id);

    const handleScrollToCategory = (catId: string) => {
        setActiveCategory(catId);
        const el = document.getElementById(\`cat-\${catId}\`);
        if (el) {
            const offset = 140;
            const top = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (searchQuery || topLevelCats.length === 0) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter(e => e.isIntersecting);
                if (visible.length > 0) {
                    visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                    const id = visible[0].target.id.replace('cat-', '');
                    setActiveCategory(id);
                    const tabEl = document.getElementById(\`tab-\${id}\`);
                    if (tabEl) {
                        tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                }
            },
            { rootMargin: '-140px 0px -70% 0px' }
        );

        topLevelCats.forEach(cat => {
            const el = document.getElementById(\`cat-\${cat.id}\`);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [categories, menuItems, searchQuery]);

`;
content = content.replace(
    '    // --- Save cart as image (walk-in) ---',
    scrollLogic + '    // --- Save cart as image (walk-in) ---'
);

// 4. Fix Call Waiter Error Alert
content = content.replace(
    "alert('Could not notify staff. Please try again or wave to a waiter.');",
    "alert(`Could not notify staff: ${error.message || JSON.stringify(error)}`);"
);
content = content.replace("catch (error) {", "catch (error: any) {");

// 5. Header
const headerStart = content.indexOf('{/* ── Header ── */}');
const headerEnd = content.indexOf('{/* ── Menu List ── */}');

const newHeader = `{/* ── Header ── */}
            <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
                <div className="px-4 py-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-none">
                                    {(() => {
                                        const fullName = restaurant?.brand_name || restaurant?.name || 'Fana Kitchen';
                                        const parts = fullName.split(' ');
                                        const first = parts[0];
                                        const rest = parts.slice(1).join(' ');
                                        return <>{first}{rest && <span className="text-primary"> {rest}</span>}</>;
                                    })()}
                                </h1>
                                <span className="text-[10px] text-muted-foreground font-black tracking-widest uppercase mt-1 bg-secondary/80 self-start px-2 py-0.5 rounded border border-border">
                                    ID: {personalizedLabel}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {activeOrders.length > 0 && (
                                <button
                                    onClick={() => setIsTrackingOpen(true)}
                                    className="p-2 bg-primary/10 text-primary rounded-xl relative hover:bg-primary/20 transition-all border border-primary/20 shadow-sm"
                                >
                                    <Bell size={20} className="animate-pulse" />
                                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-white text-[10px] flex items-center justify-center rounded-full font-black">
                                        {activeOrders.length}
                                    </span>
                                </button>
                            )}
                            <ThemeToggle />
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search menu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-secondary/60 border border-border/60 rounded-xl pl-9 pr-8 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {!searchQuery && (
                    <div className="flex overflow-x-auto hide-scrollbar pb-3 px-4 gap-2 bg-background border-t border-border/30 pt-2">
                        {loadingMenu ? (
                            <div className="text-xs text-muted-foreground animate-pulse py-1">Loading...</div>
                        ) : (
                            topLevelCats.map(cat => (
                                <button
                                    id={\`tab-\${cat.id}\`}
                                    key={cat.id}
                                    onClick={() => handleScrollToCategory(cat.id)}
                                    className={\`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all border \${activeCategory === cat.id
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary'
                                        }\`}
                                >
                                    {cat.name}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </header>

            `;

content = content.substring(0, headerStart) + newHeader + content.substring(headerEnd);

// 6. Helper logic
const helpers = `    const isItemInCat = (item: any, catId: string) => {
        if (item.category_id === catId) return true;
        if (item.extra_category_ids?.includes(catId)) return true;
        const subCats = categories.filter(c => c.parent_id === catId);
        return subCats.some(sub => item.category_id === sub.id || item.extra_category_ids?.includes(sub.id));
    };

    const searchResults = menuItems.filter(i => 
        i.is_active !== false && 
        (i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         (i.description && i.description.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    const renderStars =`;
content = content.replace("    const renderStars =", helpers);

// 7. Extract original card JSX
const mainStart = content.indexOf('{/* ── Menu List ── */}');
const cartStart = content.indexOf('{/* ── Cart Sliding Overlay ── */}');
let origMain = content.substring(mainStart, cartStart);

let cardStart = origMain.indexOf('<div key={item.id}');
// CORRECTED: Finding the exact end of the map loop!
let cardEndStr = '                    ))\n                ) : (';
let cardEnd = origMain.indexOf(cardEndStr);
if (cardEnd === -1) {
    // try different spacing
    cardEndStr = '))\n                ) : (';
    cardEnd = origMain.indexOf(cardEndStr);
}

let cardJSX = origMain.substring(cardStart, cardEnd).trim(); // trims any trailing spaces

// 8. Main Replacement
let newMainBody = `{/* ── Menu List ── */}
            <main className="max-w-3xl mx-auto p-4 space-y-8">
                {loadingMenu ? (
                    [1, 2, 3].map(n => <div key={n} className="bg-card/70 backdrop-blur-md flex flex-row gap-3.5 p-3.5 rounded-[1.5rem] shadow-sm border border-border/40 animate-pulse h-32" />)
                ) : searchQuery ? (
                    <div className="space-y-4">
                        <h2 className="text-xl font-black mb-3 px-2">Search Results</h2>
                        {searchResults.length > 0 ? searchResults.map(item => (
                            REPLACE_CARD_JSX
                        )) : (
                            <div className="text-center py-12 text-muted-foreground bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50">
                                No items found matching your search.
                            </div>
                        )}
                    </div>
                ) : (
                    topLevelCats.map(cat => {
                        const itemsInCat = menuItems.filter(i => i.is_active !== false && isItemInCat(i, cat.id));
                        if (itemsInCat.length === 0) return null;
                        
                        return (
                            <section id={\`cat-\${cat.id}\`} key={cat.id} className="scroll-mt-40">
                                <h2 className="text-2xl font-black mb-4 px-2 tracking-tight">{cat.name}</h2>
                                <div className="space-y-4">
                                    {itemsInCat.map(item => (
                                        REPLACE_CARD_JSX
                                    ))}
                                </div>
                            </section>
                        );
                    })
                )}
            </main>

            `;

newMainBody = newMainBody.replaceAll('REPLACE_CARD_JSX', cardJSX);
content = content.substring(0, mainStart) + newMainBody + content.substring(cartStart);

fs.writeFileSync('src/pages/CustomerMenu.tsx', content);
