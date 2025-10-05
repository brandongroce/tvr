import React from "react";
import { TOC } from "@/components/TOC";
import { HeadingsProvider } from "@/components/HeadingsContext";
import { Header } from "@/components/Header";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <HeadingsProvider>
      <div className="layout-shell">
        <Header />
        <div className="layout">
          <div className="sidebar-wrapper">
            <aside className="sidebar">
              <TOC />
            </aside>
          </div>
          <main className="content">{children}</main>
        </div>
      </div>
    </HeadingsProvider>
  );
};
