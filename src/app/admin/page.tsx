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
  domain: string | null;
};

// カレンダー集計用の型
// { "2025-06-01": { approved: 3, rejected: 1 }, ... } という形で日付ごとに集計する
type DayStats = { approved: number; rejected: number };
type CalendarData = Record<string, DayStats>;

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// "2025-06-17T10:00:00Z" のような文字列から "2025-06-17" を取り出す関数
// toISOString()はUTCなので、日本時間（UTC+9）に変換してから日付文字列を作る
function toJSTDateString(isoString: string): string {
  const date = new Date(isoString);
  // JSTはUTC+9なので9時間分（ミリ秒換算）を足す
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jstDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// 承認待ち → 承認済み
async function approveArticle(id: string) {
  "use server";
  const supabase = createServerSupabaseClient();
  await supabase.from("articles").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin");
}

// 承認待ち → 却下
async function rejectArticle(id: string) {
  "use server";
  const supabase = createServerSupabaseClient();
  await supabase.from("articles").update({ status: "rejected", approved_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin");
}

// 承認済み → 承認待ちに戻す
async function unapproveArticle(id: string) {
  "use server";
  const supabase = createServerSupabaseClient();
  await supabase.from("articles").update({ status: "translated", approved_at: null }).eq("id", id);
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
  searchParams: Promise<{ tab?: string; month?: string }>;
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

  // URLのtabパラメータとmonthパラメータを取得
  const { tab = "pending", month } = await searchParams;

  const supabase = createServerSupabaseClient();

  // ── カレンダー用データ取得 ──────────────────────────────────────
  // 表示する月を決定する（monthパラメータがなければ当月）
  // monthパラメータの形式は "2025-06"
  const now = new Date();
  const nowJST = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const currentYearMonth = nowJST.toISOString().slice(0, 7); // "YYYY-MM"
  const targetMonth = month ?? currentYearMonth;

  // targetMonthから年・月を取り出す
  const [yearStr, monthStr] = targetMonth.split("-");
  const calYear = parseInt(yearStr, 10);
  const calMonth = parseInt(monthStr, 10); // 1始まり

  // カレンダー表示に必要な情報を計算する
  const firstDayOfMonth = new Date(calYear, calMonth - 1, 1); // 月の1日
  const lastDayOfMonth = new Date(calYear, calMonth, 0);      // 月の末日
  const daysInMonth = lastDayOfMonth.getDate();               // 月の日数
  const startDayOfWeek = firstDayOfMonth.getDay();            // 1日が何曜日か（0=日, 6=土）

  // 前月・次月のYYYY-MM文字列（カレンダーのナビゲーション用）
  const prevMonthDate = new Date(calYear, calMonth - 2, 1);
  const nextMonthDate = new Date(calYear, calMonth, 1);
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;

  // 対象月の開始日・終了日（Supabaseクエリ用）
  // JSTの月初0時 = UTC前日15時 なので、前後に余裕を持たせてUTCで絞る
  const rangeStart = `${targetMonth}-01T00:00:00+09:00`;
  const rangeEnd   = `${targetMonth}-${String(daysInMonth).padStart(2, "0")}T23:59:59+09:00`;

  // created_at と status だけを取得する（カレンダー用の軽いクエリ）
  const { data: calRaw } = await supabase
    .from("articles")
    .select("approved_at, status")
    .in("status", ["approved", "rejected"])
    .gte("approved_at", rangeStart)
    .lte("approved_at", rangeEnd);

  // 日付ごとに approved / rejected の件数を集計する
  const calendarData: CalendarData = {};
  for (const row of calRaw ?? []) {
    if (!row.approved_at) continue;
    const dateKey = toJSTDateString(row.approved_at); // "YYYY-MM-DD"
    if (!calendarData[dateKey]) {
      calendarData[dateKey] = { approved: 0, rejected: 0 };
    }
    if (row.status === "approved") calendarData[dateKey].approved += 1;
    if (row.status === "rejected") calendarData[dateKey].rejected += 1;
  }

  // ── 記事一覧用データ取得 ────────────────────────────────────────
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

  const tabs = [
    { key: "pending",  label: "承認待ち", color: "var(--ms-accent-light)" },
    { key: "approved", label: "承認済み", color: "#1d9e75" },
    { key: "rejected", label: "却下済み", color: "#e05a5a" },
  ];

  // 曜日ヘッダー
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  // カレンダーのグリッド用セルを生成する
  // 月の1日前の空白セル + 実際の日付セル を1つの配列にまとめる
  const calendarCells: Array<{ day: number | null }> = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells.push({ day: null }); // 空白セル
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({ day: d });
  }

  // 今日の日付文字列（ハイライト用）
  const todayStr = nowJST.toISOString().slice(0, 10);

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

        {/* ── カレンダー ─────────────────────────────────────────── */}
        <div style={{
          background: "var(--ms-bg-card)",
          border: "0.5px solid var(--ms-border)",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "32px",
        }}>
          {/* カレンダーヘッダー：月ナビゲーション */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <a
              href={`/admin?tab=${tab}&month=${prevMonth}`}
              style={{ fontSize: "13px", color: "var(--ms-text-secondary)", textDecoration: "none", padding: "4px 8px", borderRadius: "4px" }}
            >
              ← 前月
            </a>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ms-text-primary)", letterSpacing: "0.05em" }}>
              {calYear}年{calMonth}月
            </span>
            <a
              href={`/admin?tab=${tab}&month=${nextMonth}`}
              style={{ fontSize: "13px", color: "var(--ms-text-secondary)", textDecoration: "none", padding: "4px 8px", borderRadius: "4px" }}
            >
              次月 →
            </a>
          </div>

          {/* 凡例 */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "12px", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "11px", color: "#1d9e75", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#1d9e75", display: "inline-block" }} />
              承認
            </span>
            <span style={{ fontSize: "11px", color: "#e05a5a", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#e05a5a", display: "inline-block" }} />
              却下
            </span>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
            {weekDays.map((d, i) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: "10px",
                  color: i === 0 ? "#e05a5a" : i === 6 ? "#7f77dd" : "var(--ms-text-secondary)",
                  padding: "4px 0",
                  fontWeight: 500,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {calendarCells.map((cell, index) => {
              if (cell.day === null) {
                // 空白セル
                return <div key={`empty-${index}`} />;
              }

              // この日の日付文字列（例: "2025-06-17"）
              const dateKey = `${targetMonth}-${String(cell.day).padStart(2, "0")}`;
              const stats = calendarData[dateKey];
              const isToday = dateKey === todayStr;
              const dayOfWeek = (startDayOfWeek + cell.day - 1) % 7;

              return (
                <div
                  key={dateKey}
                  style={{
                    background: isToday ? "var(--ms-accent-dim)" : "#0a0a14",
                    border: isToday ? "0.5px solid var(--ms-accent)" : "0.5px solid var(--ms-border)",
                    borderRadius: "6px",
                    padding: "6px 4px",
                    minHeight: "56px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {/* 日付 */}
                  <span style={{
                    fontSize: "11px",
                    fontWeight: isToday ? 600 : 400,
                    color: dayOfWeek === 0 ? "#e05a5a" : dayOfWeek === 6 ? "#7f77dd" : isToday ? "var(--ms-accent-light)" : "var(--ms-text-secondary)",
                  }}>
                    {cell.day}
                  </span>

                  {/* 承認・却下件数（データがある日だけ表示） */}
                  {stats && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%", alignItems: "center" }}>
                      {stats.approved > 0 && (
                        <span style={{
                          fontSize: "10px",
                          color: "#1d9e75",
                          background: "#0a1f18",
                          borderRadius: "3px",
                          padding: "1px 5px",
                          lineHeight: 1.4,
                        }}>
                          ✓{stats.approved}
                        </span>
                      )}
                      {stats.rejected > 0 && (
                        <span style={{
                          fontSize: "10px",
                          color: "#e05a5a",
                          background: "#1f0a0a",
                          borderRadius: "3px",
                          padding: "1px 5px",
                          lineHeight: 1.4,
                        }}>
                          ✕{stats.rejected}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── タブ切り替え ───────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "0.5px solid var(--ms-border)", paddingBottom: "0" }}>
          {tabs.map((t) => (
            <a
              key={t.key}
              href={`/admin?tab=${t.key}${month ? `&month=${month}` : ""}`}
              style={{
                fontSize: "13px",
                padding: "8px 16px",
                borderRadius: "6px 6px 0 0",
                textDecoration: "none",
                color: tab === t.key ? t.color : "var(--ms-text-secondary)",
                borderBottom: tab === t.key ? `2px solid ${t.color}` : "2px solid transparent",
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
                borderLeft: `2px solid ${
                  tab === "approved" ? "#1d9e75" :
                  tab === "rejected" ? "#e05a5a" :
                  "var(--ms-accent)"
                }`,
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

                  {tab === "approved" && (
                    <form action={unapproveArticle.bind(null, article.id)}>
                      <button type="submit" style={{ fontSize: "11px", padding: "4px 14px", borderRadius: "4px", border: "0.5px solid #555", color: "#999", background: "transparent", cursor: "pointer" }}>
                        承認取り消し
                      </button>
                    </form>
                  )}

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
