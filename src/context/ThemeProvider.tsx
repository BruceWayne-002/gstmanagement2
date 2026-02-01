import React, { createContext, useState, useEffect, ReactNode } from 'react';

// Define your theme colors here
const defaultTheme = {
  primary: '#9E7FFF',
  secondary: '#38bdf8',
  accent: '#f472b6',
  background: '#171717',
  surface: '#262626',
  text: '#FFFFFF',
  textSecondary: '#A3A3A3',
  border: '#2F2F2F',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  colors: typeof defaultTheme;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark', // Default theme
  toggleTheme: () => {},
  colors: defaultTheme,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Initialize theme from localStorage or use default
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme');
      return storedTheme === 'light' ? 'light' : 'dark';
    }
    return 'dark'; // Default to dark if localStorage is not available
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Update the document's data-theme attribute when the theme changes
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    colors: defaultTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export { ThemeContext };
