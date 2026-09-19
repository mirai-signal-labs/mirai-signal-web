import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

export const metadata = {
  title: "用語集 | Mirai Signal",
  description: "AI・ロボティクス・バイオテック・半導体などの専門用語をやさしく解説する、Mirai Signalの用語集です。",
};

const DOMAIN_LABELS: Record<string, string> = {
  ai: "AI",
  robotics: "Robotics",
  biotech: "Biotech",
  semiconductor: "Semiconductor",
  energy: "Energy",
  space: "Space",
  defense: "Defense",
  other: "Other",
};

const DOMAIN_ORDER = ["ai", "robotics", "biotech", "semiconductor", "energy", "space", "defense"];

type Term = {
  term: string;
  term_en: string | null;
  domain: string | null;
};

export default async function GlossaryIndexPage() {
  const supabase = createServerSupabaseClient();

  const { data: terms } = await supabase
    .from("glossary_terms")
    .select("term, term_en, domain")
    .eq("status", "approved")
    .order("term", { ascending: true });

  const items = (terms ?? []) as Term[];

  const grouped: Record<string, Term[]> = {};
  for (const t of items) {
    const key = t.domain && DOMAIN_LABELS[t.domain] ? t.domain : "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }

  const domainKeys = [
    ...DOMAIN_ORDER.filter((d) => grouped[d]?.length),
    ...(grouped["other"]?.length ? ["other"] : []),
  ];

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
        <p style={{ fontSize: "13px", color: "var(--ms-text-secondary)", margin: "0 0 32px", lineHeight: 1.7 }}>
          記事に登場する専門用語を、分野ごとにやさしく解説しています。（{items.length}件）
        </p>

        {domainKeys.length === 0 ? (
          <p style={{ color: "var(--ms-text-secondary)", fontSize: "14px" }}>用語がまだありません。</p>
        ) : (
          domainKeys.map((key) => (
            <div key={key} style={{ marginBottom: "40px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", color: "var(--ms-accent-strong)", background: "var(--ms-accent-dim)", padding: "3px 12px", borderRadius: "20px", letterSpacing: "0.06em" }}>
                  {DOMAIN_LABELS[key] ?? key.toUpperCase()}
                </span>
                <span style={{ fontSize: "11px", color: "var(--ms-text-muted)" }}>
                  {grouped[key].length}件
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {grouped[key].map((t) => (
                  <Link
                    key={t.term}
                    href={"/glossary/" + t.term}
                    style={{
                      fontSize: "13px",
                      color: "var(--ms-text-primary)",
                      background: "var(--ms-bg-card)",
                      border: "0.5px solid var(--ms-border)",
                      borderRadius: "20px",
                      padding: "6px 16px",
                      textDecoration: "none",
                    }}
                  >
                    {t.term}
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
