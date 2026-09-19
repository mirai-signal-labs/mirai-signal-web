import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";

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

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({ params }: { params: Promise<{ term: string }> }) {
  const { term: rawTerm } = await params;
  const term = decodeURIComponent(rawTerm);
  const supabase = createServerSupabaseClient();
  const { data: entry } = await supabase
    .from("glossary_terms")
    .select("term, term_en, explanation")
    .eq("term", term)
    .eq("status", "approved")
    .single();

  if (!entry) return {};

  const title = entry.term + "とは？ | Mirai Signal 用語集";
  const description = entry.explanation.slice(0, 120);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: "https://mirai-signal-web-kzfb.vercel.app/glossary/" + encodeURIComponent(entry.term),
      siteName: "Mirai Signal",
      locale: "ja_JP",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function GlossaryTermPage({ params }: { params: Promise<{ term: string }> }) {
  const { term: rawTerm } = await params;
  const term = decodeURIComponent(rawTerm);
  const supabase = createServerSupabaseClient();

  const { data: entry } = await supabase
    .from("glossary_terms")
    .select("id, term, term_en, explanation, domain")
    .eq("term", term)
    .eq("status", "approved")
    .single();

  if (!entry) notFound();

  const { data: links } = await supabase
    .from("glossary_term_articles")
    .select("example_context, articles(id, title, title_ja, published_at, domain, status)")
    .eq("term_id", entry.id);

  type RelatedArticle = {
    id: string;
    title: string;
    title_ja: string | null;
    published_at: string | null;
    domain: string | null;
    status: string;
  };

  const relatedArticles = (links ?? [])
    .map((l) => ({
      article: l.articles as unknown as RelatedArticle | null,
      example_context: l.example_context as string | null,
    }))
    .filter((l) => l.article && l.article.status === "approved")
    .sort((a, b) => {
      const da = a.article?.published_at ?? "";
      const db = b.article?.published_at ?? "";
      return db.localeCompare(da);
    });

  const domainLabel = entry.domain ? DOMAIN_LABELS[entry.domain] ?? entry.domain : null;

  return (
    <div style={{ background: "var(--ms-bg)", minHeight: "100vh" }}>
      <nav style={{ background: "var(--ms-bg-sidebar)", borderBottom: "0.5px solid var(--ms-border)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ fontSize: "16px", fontWeight: 600, color: "var(--ms-text-heading)", letterSpacing: "0.06em", textDecoration: "none" }}>
          Mirai<span style={{ color: "var(--ms-accent-strong)" }}>Signal</span>
        </Link>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link href="/glossary" style={{ fontSize: "11px", color: "var(--ms-accent)", textDecoration: "none" }}>用語集</Link>
          <Link href="/" style={{ fontSize: "11px", color: "var(--ms-text-label)", textDecoration: "none" }}>Top</Link>
          <ThemeToggle />
        </div>
      </nav>

      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          {domainLabel && (
            <Link href={"/domain/" + entry.domain} style={{ fontSize: "10px", color: "var(--ms-accent-strong)", background: "var(--ms-accent-dim)", padding: "3px 12px", borderRadius: "20px", letterSpacing: "0.06em", display: "inline-block", marginBottom: "16px", textDecoration: "none" }}>
              {domainLabel}
            </Link>
          )}
          <h1 style={{ fontSize: "24px", fontWeight: 500, color: "var(--ms-text-strong)", lineHeight: 1.6, margin: "0 0 8px" }}>
            {entry.term}
          </h1>
          {entry.term_en && (
            <p style={{ fontSize: "13px", color: "var(--ms-text-label)", margin: 0, lineHeight: 1.5 }}>
              {entry.term_en}
            </p>
          )}
        </div>

        <hr style={{ border: "none", borderTop: "0.5px solid var(--ms-border)", marginBottom: "32px" }} />

        <div style={{ marginBottom: "40px" }}>
          <p style={{ fontSize: "10px", color: "var(--ms-accent)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ display: "inline-block", width: "20px", height: "1px", background: "var(--ms-accent)" }}></span>
            解説
          </p>
          <p style={{ fontSize: "16px", color: "var(--ms-text-primary)", lineHeight: 2, margin: 0, whiteSpace: "pre-wrap" }}>
            {entry.explanation}
          </p>
        </div>

        {relatedArticles.length > 0 && (
          <div>
            <p style={{ fontSize: "10px", color: "var(--ms-text-label)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px" }}>
              この用語が登場した記事（{relatedArticles.length}件）
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              {relatedArticles.map((l) => (
                <li key={l.article!.id} style={{ background: "var(--ms-bg-card)", border: "0.5px solid var(--ms-border)", borderRadius: "8px", padding: "14px 16px" }}>
                  <Link href={"/article/" + l.article!.id} style={{ textDecoration: "none" }}>
                    <p style={{ fontSize: "13px", color: "var(--ms-text-primary)", margin: "0 0 4px", lineHeight: 1.6 }}>
                      {l.article!.title_ja ?? l.article!.title}
                    </p>
                  </Link>
                  <p style={{ fontSize: "11px", color: "var(--ms-text-muted)", margin: 0 }}>
                    {formatDate(l.article!.published_at)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
