import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';

const SPECIALS_INTERVAL_MS = 4000;
const IDLE_RESUME_MS = 3000;

interface SpecialItem {
    id: string;
    name: string;
    description?: string;
    base_price: number;
    image_url?: string;
}

interface Props {
    items: SpecialItem[];
    onAdd: (item: SpecialItem) => void;
}

export default function SpecialsCarousel({ items, onAdd }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prefersReducedMotion = typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    const totalItems = items.length;

    const pauseAutoScroll = useCallback(() => {
        setIsPaused(true);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => setIsPaused(false), IDLE_RESUME_MS);
    }, []);

    // Auto-advance timer
    useEffect(() => {
        if (prefersReducedMotion || totalItems <= 1) return;

        let startTime = Date.now();
        let animFrame: number;
        let localProgress = 0;

        const tick = () => {
            if (isPaused) {
                startTime = Date.now() - localProgress * SPECIALS_INTERVAL_MS;
                animFrame = requestAnimationFrame(tick);
                return;
            }
            const elapsed = Date.now() - startTime;
            localProgress = Math.min(elapsed / SPECIALS_INTERVAL_MS, 1);
            setProgress(localProgress);
            if (elapsed >= SPECIALS_INTERVAL_MS) {
                setCurrentIndex((prev) => (prev + 1) % totalItems);
                startTime = Date.now();
                localProgress = 0;
                setProgress(0);
            }
            animFrame = requestAnimationFrame(tick);
        };

        animFrame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animFrame);
    }, [isPaused, totalItems, prefersReducedMotion]);

    // Scroll container to current card
    useEffect(() => {
        if (!scrollRef.current) return;
        const container = scrollRef.current;
        const cardWidth = container.clientWidth;
        container.scrollTo({ left: currentIndex * cardWidth, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }, [currentIndex, prefersReducedMotion]);

    if (!items || items.length === 0) return null;

    return (
        <div className="mx-4 mb-6">
            {/* Tibeb top border strip */}
            <div className="tibeb-pattern h-4 rounded-t-xl" />

            <div
                className="border border-[var(--border)] border-t-0 rounded-b-xl overflow-hidden"
                style={{ background: 'var(--surface)' }}
                onMouseEnter={pauseAutoScroll}
                onMouseLeave={() => { setIsPaused(false); }}
                onTouchStart={pauseAutoScroll}
            >
                {/* Header */}
                <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-secondary)' }}>✦ Today's Specials</span>
                </div>

                {/* Cards */}
                <div
                    ref={scrollRef}
                    className="flex overflow-x-hidden"
                >
                    {items.map((item) => (
                        <div key={item.id} className="w-full flex-shrink-0 px-4 pb-4 pt-1 flex gap-4">
                            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                                style={{ background: 'var(--bg)' }}>
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl">✨</div>
                                )}
                            </div>
                            <div className="flex flex-col flex-1 justify-between min-w-0">
                                <div>
                                    <h3 style={{ fontFamily: 'Fraunces, serif', color: 'var(--text-primary)' }}
                                        className="font-bold text-base leading-tight">{item.name}</h3>
                                    {item.description && (
                                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                                    )}
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="font-bold tabular-nums text-sm" style={{ color: 'var(--accent-primary)' }}>
                                        ETB {Number(item.base_price).toFixed(2)}
                                    </span>
                                    <button
                                        onClick={() => onAdd(item)}
                                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95"
                                        style={{ background: 'var(--accent-primary)', color: 'var(--surface)' }}
                                    >
                                        <Plus size={12} /> Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Progress bar + dots */}
                {!prefersReducedMotion && totalItems > 1 && (
                    <div className="flex px-4 pb-3 gap-1.5 items-center">
                        {items.map((_, i) => (
                            <div
                                key={i}
                                onClick={() => { setCurrentIndex(i); setProgress(0); }}
                                className="h-1 flex-1 rounded-full overflow-hidden cursor-pointer"
                                style={{ background: 'var(--border)' }}
                            >
                                <div
                                    className="h-full rounded-full transition-none"
                                    style={{
                                        background: 'var(--accent-secondary)',
                                        width: i === currentIndex
                                            ? `${progress * 100}%`
                                            : i < currentIndex ? '100%' : '0%',
                                        transition: i === currentIndex ? 'none' : 'width 0s'
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tibeb bottom border strip */}
            <div className="tibeb-pattern h-4 rounded-b-none" />
        </div>
    );
}
