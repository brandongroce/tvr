import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHeadings } from "@/components/HeadingsContext";

export const TOC: React.FC<{ title?: string; minLevel?: number; maxLevel?: number }> = ({
  title = "On this page",
  minLevel = 2,
  maxLevel = 4,
}) => {
  const { headings } = useHeadings();
  const items = useMemo(
    () => headings.filter((h) => h.level >= minLevel && h.level <= maxLevel),
    [headings, minLevel, maxLevel],
  );

  const numbered = useMemo(() => {
    const counts: Record<number, number> = {};
    return items.map((h) => {
      // Increment current level count and reset deeper levels.
      counts[h.level] = (counts[h.level] ?? 0) + 1;
      for (let lvl = h.level + 1; lvl <= maxLevel; lvl += 1) {
        counts[lvl] = 0;
      }

      const parts: number[] = [];
      for (let lvl = minLevel; lvl <= h.level; lvl += 1) {
        const count = counts[lvl];
        if (!count) continue;
        parts.push(count);
      }

      const numbering = parts.join(".");

      return {
        ...h,
        numbering,
      };
    });
  }, [items, minLevel, maxLevel]);

  const [activeId, setActiveId] = useState<string>(numbered[0]?.id ?? "");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setActiveId(numbered[0]?.id ?? "");
  }, [numbered]);

  useEffect(() => {
    if (!numbered.length) return undefined;

    const handleScroll = () => {
      const OFFSET = 120;
      let currentId = numbered[0]?.id ?? "";

      for (const item of numbered) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top - OFFSET <= 0) {
          currentId = item.id;
        } else {
          break;
        }
      }

      setActiveId(currentId);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [numbered]);

  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLAnchorElement>(`[data-toc-id="${activeId}"]`);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeId]);

  if (!numbered.length) return null;

  return (
    <nav id="on-this-page" aria-label="Table of contents" className="toc">
      <div className="toc-title">{title}</div>
      <ul ref={listRef} className="toc-list">
        {numbered.map((h) => (
          <li key={`${h.id}-${h.level}-${h.text}`} className={`l${h.level}`}>
            <a href={`#${h.id}`} data-toc-id={h.id} data-active={activeId === h.id}>
              {h.numbering && <span className="toc-index">{h.numbering}</span>}
              <span className="toc-text">{h.text}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
