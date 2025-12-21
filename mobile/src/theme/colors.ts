export const palette = {
    primary: '#f97316',
    primaryDark: '#ea580c',
    white: '#ffffff',
    black: '#000000',
    slate50: '#f8fafc',
    slate100: '#f1f5f9',
    slate200: '#e2e8f0',
    slate300: '#cbd5e1',
    slate700: '#334155',
    slate800: '#1e293b',
    slate900: '#0f172a',
    red500: '#ef4444',
    green500: '#10b981',
    blue500: '#3b82f6',
    amber500: '#f59e0b',
};

export const spacing = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
};

export const lightTheme = {
    mode: 'light',
    primary: palette.primary,
    background: palette.slate50,
    card: palette.white,
    text: palette.slate900,
    textSecondary: palette.slate700,
    border: palette.slate200,
    inputBackground: palette.white,
    success: palette.green500,
    danger: palette.red500,
    warning: palette.amber500,
    info: palette.blue500,
    tabBar: palette.white,
    statusBar: 'dark',
};

export const darkTheme = {
    mode: 'dark',
    primary: palette.primary,
    background: palette.slate900,
    card: palette.slate800,
    text: palette.slate100,
    textSecondary: palette.slate300,
    border: palette.slate700,
    inputBackground: palette.slate900,
    success: palette.green500,
    danger: palette.red500,
    warning: palette.amber500,
    info: palette.blue500,
    tabBar: palette.slate800,
    statusBar: 'light',
};

export type ThemeColors = typeof lightTheme;

// Default export for backward compatibility during migration (pointing to light)
export const colors = lightTheme; 
