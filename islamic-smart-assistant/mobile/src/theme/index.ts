import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme as useRNScheme } from 'react-native';

export interface Theme {
  scheme: 'light' | 'dark';
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  subText: string;
  accent: string;
  accentSoft: string;
  emerald: string;
  emeraldSoft: string;
  divider: string;
  shadow: string;
}

const light: Theme = {
  scheme: 'light',
  bg: '#FAF7EE',
  card: '#FFFFFF',
  cardAlt: '#F5F2E8',
  text: '#0B1410',
  subText: '#5C5A50',
  accent: '#C9A227',
  accentSoft: '#F6EED0',
  emerald: '#059669',
  emeraldSoft: '#ECFDF5',
  divider: '#E5E4DA',
  shadow: 'rgba(0,0,0,0.06)',
};

const dark: Theme = {
  scheme: 'dark',
  bg: '#080F19',
  card: '#0E1B2A',
  cardAlt: '#162639',
  text: '#FAF7EE',
  subText: '#8FA3B4',
  accent: '#DDB94B',
  accentSoft: 'rgba(221,185,75,0.15)',
  emerald: '#10B981',
  emeraldSoft: 'rgba(16,185,129,0.12)',
  divider: 'rgba(255,255,255,0.07)',
  shadow: 'rgba(0,0,0,0.5)',
};

const ThemeCtx = createContext<Theme>(dark);

export const useTheme = () => useContext(ThemeCtx);
export const useColorScheme = () => (useRNScheme() ?? 'dark') as 'light' | 'dark';

export const ThemeProvider: React.FC<{ scheme: 'light' | 'dark'; children: React.ReactNode }> = ({ scheme, children }) => {
  const theme = useMemo(() => (scheme === 'dark' ? dark : light), [scheme]);
  return React.createElement(ThemeCtx.Provider, { value: theme }, children);
};
