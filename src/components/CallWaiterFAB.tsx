import { useState, useRef, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';

interface Props {
    onCallWaiter: () => Promise<void>;
}

type FabState = 'collapsed' | 'expanded' | 'success';

export default function CallWaiterFAB({ onCallWaiter }: Props) {
    const [state, setState] = useState<FabState>('collapsed');
    const [loading, setLoading] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);
    const fabRef = useRef<HTMLButtonElement>(null);
    const prefersReducedMotion = typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    // Click outside to collapse
    useEffect(() => {
        if (state !== 'expanded') return;
        const handler = (e: MouseEvent) => {
            if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
                setState('collapsed');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [state]);

    const handleBellClick = () => {
        if (state === 'collapsed') setState('expanded');
        else if (state === 'expanded') setState('collapsed');
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onCallWaiter();
            setState('success');
            setTimeout(() => setState('collapsed'), 2200);
        } catch {
            setState('collapsed');
        } finally {
            setLoading(false);
        }
    };

    // Transition duration
    const transitionMs = prefersReducedMotion ? 0 : 320;

    const isExpanded = state === 'expanded';
    const isSuccess = state === 'success';

    return (
        <>
            {/* Backdrop overlay (invisible, for click outside) */}
            {state === 'expanded' && (
                <div
                    ref={overlayRef}
                    className="fixed inset-0 z-40"
                    onClick={() => setState('collapsed')}
                />
            )}

            <div
                className="fixed z-50 flex items-center justify-end"
                style={{ bottom: '24px', right: '24px' }}
                aria-live="polite"
            >
                <button
                    ref={fabRef}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Confirm calling waiter' : 'Call waiter'}
                    onClick={isExpanded ? undefined : handleBellClick}
                    className="flex items-center gap-2 font-bold shadow-xl overflow-hidden"
                    style={{
                        background: isSuccess
                            ? 'var(--accent-tertiary)'
                            : isExpanded
                                ? 'var(--surface)'
                                : 'var(--accent-primary)',
                        color: isSuccess
                            ? '#fff'
                            : isExpanded
                                ? 'var(--text-primary)'
                                : 'var(--surface)',
                        border: isExpanded ? `2px solid var(--border)` : '2px solid transparent',
                        borderRadius: '9999px',
                        height: '52px',
                        width: isExpanded ? '220px' : isSuccess ? '180px' : '52px',
                        paddingLeft: isExpanded || isSuccess ? '16px' : '0',
                        paddingRight: isExpanded || isSuccess ? '8px' : '0',
                        transition: prefersReducedMotion
                            ? 'none'
                            : `width ${transitionMs}ms cubic-bezier(0.34, 1.56, 0.64, 1), background ${transitionMs}ms ease, color ${transitionMs}ms ease`,
                        justifyContent: isExpanded ? 'space-between' : 'center',
                    }}
                >
                    {/* Bell icon — always visible */}
                    <span
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                            width: '28px',
                            transform: isExpanded ? 'rotate(15deg)' : 'none',
                            transition: prefersReducedMotion ? 'none' : `transform ${transitionMs}ms ease`,
                        }}
                        onClick={isExpanded ? handleBellClick : undefined}
                    >
                        {isSuccess ? <Check size={20} /> : <Bell size={20} />}
                    </span>

                    {/* Text + confirm button when expanded */}
                    {(isExpanded || isSuccess) && (
                        <span className="flex items-center gap-2 flex-1 justify-between"
                            style={{
                                opacity: isExpanded || isSuccess ? 1 : 0,
                                transition: prefersReducedMotion ? 'none' : `opacity ${transitionMs * 0.6}ms ease ${transitionMs * 0.3}ms`,
                            }}
                        >
                            <span className="text-sm whitespace-nowrap">
                                {isSuccess ? 'Waiter notified!' : 'Call Waiter?'}
                            </span>
                            {isExpanded && !isSuccess && (
                                <button
                                    onClick={handleConfirm}
                                    disabled={loading}
                                    className="rounded-full px-3 py-1 text-xs font-bold flex-shrink-0 active:scale-95 transition-transform"
                                    style={{ background: 'var(--accent-primary)', color: 'var(--surface)' }}
                                >
                                    {loading ? '...' : 'Confirm'}
                                </button>
                            )}
                        </span>
                    )}
                </button>
            </div>
        </>
    );
}
