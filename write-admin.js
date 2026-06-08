const fs = require('fs');
const path = require('path');

const content = `import { createServerSupabaseClient } from "@/lib/supabase/server";
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
  domain: string | null;
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 承認待ち → 承認済み
async function approveArticle(id: string) {
  "use server";
  const supabase = createServerSupabaseClient();
  await supabase.from("articles").update({ status: "approved" }).eq("id", id);
  revalidatePath("/admin");
}

// 承認待ち → 却下
async function rejectArticle(id: string) {
  "use server";
  const supabase = createServerSupabaseClient();
  await supabase.from("articles").update({ status: "rejected" }).eq("id", id);
  revalidatePath("/admin");
}

// 承認済み → 承認待ちに戻す
async function unapproveArticle(id: string) {
  "use server";
  const supabase = createServerSupabaseClient();
  await supabase.from("articles").update({ status: "translated" }).eq("id", id);
  revalidatePath("/admin");
}

// 却下済み → 承認待ちに戻す
async function restoreArticle(id: string) {
  "use server";
  const supabase = createServerSupabaseClient();
  await supabase.from("articles").update({ status: "translated" }).eq("id", id);
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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
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

  // URLのtabパラメータでタブを切り替える（デフォルトは承認待ち）
  const { tab = "pending" } = await searchParams;

  const supabase = createServerSupabaseClient();

  // タブに応じてステータスを切り替え
  const statusMap: Record<string, string[]> = {
    pending: ["summarized", "translated"],
    approved: ["approved"],
    rejected: ["rejected"],
  };
  const statuses = statusMap[tab] ?? ["summarized", "translated"];

  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, url, source, published_at, summary, summary_ja, score, domain")
    .in("status", statuses)
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const items = (articles ?? []) as Article[];

  // タブのラベルと色
  const tabs = [
    { key: "pending",  label: "承認待ち", color: "var(--ms-accent-light)" },
    { key: "approved", label: "承認済み", color: "#1d9e75" },
    { key: "rejected", label: "却下済み", color: "#e05a5a" },
  ];

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

        {/* タブ切り替え */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "0.5px solid var(--ms-border)", paddingBottom: "0" }}>
          {tabs.map((t) => (
            <a
              key={t.key}
              href={\`/admin?tab=\${t.key}\`}
              style={{
                fontSize: "13px",
                padding: "8px 16px",
                borderRadius: "6px 6px 0 0",
                textDecoration: "none",
                color: tab === t.key ? t.color : "var(--ms-text-secondary)",
                borderBottom: tab === t.key ? \`2px solid \${t.color}\` : "2px solid transparent",
                fontWeight: tab === t.key ? 500 : 400,
              }}
            >
              {t.label}
            </a>
          ))}
        </div>

        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "13px", color: "var(--ms-text-secondary)", margin: 0 }}>
            {items.length}件
          </p>
        </div>

        <hr style={{ border: "none", borderTop: "0.5px solid var(--ms-border)", marginBottom: "20px" }} />

        {items.length === 0 ? (
          <p style={{ color: "var(--ms-text-secondary)", fontSize: "14px" }}>記事がありません。</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            {items.map((article) => (
              <li key={article.id} style={{
                background: "var(--ms-bg-card)",
                border: "0.5px solid var(--ms-border)",
                borderLeft: \`2px solid \${
                  tab === "approved" ? "#1d9e75" :
                  tab === "rejected" ? "#e05a5a" :
                  "var(--ms-accent)"
                }\`,
                borderRadius: "0 8px 8px 0",
                padding: "18px"
              }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "10px", color: "var(--ms-accent-light)", background: "var(--ms-accent-dim)", padding: "2px 8px", borderRadius: "20px" }}>
                    {article.source ?? "-"}
                  </span>
                  {article.domain && (
                    <span style={{ fontSize: "10px", color: "#a0a0c0", background: "#12121e", padding: "2px 8px", borderRadius: "20px", border: "0.5px solid #2a2a40" }}>
                      {article.domain.toUpperCase()}
                    </span>
                  )}
                  <span style={{ fontSize: "11px", color: "var(--ms-text-muted)" }}>
                    {formatDate(article.published_at)}
                  </span>
                  {article.score != null && (
                    <span style={{
                      marginLeft: "auto",
                      fontSize: "11px",
                      color: article.score >= 40 ? "#1d9e75" : article.score >= 30 ? "#7f77dd" : "#888780",
                      background: "#0e0e1a",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      border: "0.5px solid #1e1e30"
                    }}>
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
                  {/* 承認待ちタブ：承認・却下ボタン */}
                  {tab === "pending" && (
                    <>
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
                    </>
                  )}

                  {/* 承認済みタブ：承認取り消しボタン */}
                  {tab === "approved" && (
                    <form action={unapproveArticle.bind(null, article.id)}>
                      <button type="submit" style={{ fontSize: "11px", padding: "4px 14px", borderRadius: "4px", border: "0.5px solid #555", color: "#999", background: "transparent", cursor: "pointer" }}>
                        承認取り消し
                      </button>
                    </form>
                  )}

                  {/* 却下済みタブ：再審査ボタン */}
                  {tab === "rejected" && (
                    <form action={restoreArticle.bind(null, article.id)}>
                      <button type="submit" style={{ fontSize: "11px", padding: "4px 14px", borderRadius: "4px", border: "0.5px solid var(--ms-accent)", color: "var(--ms-accent-light)", background: "transparent", cursor: "pointer" }}>
                        再審査
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
`;

const outputPath = path.join(process.cwd(), 'src', 'app', 'admin', 'page.tsx');
fs.writeFileSync(outputPath, content, 'utf8');
console.log('書き込み完了: ' + outputPath);
