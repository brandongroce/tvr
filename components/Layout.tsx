import React from "react";
import { TOC } from "@/components/TOC";
import { HeadingsProvider } from "@/components/HeadingsContext";
import { DarkModeToggle } from "@/components/ThemeContext";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <HeadingsProvider>
      <div className="layout">
        <aside className="sidebar">
          <TOC />
        </aside>
        <main className="content">
          <div className="content-toolbar">
            <DarkModeToggle />
          </div>
          {children}
        </main>
      </div>
    </HeadingsProvider>
  );
};
