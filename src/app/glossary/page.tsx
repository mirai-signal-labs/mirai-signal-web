import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import GlossarySearch from "@/app/components/GlossarySearch";

export const metadata = {
  title: "用語集 | Mirai Signal",
  description: "AI・ロボティクス・バイオテック・半導体などの専門用語をやさしく解説する、Mirai Signalの用語集です。",
};

type Term = {
  term: string;
  term_en: string | null;
  domain: string | null;
  explanation: string;
};

export default async function GlossaryIndexPage() {
  const supabase = createServerSupabaseClient();

  const { data: terms } = await supabase
    .from("glossary_terms")
    .select("term, term_en, domain, explanation")
    .eq("status", "approved")
    .order("term", { ascending: true });

  const items = (terms ?? []) as Term[];

  return (
    <div style={{ background: "var(--ms-bg)", minHeight: "100vh" }}>
      <nav style={{ background: "var(--ms-bg-sidebar)", borderBottom: "0.5px solid var(--ms-border)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ fontSize: "16px", fontWeight: 600, color: "var(--ms-text-heading)", letterSpacing: "0.06em", textDecoration: "none" }}>
          Mirai<span style={{ color: "var(--ms-accent-strong)" }}>Signal</span>
        </Link>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link href="/" style={{ fontSize: "11px", color: "var(--ms-text-label)", textDecoration: "none" }}>Top</Link>
          <ThemeToggle />
        </div>
      </nav>

      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 500, color: "var(--ms-text-strong)", margin: "0 0 8px" }}>
          用語集
        </h1>
        <p style={{ fontSize: "13px", color: "var(--ms-text-secondary)", margin: "0 0 24px", lineHeight: 1.7 }}>
          記事に登場する専門用語を、分野ごとにやさしく解説しています。（全{items.length}件）
        </p>

        <GlossarySearch terms={items} />
      </main>
    </div>
  );
}
