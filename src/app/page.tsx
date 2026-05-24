import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string | null;
  published_at: string | null;
  summary_ja: string | null;
  summary: string | null;
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function approveArticle(id: string) {
  "use server";
  const supabase = createServerSupabaseClient();
  await supabase.from("articles").update({ status: "approved" }).eq("id", id);
  revalidatePath("/");
}

async function rejectArticle(id: string) {
  "use server";
  const supabase = createServerSupabaseClient();
  await supabase.from("articles").update({ status: "rejected" }).eq("id", id);
  revalidatePath("/");
}

export default async function Home() {
  const supabase = createServerSupabaseClient();
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, url, source, published_at, summary, summary_ja")
    .in("status", ["summarized", "translated"])
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
          <span style={{ fontSize: "12px", color: "var(--ms-accent-light)", borderBottom: "1px solid var(--ms-accent)", paddingBottom: "2px" }}>承認待ち</span>
          <Link href="/approved" style={{ fontSize: "12px", color: "var(--ms-text-secondary)", textDecoration: "none" }}>承認済み</Link>
        </div>
      </nav>

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: "28px" }}>
          <p style={{ fontSize: "11px", color: "var(--ms-accent)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
            Detecting the Signals of Tomorrow
          </p>
          <h1 style={{ fontSize: "22px", fontWeight: 500, color: "#e8e6ff", margin: "0 0 6px" }}>
            未来の兆候を、先に読む
          </h1>
          <p style={{ fontSize: "13px", color: "var(--ms-text-secondary)", margin: 0 }}>
            海外AI・テクノロジー情報の要約一覧
          </p>
        </div>

        <hr style={{ border: "none", borderTop: "0.5px solid var(--ms-border)", marginBottom: "20px" }} />

        {items.length === 0 ? (
          <p style={{ color: "var(--ms-text-secondary)", fontSize: "14px" }}>承認待ちの記事がありません。</p>
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
                <p style={{ fontSize: "12px", color: "var(--ms-text-secondary)", lineHeight: 1.7, margin: "0 0 14px" }}>
                  {article.summary_ja ?? article.summary ?? "-"}
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <form action={approveArticle.bind(null, article.id)}>
                    <button type="submit" style={{ fontSize: "11px", padding: "4px 14px", borderRadius: "4px", border: "0.5px solid var(--ms-green-border)", color: "var(--ms-green)", background: "transparent", cursor: "pointer" }}>
                      承認
                    </button>
                  </form>
                  <form action={rejectArticle.bind(null, article.id)}>
                    <button type="submit" style={{ fontSize: "11px", padding: "4px 14px", borderRadius: "4px", border: "0.5px solid var(--ms-red-border)", color: "var(--ms-red)", background: "transparent", cursor: "pointer" }}>
                      却下
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}