import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

type ThemeCtx = {
  theme: Theme;
  toggleTheme: () => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export const useTheme = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
};

const resolvePreferredTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch (err) {
    // Ignore storage access issues (e.g., private browsing).
  }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const preferred = resolvePreferredTheme();
    setTheme(preferred);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("theme", theme);
      } catch (err) {
        // Ignore storage write failures (private mode, etc.).
      }
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo<ThemeCtx>(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const DarkModeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" className="dark-toggle" onClick={toggleTheme} aria-label="Toggle dark mode">
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
};
