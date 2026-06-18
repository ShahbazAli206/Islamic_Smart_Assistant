'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Ctx = { isDark: boolean; toggle: () => void };
const ThemeCtx = createContext<Ctx>({ isDark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(localStorage.getItem('isa:theme') === 'dark');
  }, []);

  const toggle = () =>
    setIsDark((d) => {
      const next = !d;
      localStorage.setItem('isa:theme', next ? 'dark' : 'light');
      return next;
    });

  return <ThemeCtx.Provider value={{ isDark, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
