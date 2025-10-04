import React, { useMemo } from "react";
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

  if (!items.length) return null;

  return (
    <nav aria-label="Table of contents" className="toc">
      <div className="toc-title">{title}</div>
      <ul>
        {items.map((h) => (
          <li key={`${h.id}-${h.level}-${h.text}`} className={`l${h.level}`}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
