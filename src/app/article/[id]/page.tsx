import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";
import type { ReactNode } from "react";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data: article } = await supabase
    .from("articles")
    .select("title, title_ja, summary_ja, summary, domain")
    .eq("id", id)
    .single();

  if (!article) return {};

  const title = article.title_ja ?? article.title;
  const description = (article.summary_ja ?? article.summary ?? "").slice(0, 120);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://mirai-signal-web-kzfb.vercel.app/article/${id}`,
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

// 本文中の難単語を用語集ページへのリンクに変換する
// terms: この記事に紐づく承認済み用語（長い用語を優先的にマッチさせる）
function linkifyGlossaryTerms(text: string, terms: string[]): ReactNode {
  if (!text || terms.length === 0) return text;

  // 長い用語を先にマッチさせる（例：「推論」より「推論実行」を優先）
  const sorted = [...new Set(terms)].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp("(" + escaped.join("|") + ")", "g");

  const parts = text.split(pattern);
  const termSet = new Set(sorted);

  return parts.map((part, i) =>
    termSet.has(part) ? (
      <Link
        key={i}
        href={"/glossary/" + encodeURIComponent(part)}
        style={{
          color: "var(--ms-accent-strong)",
          textDecoration: "underline",
          textDecorationStyle: "dotted",
          textUnderlineOffset: "3px",
        }}
      >
        {part}
      </Link>
    ) : (
      part
    )
  );
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (!article) notFound();

  // この記事に紐づく承認済み用語を取得（本文リンク化用）
  const { data: glossaryLinks } = await supabase
    .from("glossary_term_articles")
    .select("glossary_terms(term, status)")
    .eq("article_id", id);

  type LinkedTerm = { term: string; status: string } | null;

  const glossaryTermList = (glossaryLinks ?? [])
    .map((l) => l.glossary_terms as unknown as LinkedTerm)
    .filter((t): t is { term: string; status: string } => !!t && t.status === "approved")
    .map((t) => t.term);

  const domainLabel = article.domain ? DOMAIN_LABELS[article.domain] ?? article.domain : null;
  const title = article.title_ja ?? article.title;
  const articleUrl = `https://mirai-signal-web-kzfb.vercel.app/article/${id}`;
  const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(title + ' | Mirai Signal')}&url=${encodeURIComponent(articleUrl)}&via=MqS_quest`;

  return (
    <div style={{ background: "var(--ms-bg)", minHeight: "100vh" }}>
      <nav style={{ background: "var(--ms-bg-sidebar)", borderBottom: "0.5px solid var(--ms-border)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ fontSize: "16px", fontWeight: 600, color: "var(--ms-text-heading)", letterSpacing: "0.06em", textDecoration: "none" }}>
          Mirai<span style={{ color: "var(--ms-accent-strong)" }}>Signal</span>
        </Link>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {article.domain && (
            <Link href={"/domain/" + article.domain} style={{ fontSize: "11px", color: "var(--ms-accent)", textDecoration: "none" }}>
              {domainLabel}
            </Link>
          )}
          <Link href="/" style={{ fontSize: "11px", color: "var(--ms-text-label)", textDecoration: "none" }}>Top</Link>
          <ThemeToggle />
        </div>
      </nav>

      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          {domainLabel && (
            <Link href={"/domain/" + article.domain} style={{ fontSize: "10px", color: "var(--ms-accent-strong)", background: "var(--ms-accent-dim)", padding: "3px 12px", borderRadius: "20px", letterSpacing: "0.06em", display: "inline-block", marginBottom: "16px", textDecoration: "none" }}>
              {domainLabel}
            </Link>
          )}
          <h1 style={{ fontSize: "22px", fontWeight: 500, color: "var(--ms-text-strong)", lineHeight: 1.6, margin: "0 0 8px" }}>
            {article.title_ja ?? article.title}
          </h1>
          {article.title_ja && (
            <p style={{ fontSize: "13px", color: "var(--ms-text-label)", margin: "0 0 12px", lineHeight: 1.5 }}>
              {article.title}
            </p>
          )}
          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--ms-text-muted)", alignItems: "center" }}>
            <span style={{ background: "var(--ms-bg-card)", border: "0.5px solid var(--ms-border)", padding: "2px 10px", borderRadius: "4px" }}>{article.source ?? "-"}</span>
            <span>{formatDate(article.published_at)}</span>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "0.5px solid var(--ms-border)", marginBottom: "32px" }} />

        {article.summary_ja && (
          <div style={{ marginBottom: "32px" }}>
            <p style={{ fontSize: "10px", color: "var(--ms-accent)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ display: "inline-block", width: "20px", height: "1px", background: "var(--ms-accent)" }}></span>
              日本語要約
            </p>
            <p style={{ fontSize: "16px", color: "var(--ms-text-primary)", lineHeight: 2, margin: 0, whiteSpace: "pre-wrap" }}>
              {linkifyGlossaryTerms(article.summary_ja, glossaryTermList)}
            </p>
          </div>
        )}

        {article.summary && (
          <div style={{ marginBottom: "32px", background: "var(--ms-bg-card)", border: "0.5px solid var(--ms-border)", borderRadius: "8px", padding: "20px" }}>
            <p style={{ fontSize: "10px", color: "var(--ms-text-label)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
              English Summary
            </p>
            <p style={{ fontSize: "13px", color: "var(--ms-text-secondary)", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
              {article.summary}
            </p>
          </div>
        )}

        <hr style={{ border: "none", borderTop: "0.5px solid var(--ms-border)", marginBottom: "24px" }} />

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--ms-accent-strong)", border: "0.5px solid var(--ms-accent)", padding: "10px 24px", borderRadius: "20px", textDecoration: "none" }}>
            元記事を読む
          </a>
          <a href={xShareUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--ms-text-primary)", border: "0.5px solid var(--ms-border)", padding: "10px 24px", borderRadius: "20px", textDecoration: "none" }}>
            𝕏 でシェア
          </a>
        </div>
      </main>
    </div>
  );
}
