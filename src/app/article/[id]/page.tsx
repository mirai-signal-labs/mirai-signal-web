import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

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
};

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

  const domainLabel = article.domain ? DOMAIN_LABELS[article.domain] ?? article.domain : null;

  return (
    <div style={{ background: "#080810", minHeight: "100vh" }}>
      <nav style={{ background: "#0b0b14", borderBottom: "0.5px solid #1e1e30", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ fontSize: "16px", fontWeight: 600, color: "#c8c4ff", letterSpacing: "0.06em", textDecoration: "none" }}>
          Mirai<span style={{ color: "#7f77dd" }}>Signal</span>
        </Link>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {article.domain && (
            <Link href={"/domain/" + article.domain} style={{ fontSize: "11px", color: "#534ab7", textDecoration: "none" }}>
              {domainLabel}
            </Link>
          )}
          <Link href="/" style={{ fontSize: "11px", color: "#444441", textDecoration: "none" }}>Top</Link>
        </div>
      </nav>

      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          {domainLabel && (
            <Link href={"/domain/" + article.domain} style={{ fontSize: "10px", color: "#7f77dd", background: "#1a1830", padding: "3px 12px", borderRadius: "20px", letterSpacing: "0.06em", display: "inline-block", marginBottom: "16px", textDecoration: "none" }}>
              {domainLabel}
            </Link>
          )}
<h1 style={{ fontSize: "22px", fontWeight: 500, color: "#e8e6ff", lineHeight: 1.6, margin: "0 0 8px" }}>
  {article.title_ja ?? article.title}
</h1>
{article.title_ja && (
  <p style={{ fontSize: "13px", color: "#444441", margin: "0 0 12px", lineHeight: 1.5 }}>
    {article.title}
  </p>
)}
          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#3c3489", alignItems: "center" }}>
            <span style={{ background: "#0e0e1a", border: "0.5px solid #1e1e30", padding: "2px 10px", borderRadius: "4px" }}>{article.source ?? "-"}</span>
            <span>{formatDate(article.published_at)}</span>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "0.5px solid #1e1e30", marginBottom: "32px" }} />

        {article.summary_ja && (
          <div style={{ marginBottom: "32px" }}>
            <p style={{ fontSize: "10px", color: "#534ab7", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ display: "inline-block", width: "20px", height: "1px", background: "#534ab7" }}></span>
              日本語要約
            </p>
            <p style={{ fontSize: "16px", color: "#afa9ec", lineHeight: 2, margin: 0, whiteSpace: "pre-wrap" }}>
              {article.summary_ja}
            </p>
          </div>
        )}

        {article.summary && (
          <div style={{ marginBottom: "32px", background: "#0e0e1a", border: "0.5px solid #1e1e30", borderRadius: "8px", padding: "20px" }}>
            <p style={{ fontSize: "10px", color: "#444441", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
              English Summary
            </p>
            <p style={{ fontSize: "13px", color: "#5f5e5a", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
              {article.summary}
            </p>
          </div>
        )}

        <hr style={{ border: "none", borderTop: "0.5px solid #1e1e30", marginBottom: "24px" }} />

        <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#7f77dd", border: "0.5px solid #534ab7", padding: "10px 24px", borderRadius: "20px", textDecoration: "none" }}>
          元記事を読む
        </a>
      </main>
    </div>
  );
}