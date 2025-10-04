import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type HeadingItem = {
  id: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
};

type HeadingsCtx = {
  headings: HeadingItem[];
  register: (h: HeadingItem) => void;
  reset: () => void;
};

const Ctx = createContext<HeadingsCtx | null>(null);

export const useHeadings = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHeadings must be used within <HeadingsProvider>");
  return ctx;
};

export const HeadingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);

  const register = useCallback((h: HeadingItem) => {
    setHeadings((prev) => {
      const exists = prev.some((x) => x.id === h.id && x.level === h.level && x.text === h.text);
      return exists ? prev : [...prev, h];
    });
  }, []);

  const reset = useCallback(() => {
    setHeadings([]);
  }, []);

  const value = useMemo<HeadingsCtx>(() => ({ headings, register, reset }), [headings, register, reset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
