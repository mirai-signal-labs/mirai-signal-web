import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "mirai2026signaladmin";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string | null;
  published_at: string | null;
  summary: string | null;
  summary_ja: string | null;
  score: number | null;
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
  revalidatePath("/admin");
}

async function rejectArticle(id: string) {
  "use server";
  const supabase = createServerSupabaseClient();
  await supabase.from("articles").update({ status: "rejected" }).eq("id", id);
  revalidatePath("/admin");
}

async function login(formData: FormData) {
  "use server";
  const password = formData.get("password");
  if (password === ADMIN_PASSWORD) {
    const { cookies } = await import("next/headers");
    (await cookies()).set("admin_auth", "1", { httpOnly: true, path: "/" });
  }
  redirect("/admin");
}

async function logout() {
  "use server";
  const { cookies } = await import("next/headers");
  (await cookies()).delete("admin_auth");
  redirect("/admin");
}

export default async function AdminPage() {
  const { cookies } = await import("next/headers");
  const isAuth = (await cookies()).get("admin_auth")?.value === "1";

  if (!isAuth) {
    return (
      <div style={{ background: "var(--ms-bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "var(--ms-bg-card)", border: "0.5px solid var(--ms-border)", borderRadius: "12px", padding: "32px", width: "320px" }}>
          <div style={{ fontSize: "15px", fontWeight: 500, color: "#c8c4ff", marginBottom: "24px", textAlign: "center" }}>
            Mirai<span style={{ color: "var(--ms-accent-light)" }}>Signal</span> Admin
          </div>
          <form action={login}>
            <input
              type="password"
              name="password"
              placeholder="パスワード"
              style={{ width: "100%", padding: "10px 12px", background: "#0e0e1a", border: "0.5px solid var(--ms-border)", borderRadius: "6px", color: "var(--ms-text-primary)", fontSize: "14px", marginBottom: "12px", boxSizing: "border-box" }}
            />
            <button type="submit" style={{ width: "100%", padding: "10px", background: "var(--ms-accent)", border: "none", borderRadius: "6px", color: "#fff", fontSize: "14px", cursor: "pointer" }}>
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, url, source, published_at, summary, summary_ja, score")
    .in("status", ["summarized", "translated"])
    .order("published_at", { ascending: false });

  if (error) throw error;

  const items = (articles ?? []) as Article[];

  return (
    <div style={{ background: "var(--ms-bg)", minHeight: "100vh" }}>
      <nav style={{ background: "var(--ms-bg-nav)", borderBottom: "0.5px solid var(--ms-border-nav)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "15px", fontWeight: 500, color: "#c8c4ff", letterSpacing: "0.06em" }}>
          Mirai<span style={{ color: "var(--ms-accent-light)" }}>Signal</span>
          <span style={{ fontSize: "11px", color: "var(--ms-accent)", marginLeft: "10px" }}>ADMIN</span>
        </div>
        <form action={logout}>
          <button type="submit" style={{ fontSize: "12px", color: "var(--ms-text-secondary)", background: "transparent", border: "none", cursor: "pointer" }}>
            ログアウト
          </button>
        </form>
      </nav>

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 500, color: "#e8e6ff", margin: "0 0 4px" }}>
            承認待ち記事
          </h1>
          <p style={{ fontSize: "13px", color: "var(--ms-text-secondary)", margin: 0 }}>
            {items.length}件
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
{article.score && (
  <span style={{ marginLeft: 'auto', fontSize: '11px', color: article.score >= 40 ? '#1d9e75' : article.score >= 30 ? '#7f77dd' : '#888780', background: '#0e0e1a', padding: '2px 8px', borderRadius: '4px', border: '0.5px solid #1e1e30' }}>
    {article.score}/50
  </span>
)}
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
