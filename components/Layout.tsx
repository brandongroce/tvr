import React from "react";
import { TOC } from "@/components/TOC";
import { HeadingsProvider } from "@/components/HeadingsContext";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <HeadingsProvider>
      <div className="layout">
        <aside className="sidebar">
          <TOC />
        </aside>
        <main className="content">{children}</main>
      </div>
    </HeadingsProvider>
  );
};
