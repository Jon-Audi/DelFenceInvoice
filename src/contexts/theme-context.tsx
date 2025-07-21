
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme?: "light" | "dark"; // Actual theme being applied (light or dark)
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {/* We can wrap another context here if we need to expose more specific theme logic */}
      {children}
    </NextThemesProvider>
  );
};

export const useTheme = () => {
  // In this simplified setup, we might not need a custom hook that wraps next-themes' hook,
  // but if we were to add more context, this is where it would go.
  // For now, components can directly use 'useTheme' from 'next-themes' if needed.
  // This structure is kept for potential future expansion.
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // This custom hook isn't providing value right now, so we can consider removing it
    // if components will just use the one from next-themes directly.
    // However, to keep the app compiling, we return a dummy object.
    // A better refactor would be to remove this useTheme hook and have components
    // import { useTheme } from 'next-themes'
    return { theme: 'system', setTheme: () => {}, resolvedTheme: 'light' };
  }
  return context;
};
