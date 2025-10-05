import { useEffect } from "react";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import SiteConditions from "@/components/SiteConditions";
import { useHeadings } from "@/components/HeadingsContext";

const headingId = "site-conditions";

function SiteConditionsContent() {
  const { reset, register } = useHeadings();

  useEffect(() => {
    reset();
    register({ id: headingId, level: 2, text: "Site Conditions" });
  }, [register, reset]);

  return (
    <div className="site-conditions-page">
      <h1 id={headingId} className="sr-only">
        Site Conditions
      </h1>
      <SiteConditions />
    </div>
  );
}

export default function SiteConditionsPage() {
  return (
    <Layout>
      <Head>
        <title>Site Conditions | Camp Host Handbook</title>
      </Head>
      <SiteConditionsContent />
    </Layout>
  );
}
