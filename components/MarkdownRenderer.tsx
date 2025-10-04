import React, { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useHeadings } from "@/components/HeadingsContext";

// Robust-ish slugify to generate stable IDs.
function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[#]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[\s\t\n]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function textFromChildren(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map((c) => (typeof c === "string" ? c : "")).join(" ");
  return "";
}

export const MarkdownRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
  const { reset, register } = useHeadings();

  useEffect(() => {
    reset();
  }, [markdown, reset]);

  const makeHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) =>
    ({ node, children, ...props }: any) => {
      const text = textFromChildren(children);
      const id = slugify(text || `h${level}-${Math.random().toString(36).slice(2, 8)}`);
      register({ id, level, text: text || id });

      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      return (
        <Tag id={id} {...props}>
          <a href={`#${id}`} className="heading-anchor" aria-label="Anchor">
            #
          </a>
          {children}
        </Tag>
      );
    };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: makeHeading(1),
        h2: makeHeading(2),
        h3: makeHeading(3),
        h4: makeHeading(4),
        h5: makeHeading(5),
        h6: makeHeading(6),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
};
