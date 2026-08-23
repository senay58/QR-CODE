import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';

export const ThemeToggle = ({ className }: { className?: string }) => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        // Check local storage or system preference on mount
        const savedTheme = localStorage.getItem('qr-menu-theme');
        if (savedTheme === 'dark') {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        } else {
            setTheme('light');
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        if (theme === 'light') {
            setTheme('dark');
            document.documentElement.classList.add('dark');
            localStorage.setItem('qr-menu-theme', 'dark');
        } else {
            setTheme('light');
            document.documentElement.classList.remove('dark');
            localStorage.setItem('qr-menu-theme', 'light');
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className={cn(
                "relative flex items-center justify-center p-2 rounded-full overflow-hidden transition-all duration-250 active:scale-95",
                className
            )}
            style={{ 
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)' 
            }}
            aria-label="Toggle Theme"
        >
            <div 
                className={cn(
                    "relative flex items-center justify-center transition-all duration-250 transform",
                    theme === 'dark' ? "rotate-90 scale-110" : "rotate-0 scale-100"
                )}
            >
                {theme === 'light' ? (
                    <Sun size={20} style={{ color: 'var(--accent-secondary)' }} strokeWidth={2.5} />
                ) : (
                    <Moon size={20} style={{ color: 'var(--accent-primary)', filter: 'drop-shadow(0 0 2px var(--accent-primary))' }} strokeWidth={2.5} />
                )}
            </div>
        </button>
    );
};
