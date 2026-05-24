import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string | null;
  published_at: string | null;
  summary: string | null;
  summary_ja: string | null;
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ApprovedPage() {
  const supabase = createServerSupabaseClient();
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, url, source, published_at, summary, summary_ja")
    .eq("status", "approved")
    .order("published_at", { ascending: false });

  if (error) throw error;

  const items = (articles ?? []) as Article[];

  return (
    <div style={{ background: "var(--ms-bg)", minHeight: "100vh" }}>
      <nav style={{ background: "var(--ms-bg-nav)", borderBottom: "0.5px solid var(--ms-border-nav)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "15px", fontWeight: 500, color: "#c8c4ff", letterSpacing: "0.06em" }}>
          Mirai<span style={{ color: "var(--ms-accent-light)" }}>Signal</span>
        </div>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <Link href="/" style={{ fontSize: "12px", color: "var(--ms-text-secondary)", textDecoration: "none" }}>承認待ち</Link>
          <span style={{ fontSize: "12px", color: "var(--ms-accent-light)", borderBottom: "1px solid var(--ms-accent)", paddingBottom: "2px" }}>承認済み</span>
        </div>
      </nav>

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: "28px" }}>
          <p style={{ fontSize: "11px", color: "var(--ms-accent)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
            Approved Articles
          </p>
          <h1 style={{ fontSize: "22px", fontWeight: 500, color: "#e8e6ff", margin: "0 0 6px" }}>
            承認済み記事
          </h1>
          <p style={{ fontSize: "13px", color: "var(--ms-text-secondary)", margin: 0 }}>
            公開候補として承認された記事一覧
          </p>
        </div>

        <hr style={{ border: "none", borderTop: "0.5px solid var(--ms-border)", marginBottom: "20px" }} />

        {items.length === 0 ? (
          <p style={{ color: "var(--ms-text-secondary)", fontSize: "14px" }}>承認済みの記事がありません。</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            {items.map((article) => (
              <li key={article.id} style={{ background: "var(--ms-bg-card)", border: "0.5px solid var(--ms-border)", borderLeft: "2px solid var(--ms-accent)", borderRadius: "0 8px 8px 0", padding: "18px" }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", color: "var(--ms-accent-light)", background: "var(--ms-accent-dim)", padding: "2px 8px", borderRadius: "20px" }}>
                    {article.source ?? "-"}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--ms-text-muted)" }}>
                    {formatDate(article.published_at)}
                  </span>
                </div>
                <h2 style={{ fontSize: "14px", fontWeight: 500, margin: "0 0 8px", lineHeight: 1.5 }}>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ms-text-primary)", textDecoration: "none" }}>
                    {article.title}
                  </a>
                </h2>
                <p style={{ fontSize: "12px", color: "var(--ms-text-secondary)", lineHeight: 1.7, margin: 0 }}>
                  {article.summary_ja ?? article.summary ?? "-"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}