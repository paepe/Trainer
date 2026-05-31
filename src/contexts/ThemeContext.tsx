import React, { createContext, useContext } from 'react';
import { BRAND } from '../theme/tokens';
import type { UserRole } from '../types';

export type AppTheme = typeof BRAND & {
  dark:          boolean;
  cycleEnabled:  boolean;
  role:          UserRole | 'client';
};

interface ThemeContextValue {
  t:          AppTheme;
  dark:       boolean;
  isTrainer:  boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  t,
  dark,
  isTrainer,
}: { children: React.ReactNode } & ThemeContextValue) {
  return (
    <ThemeContext.Provider value={{ t, dark, isTrainer }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
