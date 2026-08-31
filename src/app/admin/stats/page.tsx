import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/supabase/auth";
import AdminLogin from "@/app/components/AdminLogin";
import AdminNav from "@/app/components/AdminNav";

// ── 型定義 ────────────────────────────────────────────────────────

// 集計に使う軽い行（全件取得するのでカラムを絞る）
type StatRow = {
  source: string | null;
  domain: string | null;
  status: string | null;
  score: number | null;
  created_at: string | null;
  approved_at: string | null;
};

// 掲載記事一覧に使う行
type PublishedRow = {
  id: string;
  title: string;
  title_ja: string | null;
  summary_ja: string | null;
  url: string;
  source: string | null;
  domain: string | null;
  score: number | null;
  approved_at: string | null;
};

// 期間の指定。"7" と "30" は日数、"all" は全期間
type Period = "7" | "30" | "all";

// ── 集計用のヘルパー ──────────────────────────────────────────────

const PAGE_SIZE = 1000;

// Supabaseは1回のクエリで最大1000件しか返さないので、
// rangeをずらしながら全件取得する
async function fetchAllStatRows(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  sinceISO: string | null,
): Promise<StatRow[]> {
  const all: StatRow[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("articles")
      .select("source, domain, status, score, created_at, approved_at")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (sinceISO) query = query.gte("created_at", sinceISO);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...(data as StatRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

// パーセント表示。分母が0のときは "-"
function pct(n: number, d: number): string {
  if (d === 0) return "-";
  return ((n / d) * 100).toFixed(1) + "%";
}

// 前期間との差分を "+3.2pt" のような文字列にする
function deltaLabel(current: number, previous: number, unit: "件" | "pt"): string {
  const diff = current - previous;
  const sign = diff > 0 ? "+" : "";
  if (unit === "pt") return sign + diff.toFixed(1) + "pt";
  return sign + diff + "件";
}

// レビュー済み（approved_atが入っている）かどうか
const isReviewed = (r: StatRow) => r.approved_at !== null;
// 掲載されたかどうか
const isPublished = (r: StatRow) => r.status === "approved";

// domain / source の表示名。nullは "(未分類)"
const domName = (r: StatRow) => r.domain ?? "(未分類)";
const srcName = (r: StatRow) => r.source ?? "(不明)";

// 日付文字列がJSTで期間内かどうかを判定する
function inRange(iso: string | null, startMs: number, endMs: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !isNaN(t) && t >= startMs && t < endMs;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const d = new Date(dateString);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(5, 10).replace("-", "/");
}

// ── スタイル ──────────────────────────────────────────────────────

const card = {
  background: "var(--ms-bg-card)",
  border: "0.5px solid var(--ms-border)",
  borderRadius: "10px",
  padding: "20px",
  marginBottom: "24px",
} as const;

const sectionTitle = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--ms-text-secondary)",
  letterSpacing: "0.08em",
  margin: "0 0 16px",
  textTransform: "uppercase",
} as const;

const th = {
  textAlign: "left",
  fontSize: "10px",
  fontWeight: 500,
  color: "var(--ms-text-muted)",
  padding: "6px 8px",
  borderBottom: "0.5px solid var(--ms-border)",
  whiteSpace: "nowrap",
} as const;

const td = {
  fontSize: "12px",
  color: "var(--ms-text-primary)",
  padding: "7px 8px",
  borderBottom: "0.5px solid var(--ms-border-soft, var(--ms-border))",
  whiteSpace: "nowrap",
} as const;

// ── ページ本体 ────────────────────────────────────────────────────

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; domains?: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    return <AdminLogin />;
  }

  const params = await searchParams;
  const period: Period =
    params.period === "30" ? "30" : params.period === "all" ? "all" : "7";

  // 選択中の領域フィルタ。"ai,robotics" のようなカンマ区切り文字列で受け取る
  // 空の場合はフィルタなし（全件表示）
  const selectedDomains = (params.domains ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d.length > 0);

  const supabase = createServerSupabaseClient();

  // ── 期間の境界を決める ──────────────────────────────────────────
  const nowMs = Date.now();
  const days = period === "all" ? null : parseInt(period, 10);

  // 今期間の開始時刻
  const currentStartMs = days ? nowMs - days * 24 * 60 * 60 * 1000 : 0;
  // 前期間の開始時刻（比較用。今期間と同じ長さだけ遡る）
  const previousStartMs = days ? currentStartMs - days * 24 * 60 * 60 * 1000 : 0;

  // 取得範囲。比較のため前期間の分まで遡って取る
  const fetchSince = days ? new Date(previousStartMs).toISOString() : null;

  const rows = await fetchAllStatRows(supabase, fetchSince);

  // ── 期間で行を振り分ける ────────────────────────────────────────
  // 収集数は created_at、レビューと掲載は approved_at を基準にする
  const collectedNow = rows.filter((r) =>
    days ? inRange(r.created_at, currentStartMs, nowMs) : true,
  );
  const collectedPrev = rows.filter((r) =>
    days ? inRange(r.created_at, previousStartMs, currentStartMs) : false,
  );

  const reviewedNow = rows.filter(
    (r) => isReviewed(r) && (days ? inRange(r.approved_at, currentStartMs, nowMs) : true),
  );
  const reviewedPrev = rows.filter(
    (r) =>
      isReviewed(r) && (days ? inRange(r.approved_at, previousStartMs, currentStartMs) : false),
  );

  const publishedNow = reviewedNow.filter(isPublished);
  const publishedPrev = reviewedPrev.filter(isPublished);

  const rateNow = reviewedNow.length ? (publishedNow.length / reviewedNow.length) * 100 : 0;
  const ratePrev = reviewedPrev.length ? (publishedPrev.length / reviewedPrev.length) * 100 : 0;

  // ── スコア帯ごとの掲載率 ────────────────────────────────────────
  // レビュー済みの記事だけを対象にする（未レビューは判断結果がないため）
  const bucketMap = new Map<number, { reviewed: number; published: number }>();
  for (const r of reviewedNow) {
    if (r.score === null) continue;
    const lo = Math.floor(r.score / 5) * 5;
    const cur = bucketMap.get(lo) ?? { reviewed: 0, published: 0 };
    cur.reviewed += 1;
    if (isPublished(r)) cur.published += 1;
    bucketMap.set(lo, cur);
  }
  const buckets = [...bucketMap.entries()].sort((a, b) => a[0] - b[0]);

  // ── 領域別 ──────────────────────────────────────────────────────
  const domainKeys = [...new Set(rows.map(domName))];
  const domainStats = domainKeys
    .map((key) => {
      const collected = collectedNow.filter((r) => domName(r) === key).length;
      const reviewed = reviewedNow.filter((r) => domName(r) === key);
      const published = reviewed.filter(isPublished).length;
      return {
        key,
        collected,
        reviewed: reviewed.length,
        published,
        rate: reviewed.length ? published / reviewed.length : 0,
      };
    })
    .filter((d) => d.collected > 0 || d.reviewed > 0)
    .sort((a, b) => b.rate - a.rate);

  // ── ソース別 ────────────────────────────────────────────────────
  const sourceKeys = [...new Set(rows.map(srcName))];
  const sourceStats = sourceKeys
    .map((key) => {
      const collected = collectedNow.filter((r) => srcName(r) === key).length;
      const reviewed = reviewedNow.filter((r) => srcName(r) === key);
      const published = reviewed.filter(isPublished).length;
      return {
        key,
        collected,
        reviewed: reviewed.length,
        published,
        rate: reviewed.length ? published / reviewed.length : 0,
        yield: collected ? published / collected : 0,
      };
    })
    .filter((s) => s.collected > 0 || s.reviewed > 0)
    .sort((a, b) => b.yield - a.yield);

  // ── 掲載記事の一覧 ──────────────────────────────────────────────
  // フィルタは一覧にだけ効かせる（上の統計は全領域のまま）
  let listQuery = supabase
    .from("articles")
    .select("id, title, title_ja, summary_ja, url, source, domain, score, approved_at")
    .eq("status", "approved")
    .order("score", { ascending: false })
    .limit(100);

  if (days) listQuery = listQuery.gte("approved_at", new Date(currentStartMs).toISOString());
  if (selectedDomains.length > 0) listQuery = listQuery.in("domain", selectedDomains);

  const { data: publishedList } = await listQuery;
  const articles = (publishedList ?? []) as PublishedRow[];

  // ── 期間切り替えリンク ──────────────────────────────────────────
  const periods: Array<{ key: Period; label: string }> = [
    { key: "7", label: "直近7日" },
    { key: "30", label: "直近30日" },
    { key: "all", label: "全期間" },
  ];

  // ── 領域フィルタのボタン ────────────────────────────────────────
  // 押すと選択に追加、もう一度押すと解除されるURLを組み立てる
  // domain が null の記事はフィルタで絞れないので候補から除く
  const filterableDomains = domainKeys.filter((d) => d !== "(未分類)").sort();

  function buildDomainHref(domain: string): string {
    const next = selectedDomains.includes(domain)
      ? selectedDomains.filter((d) => d !== domain)
      : [...selectedDomains, domain];
    const query = new URLSearchParams({ period });
    if (next.length > 0) query.set("domains", next.join(","));
    return `/admin/stats?${query.toString()}`;
  }

  const summaryCards = [
    {
      label: "収集",
      value: collectedNow.length,
      delta: days ? deltaLabel(collectedNow.length, collectedPrev.length, "件") : null,
      up: collectedNow.length >= collectedPrev.length,
    },
    {
      label: "レビュー",
      value: reviewedNow.length,
      delta: days ? deltaLabel(reviewedNow.length, reviewedPrev.length, "件") : null,
      up: reviewedNow.length >= reviewedPrev.length,
    },
    {
      label: "掲載",
      value: publishedNow.length,
      delta: days ? deltaLabel(publishedNow.length, publishedPrev.length, "件") : null,
      up: publishedNow.length >= publishedPrev.length,
    },
    {
      label: "掲載率",
      value: rateNow.toFixed(1) + "%",
      delta: days ? deltaLabel(rateNow, ratePrev, "pt") : null,
      up: rateNow >= ratePrev,
    },
  ];

  return (
    <div style={{ background: "var(--ms-bg)", minHeight: "100vh" }}>
      <AdminNav current="stats" />

      <main style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 24px" }}>

        {/* ── 期間切り替え ───────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
          {periods.map((p) => (
            <a
              key={p.key}
              href={`/admin/stats?period=${p.key}${selectedDomains.length > 0 ? `&domains=${selectedDomains.join(",")}` : ""}`}
              style={{
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "6px",
                textDecoration: "none",
                color: period === p.key ? "var(--ms-accent-strong)" : "var(--ms-text-secondary)",
                background: period === p.key ? "var(--ms-accent-dim)" : "transparent",
                border: `0.5px solid ${period === p.key ? "var(--ms-accent)" : "var(--ms-border)"}`,
              }}
            >
              {p.label}
            </a>
          ))}
        </div>

        {/* ── 1. サマリー ────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
          {summaryCards.map((c) => (
            <div key={c.label} style={{ ...card, marginBottom: 0, padding: "16px" }}>
              <div style={{ fontSize: "10px", color: "var(--ms-text-muted)", letterSpacing: "0.08em", marginBottom: "8px" }}>
                {c.label}
              </div>
              <div style={{ fontSize: "24px", fontWeight: 500, color: "var(--ms-text-heading)", lineHeight: 1.1 }}>
                {c.value}
              </div>
              {c.delta && (
                <div style={{ fontSize: "11px", marginTop: "6px", color: c.up ? "var(--ms-green)" : "var(--ms-error)" }}>
                  {c.delta}
                </div>
              )}
            </div>
          ))}
        </div>

        <p style={{ fontSize: "11px", color: "var(--ms-text-muted)", margin: "-8px 0 24px", lineHeight: 1.6 }}>
          収集は created_at、レビューと掲載は approved_at を基準に集計しています。
          {days ? `比較対象は直前の同じ日数です。` : "全期間表示のため前期間比はありません。"}
        </p>

        {/* ── 2. スコア帯ごとの掲載率 ────────────────────────────── */}
        <div style={card}>
          <h2 style={sectionTitle}>スコア帯ごとの掲載率</h2>
          {buckets.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--ms-text-secondary)", margin: 0 }}>
              この期間にレビューした記事がありません。
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {buckets.map(([lo, b]) => {
                const rate = (b.published / b.reviewed) * 100;
                return (
                  <div key={lo} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "11px", color: "var(--ms-text-secondary)", width: "48px", flexShrink: 0 }}>
                      {lo}-{lo + 4}
                    </span>
                    <div style={{ flex: 1, height: "10px", background: "var(--ms-bg-subtle)", borderRadius: "5px", overflow: "hidden" }}>
                      <div style={{ width: `${rate}%`, height: "100%", background: "var(--ms-accent)", borderRadius: "5px" }} />
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--ms-text-primary)", width: "48px", textAlign: "right", flexShrink: 0 }}>
                      {rate.toFixed(1)}%
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--ms-text-muted)", width: "56px", textAlign: "right", flexShrink: 0 }}>
                      {b.published}/{b.reviewed}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 3. 領域別 ──────────────────────────────────────────── */}
        <div style={card}>
          <h2 style={sectionTitle}>領域別</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>領域</th>
                  <th style={{ ...th, textAlign: "right" }}>収集</th>
                  <th style={{ ...th, textAlign: "right" }}>レビュー</th>
                  <th style={{ ...th, textAlign: "right" }}>掲載</th>
                  <th style={{ ...th, textAlign: "right" }}>掲載率</th>
                </tr>
              </thead>
              <tbody>
                {domainStats.map((d) => (
                  <tr key={d.key}>
                    <td style={td}>{d.key}</td>
                    <td style={{ ...td, textAlign: "right" }}>{d.collected}</td>
                    <td style={{ ...td, textAlign: "right" }}>{d.reviewed}</td>
                    <td style={{ ...td, textAlign: "right" }}>{d.published}</td>
                    <td style={{ ...td, textAlign: "right", color: "var(--ms-accent-strong)" }}>
                      {pct(d.published, d.reviewed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 4. ソース別 ────────────────────────────────────────── */}
        <div style={card}>
          <h2 style={sectionTitle}>ソース別</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>ソース</th>
                  <th style={{ ...th, textAlign: "right" }}>収集</th>
                  <th style={{ ...th, textAlign: "right" }}>レビュー</th>
                  <th style={{ ...th, textAlign: "right" }}>掲載</th>
                  <th style={{ ...th, textAlign: "right" }}>掲載率</th>
                  <th style={{ ...th, textAlign: "right" }}>歩留まり</th>
                </tr>
              </thead>
              <tbody>
                {sourceStats.map((s) => (
                  <tr key={s.key}>
                    <td style={td}>{s.key}</td>
                    <td style={{ ...td, textAlign: "right" }}>{s.collected}</td>
                    <td style={{ ...td, textAlign: "right" }}>{s.reviewed}</td>
                    <td style={{ ...td, textAlign: "right" }}>{s.published}</td>
                    <td style={{ ...td, textAlign: "right" }}>{pct(s.published, s.reviewed)}</td>
                    <td style={{ ...td, textAlign: "right", color: "var(--ms-accent-strong)" }}>
                      {pct(s.published, s.collected)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "11px", color: "var(--ms-text-muted)", margin: "12px 0 0", lineHeight: 1.6 }}>
            歩留まりは 掲載 ÷ 収集。収集が多いのに歩留まりが低いソースは見直しの候補です。
          </p>
        </div>

        {/* ── 5. 掲載記事一覧 ────────────────────────────────────── */}
        <div style={card}>
          <h2 style={sectionTitle}>掲載記事（スコア順・最大100件）</h2>

          {/* 領域フィルタ。押すたびに追加・解除される */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
            {filterableDomains.map((d) => {
              const active = selectedDomains.includes(d);
              return (
                <a
                  key={d}
                  href={buildDomainHref(d)}
                  style={{
                    fontSize: "11px",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    textDecoration: "none",
                    color: active ? "var(--ms-accent-strong)" : "var(--ms-text-secondary)",
                    background: active ? "var(--ms-accent-dim)" : "transparent",
                    border: `0.5px solid ${active ? "var(--ms-accent)" : "var(--ms-border)"}`,
                  }}
                >
                  {d}
                </a>
              );
            })}
            {selectedDomains.length > 0 && (
              <a
                href={`/admin/stats?period=${period}`}
                style={{
                  fontSize: "11px",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  textDecoration: "none",
                  color: "var(--ms-text-muted)",
                  border: "0.5px solid transparent",
                }}
              >
                解除
              </a>
            )}
          </div>

          <p style={{ fontSize: "11px", color: "var(--ms-text-muted)", margin: "0 0 12px" }}>
            {articles.length}件
            {selectedDomains.length > 0 && `（${selectedDomains.join(" / ")}）`}
          </p>

          {articles.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--ms-text-secondary)", margin: 0 }}>
              条件に合う掲載記事がありません。
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
              {articles.map((a) => (
                <li
                  key={a.id}
                  style={{
                    padding: "12px 4px",
                    borderBottom: "0.5px solid var(--ms-border-soft, var(--ms-border))",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", color: "var(--ms-green)", width: "26px", flexShrink: 0, textAlign: "right" }}>
                      {a.score ?? "-"}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--ms-text-meta)", background: "var(--ms-bg-tag)", padding: "1px 7px", borderRadius: "20px", flexShrink: 0 }}>
                      {a.domain ?? "-"}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--ms-text-muted)", flexShrink: 0 }}>
                      {a.source ?? "-"}
                    </span>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "13px", color: "var(--ms-text-primary)", textDecoration: "none", lineHeight: 1.5, flex: 1 }}
                    >
                      {a.title_ja ?? a.title}
                    </a>
                    <span style={{ fontSize: "10px", color: "var(--ms-text-muted)", flexShrink: 0 }}>
                      {formatDate(a.approved_at)}
                    </span>
                  </div>
                  {a.summary_ja && (
                    <p style={{ fontSize: "12px", color: "var(--ms-text-secondary)", lineHeight: 1.7, margin: "0 0 0 36px" }}>
                      {a.summary_ja}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

      </main>
    </div>
  );
}
