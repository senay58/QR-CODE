const fs = require('fs');

let content = fs.readFileSync('src/pages/CustomerMenu.tsx', 'utf8');

const helperLogic = `
    const isItemInCat = (item: any, catId: string) => {
        if (item.category_id === catId) return true;
        if (item.extra_category_ids?.includes(catId)) return true;
        const subCats = categories.filter(c => c.parent_id === catId);
        return subCats.some(sub => item.category_id === sub.id || item.extra_category_ids?.includes(sub.id));
    };

    const searchResults = menuItems.filter(i => 
        i.is_active !== false && 
        (i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         i.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
`;

content = content.replace('const renderStars', helperLogic + '\n    const renderStars');

const mainStart = content.indexOf('<main');
const cartStart = content.indexOf('{/* ── Cart Sliding Overlay ── */}');

// We need to extract the item card rendering logic into a reusable function
// Find the div with key={item.id} inside currentItems.map
const itemCardStart = content.indexOf('<div key={item.id}', mainStart);
let itemCardEnd = content.indexOf('))', itemCardStart);
// Make sure we go past the closing div. The structure is </div>\n                    ))
itemCardEnd = content.lastIndexOf('</div>', itemCardEnd) + 6;

const itemCardHTML = content.substring(itemCardStart, itemCardEnd);

// Replace the extracted JSX with the new main logic
const newMain = `
            {/* ── Menu List ── */}
            <main className="max-w-3xl mx-auto p-4 space-y-8">
                {loadingMenu ? (
                    [1, 2, 3].map(n => <div key={n} className="bg-card/70 backdrop-blur-md flex flex-row gap-3.5 p-3.5 rounded-[1.5rem] shadow-sm border border-border/40 animate-pulse h-32" />)
                ) : searchQuery ? (
                    <div className="space-y-4">
                        <h2 className="text-xl font-black mb-3 px-2">Search Results</h2>
                        {searchResults.length > 0 ? searchResults.map(item => (
                            ${itemCardHTML}
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
                            <section id={\`cat-\${cat.id}\`} key={cat.id} className="scroll-mt-36">
                                <h2 className="text-2xl font-black mb-4 px-2 tracking-tight">{cat.name}</h2>
                                <div className="space-y-4">
                                    {itemsInCat.map(item => (
                                        ${itemCardHTML}
                                    ))}
                                </div>
                            </section>
                        );
                    })
                )}
            </main>

`;

content = content.substring(0, mainStart) + newMain + content.substring(cartStart);

fs.writeFileSync('src/pages/CustomerMenu.tsx', content);
