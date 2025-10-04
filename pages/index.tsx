import fs from "fs";
import path from "path";
import { Layout } from "@/components/Layout";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useTheme } from "@/components/ThemeContext";

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), "README.md");
  const markdown = fs.readFileSync(filePath, "utf8");
  return { props: { markdown } };
}

export default function Home({ markdown }: { markdown: string }) {
  const { theme } = useTheme();
  const articleClass = theme === "dark" ? "prose prose-invert" : "prose";

  return (
    <Layout>
      <article className={articleClass}>
        <MarkdownRenderer markdown={markdown} />
      </article>
    </Layout>
  );
}
