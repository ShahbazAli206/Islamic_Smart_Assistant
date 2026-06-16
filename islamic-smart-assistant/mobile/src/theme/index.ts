import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme as useRNScheme } from 'react-native';

export interface Theme {
  scheme: 'light' | 'dark';
  bg: string;
  card: string;
  text: string;
  subText: string;
  accent: string;
  accentSoft: string;
  divider: string;
  shadow: string;
}

const light: Theme = {
  scheme: 'light',
  bg: '#FAF7EE',       // parchment
  card: '#FFFFFF',
  text: '#0B1410',     // ink — no green tint
  subText: '#5C5A50',  // warm neutral gray
  accent: '#C9A227',   // gold-500
  accentSoft: '#F6EED0', // gold-100
  divider: '#E5E4DA',
  shadow: 'rgba(0,0,0,0.06)',
};

const dark: Theme = {
  scheme: 'dark',
  bg: '#0E1118',       // deep dark, neutral
  card: '#1A1812',     // dark warm card
  text: '#FAF7EE',     // parchment — no green tint
  subText: '#C8C4B0',  // warm muted text
  accent: '#DDB94B',   // gold-400
  accentSoft: '#3F320A', // gold-900 dark
  divider: '#2A2820',  // dark warm border
  shadow: 'rgba(0,0,0,0.4)',
};

const ThemeCtx = createContext<Theme>(light);

export const useTheme = () => useContext(ThemeCtx);
export const useColorScheme = () => (useRNScheme() ?? 'light') as 'light' | 'dark';

export const ThemeProvider: React.FC<{ scheme: 'light' | 'dark'; children: React.ReactNode }> = ({ scheme, children }) => {
  const theme = useMemo(() => (scheme === 'dark' ? dark : light), [scheme]);
  return React.createElement(ThemeCtx.Provider, { value: theme }, children);
};
