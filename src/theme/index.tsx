'use client';

import { createContext, useContext, useEffect } from 'react';
import { getThemeConfig } from './themes';

// Re-export client-safe exports from themes.ts so existing imports work
export { getThemeConfig } from './themes';
export type { ThemeConfig } from './themes';
// Note: getServerThemeConfig must be imported from '@/theme/themes' directly in server files

const defaultTheme = getThemeConfig();

const ThemeContext = createContext(defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = getThemeConfig();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--navy', theme.primaryColor);
    root.style.setProperty('--cyan', theme.accentColor);
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
