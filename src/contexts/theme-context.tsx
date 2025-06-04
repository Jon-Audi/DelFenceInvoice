
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark"; // Actual theme being applied (light or dark)
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const applyTheme = (theme: Theme): "light" | "dark" => {
  let currentTheme: "light" | "dark";
  if (theme === "system") {
    currentTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } else {
    currentTheme = theme;
  }

  if (typeof window !== "undefined") {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(currentTheme);
  }
  return currentTheme;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system"; // Default for SSR
    return (localStorage.getItem("theme") as Theme) || "system";
  });
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");


  useEffect(() => {
    setResolvedTheme(applyTheme(theme));
  }, [theme]);

  // Listener for system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setResolvedTheme(applyTheme("system"));
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);


  const setTheme = useCallback((newTheme: Theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", newTheme);
    }
    setThemeState(newTheme);
  }, []);

  // Set initial theme on mount
  useEffect(() => {
    const storedTheme = (localStorage.getItem("theme") as Theme) || "system";
    setThemeState(storedTheme);
    setResolvedTheme(applyTheme(storedTheme));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
