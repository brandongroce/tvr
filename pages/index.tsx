import fs from "fs";
import path from "path";
import { Layout } from "@/components/Layout";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), "README.md");
  const markdown = fs.readFileSync(filePath, "utf8");
  return { props: { markdown } };
}

export default function Home({ markdown }: { markdown: string }) {
  return (
    <Layout>
      <article className="prose">
        <MarkdownRenderer markdown={markdown} />
      </article>
    </Layout>
  );
}
