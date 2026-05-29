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
  bg: '#F7F5EE',
  card: '#FFFFFF',
  text: '#1A2E1A',
  subText: '#5C6B5C',
  accent: '#1F7A3A',
  accentSoft: '#D8EAD9',
  divider: '#E5E4DA',
  shadow: 'rgba(0,0,0,0.06)',
};

const dark: Theme = {
  scheme: 'dark',
  bg: '#0F1611',
  card: '#16221A',
  text: '#E8EFE8',
  subText: '#9AA8A0',
  accent: '#3FA563',
  accentSoft: '#1E3A28',
  divider: '#22302A',
  shadow: 'rgba(0,0,0,0.4)',
};

const ThemeCtx = createContext<Theme>(light);

export const useTheme = () => useContext(ThemeCtx);
export const useColorScheme = () => (useRNScheme() ?? 'light') as 'light' | 'dark';

export const ThemeProvider: React.FC<{ scheme: 'light' | 'dark'; children: React.ReactNode }> = ({ scheme, children }) => {
  const theme = useMemo(() => (scheme === 'dark' ? dark : light), [scheme]);
  return React.createElement(ThemeCtx.Provider, { value: theme }, children);
};
