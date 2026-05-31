import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

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

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
      <nav style={{ background: "#0b0b14", borderBottom: "0.5px solid #1e1e30", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ fontSize: "14px", fontWeight: 500, color: "#c8c4ff", letterSpacing: "0.06em", textDecoration: "none" }}>
          Mirai<span style={{ color: "#7f77dd" }}>Signal</span>
        </Link>
        {article.domain && (
          <Link href={"/domain/" + article.domain} style={{ fontSize: "11px", color: "#534ab7", textDecoration: "none" }}>
            ← {domainLabel}へ戻る
          </Link>
        )}
      </nav>

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: "24px" }}>
          {domainLabel && (
            <span style={{ fontSize: "10px", color: "#7f77dd", background: "#1a1830", padding: "2px 10px", borderRadius: "20px", letterSpacing: "0.06em", display: "inline-block", marginBottom: "12px" }}>
              {domainLabel}
            </span>
          )}
          <h1 style={{ fontSize: "20px", fontWeight: 500, color: "#e8e6ff", lineHeight: 1.5, margin: "0 0 12px" }}>
            {article.title}
          </h1>
          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#3c3489" }}>
            <span>{article.source ?? "-"}</span>
            <span>{formatDate(article.published_at)}</span>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "0.5px solid #1e1e30", marginBottom: "24px" }} />

        {article.summary_ja && (
          <div style={{ marginBottom: "28px" }}>
            <p style={{ fontSize: "11px", color: "#534ab7", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>日本語要約</p>
            <p style={{ fontSize: "15px", color: "#afa9ec", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
              {article.summary_ja}
            </p>
          </div>
        )}

        {article.summary && (
          <div style={{ marginBottom: "28px" }}>
            <p style={{ fontSize: "11px", color: "#534ab7", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>English Summary</p>
            <p style={{ fontSize: "13px", color: "#5f5e5a", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
              {article.summary}
            </p>
          </div>
        )}

        <hr style={{ border: "none", borderTop: "0.5px solid #1e1e30", marginBottom: "24px" }} />

        
<a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", fontSize: "13px", color: "#7f77dd", border: "0.5px solid #534ab7", padding: "10px 20px", borderRadius: "20px", textDecoration: "none" }}>元記事を読む</a>      </main>
    </div>
  );
}