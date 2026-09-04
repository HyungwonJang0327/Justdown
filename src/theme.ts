import { createContext, useContext } from 'react';

export type ThemeName = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  card: string;
  text: string;
  subText: string;
  border: string;
  tint: string;
  tabActiveBg: string;
  tabActiveText: string;
  tabInactiveText: string;
  destructive: string;
}

const light: ThemeColors = {
  bg: '#ffffff',
  card: '#f6f8fa',
  text: '#1a1a1a',
  subText: '#6a737d',
  border: '#e1e4e8',
  tint: '#0366d6',
  tabActiveBg: '#ffffff',
  tabActiveText: '#1a1a1a',
  tabInactiveText: '#6a737d',
  destructive: '#e5484d',
};

const dark: ThemeColors = {
  bg: '#151515',
  card: '#1e1e1e',
  text: '#e6e6e6',
  subText: '#9aa0a6',
  border: '#333333',
  tint: '#5aa9ff',
  tabActiveBg: '#2a2a2a',
  tabActiveText: '#ffffff',
  tabInactiveText: '#9aa0a6',
  destructive: '#e5484d',
};

export function colorsFor(theme: ThemeName): ThemeColors {
  return theme === 'dark' ? dark : light;
}

export interface ThemeContextValue {
  theme: ThemeName;
  colors: ThemeColors;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  colors: light,
  toggle: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
