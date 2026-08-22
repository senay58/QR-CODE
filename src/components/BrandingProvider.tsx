import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

// Fana Kitchen brand defaults
const FK_PRIMARY = '#0F3D2E';   // Dark Forest Green
const FK_SECONDARY = '#C49A3A'; // Gold

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { branding } = useAuth();

    useEffect(() => {
        const root = document.documentElement;

        // Helper to convert hex to HSL (Tailwind uses HSL without the hsl() wrapper in vars)
        const hexToHsl = (hex: string): string => {
            let r = 0, g = 0, b = 0;
            if (hex.length === 4) {
                r = parseInt(hex[1] + hex[1], 16);
                g = parseInt(hex[2] + hex[2], 16);
                b = parseInt(hex[3] + hex[3], 16);
            } else if (hex.length === 7) {
                r = parseInt(hex.substring(1, 3), 16);
                g = parseInt(hex.substring(3, 5), 16);
                b = parseInt(hex.substring(5, 7), 16);
            }
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0, s, l = (max + min) / 2;
            if (max === min) {
                h = s = 0;
            } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
                else if (max === g) h = (b - r) / d + 2;
                else if (max === b) h = (r - g) / d + 4;
                h /= 6;
            }
            return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
        };

        // Use branding from DB if available, otherwise fall back to Fana Kitchen defaults
        const primaryColor = branding?.primary_color || FK_PRIMARY;
        const theme = branding?.theme || 'light';

        // Apply primary color
        root.style.setProperty('--primary', hexToHsl(primaryColor));
        root.style.setProperty('--ring', hexToHsl(FK_SECONDARY)); // gold ring always

        // Apply theme (light/dark)
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [branding]);

    return <>{children}</>;
};
