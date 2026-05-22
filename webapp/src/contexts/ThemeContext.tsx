import React, { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { ThemeContext } from './theme-context';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Detect system theme preference or use saved preference
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme');
            if (saved === 'light' || saved === 'dark') {
                return saved;
            }
            if (window.matchMedia) {
                return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
        }
        return 'light';
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            // Only follow system preference change if there is no user override in localStorage
            const saved = localStorage.getItem('theme');
            if (!saved) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        // Apply the theme to root element
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', next);
            return next;
        });
    }, []);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        theme,
        toggleTheme
    }), [theme, toggleTheme]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};


