/**
 * scripts/monthly-stats.ts
 *
 * Aggregates the articles table into a monthly statistics report.
 *
 * Funnel model (2 stages):
 *   stage 1  collected   : every row
 *   stage 2  ai_passed   : approved_at IS NOT NULL  (score threshold, automatic)
 *   stage 3  published   : status = 'approved'      (human decision, only meaningful within ai_passed)
 *
 * ai_pass_rate    = ai_passed / collected
 * human_pass_rate = published / ai_passed   <- the editorial statistic
 *
 * Output: console + reports/stats-<YYYY-MM-DD>.md
 * Run: npx tsx scripts/monthly-stats.ts
 *
 * NOTE: This file is intentionally ASCII-only.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// --- config -------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PAGE_SIZE = 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * Rows newer than this many days are excluded from human-decision stats,
 * because they may simply not have been reviewed yet.
 * Set to 0 if unreviewed rows have a distinct status value.
 */
const REVIEW_CUTOFF_DAYS = 3;

// --- types --------------------------------------------------------------

type Row = {
  id: string;
  source: string | null;
  domain: string | null;
  status: string | null;
  score: number | null;
  published_at: string | null;
  created_at: string | null;
  approved_at: string | null;
};

// --- helpers ------------------------------------------------------------

const aiPassed = (r: Row) => r.approved_at !== null;
const published = (r: Row) => r.status === "approved";
const dom = (r: Row) => r.domain || "(null)";
const src = (r: Row) => r.source || "(null)";

function monthKey(iso: string | null): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "unknown";
  return new Date(d.getTime() + JST_OFFSET_MS).toISOString().slice(0, 7);
}

function pct(n: number, d: number): string {
  if (d === 0) return "-";
  return ((n / d) * 100).toFixed(1) + "%";
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function table(headers: string[], rows: string[][]): string {
  const head = "| " + headers.join(" | ") + " |";
  const sep = "|" + headers.map(() => " --- ").join("|") + "|";
  const body = rows.map((r) => "| " + r.join(" | ") + " |").join("\n");
  return [head, sep, body].join("\n");
}

function groupBy(rows: Row[], keyFn: (r: Row) => string): Map<string, Row[]> {
  const m = new Map<string, Row[]>();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    (m.get(k) as Row[]).push(r);
  }
  return m;
}

// --- fetch --------------------------------------------------------------

async function fetchAll(): Promise<Row[]> {
  const all: Row[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("articles")
      .select(
        "id,source,domain,status,score,published_at,created_at,approved_at"
      )
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...(data as Row[]));
    process.stdout.write("fetched: " + all.length + "\r");

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  process.stdout.write("\n");
  return all;
}

// --- sections -----------------------------------------------------------

function sectionIntegrity(rows: Row[]): string {
  const statuses = [...new Set(rows.map((r) => (r.status === null ? "(null)" : r.status)))];

  // status x ai_passed cross tab
  const cross = statuses.map((s) => {
    const rs = rows.filter((r) => (r.status === null ? "(null)" : r.status) === s);
    const p = rs.filter(aiPassed).length;
    return [s, String(p), String(rs.length - p), String(rs.length)];
  });

  const passedScores = rows
    .filter((r) => aiPassed(r) && r.score !== null)
    .map((r) => r.score as number);
  const failedScores = rows
    .filter((r) => !aiPassed(r) && r.score !== null)
    .map((r) => r.score as number);

  const domainNull = rows.filter((r) => r.domain === null);
  const domainNullPassed = domainNull.filter(aiPassed).length;

  const lines: string[] = [];
  lines.push("## 1. Data integrity");
  lines.push("");
  lines.push("total rows: " + rows.length);
  lines.push("");
  lines.push(table(["status", "ai_passed", "ai_failed", "total"], cross));
  lines.push("");
  lines.push(
    "-> If a large number of rows are (status=rejected, ai_failed), those were never seen by a human."
  );
  lines.push(
    "   Human pass rate must be computed only over the ai_passed column."
  );
  lines.push("");
  lines.push("### score threshold check");
  lines.push(
    "ai_passed score min : " + (passedScores.length ? Math.min(...passedScores) : "-")
  );
  lines.push(
    "ai_failed score max : " + (failedScores.length ? Math.max(...failedScores) : "-")
  );
  lines.push(
    "-> If min > max, the threshold is clean. If they overlap, the threshold changed over time."
  );
  lines.push("");
  lines.push("### missing values");
  lines.push(
    "domain IS NULL : " +
      domainNull.length +
      " (" +
      pct(domainNull.length, rows.length) +
      "), of which ai_passed: " +
      domainNullPassed
  );
  lines.push("score IS NULL  : " + rows.filter((r) => r.score === null).length);
  lines.push(
    "-> domain NULL among ai_passed rows means a classification failure on an article that reached the review queue."
  );
  return lines.join("\n");
}

function sectionMonthly(rows: Row[], reviewed: Row[]): string {
  const months = groupBy(rows, (r) => monthKey(r.created_at));
  const reviewedMonths = groupBy(reviewed, (r) => monthKey(r.created_at));

  const body = [...months.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([m, rs]) => {
      const passed = rs.filter(aiPassed).length;
      const days = new Set(rs.map((r) => (r.created_at || "").slice(0, 10))).size;
      const rv = reviewedMonths.get(m) || [];
      const rvPassed = rv.filter(aiPassed);
      const pub = rvPassed.filter(published).length;
      return [
        m,
        String(rs.length),
        (rs.length / Math.max(days, 1)).toFixed(1),
        String(passed),
        pct(passed, rs.length),
        String(pub),
        pct(pub, rvPassed.length),
      ];
    });

  return [
    "## 2. Monthly funnel (by created_at, JST)",
    "",
    table(
      [
        "month",
        "collected",
        "per day",
        "ai_passed",
        "ai pass rate",
        "published",
        "human pass rate",
      ],
      body
    ),
    "",
    "human pass rate = published / ai_passed, excluding the last " +
      REVIEW_CUTOFF_DAYS +
      " days.",
  ].join("\n");
}

function sectionDomainByMonth(rows: Row[]): string {
  const domains = [...new Set(rows.map(dom))].sort();
  const months = [...new Set(rows.map((r) => monthKey(r.created_at)))].sort();

  const body = domains.map((d) => {
    const cells = months.map((m) => {
      const inMonth = rows.filter((r) => monthKey(r.created_at) === m);
      const n = inMonth.filter((r) => dom(r) === d).length;
      return n + " (" + pct(n, inMonth.length) + ")";
    });
    return [d, ...cells, String(rows.filter((r) => dom(r) === d).length)];
  });

  return [
    "## 3. Collected articles by domain x month",
    "",
    "Share is within the month. NOTE: this reflects the RSS source mix, not the world.",
    "Do not publish this table on its own.",
    "",
    table(["domain", ...months, "total"], body),
  ].join("\n");
}

function sectionDomainFunnel(rows: Row[], reviewed: Row[]): string {
  const domains = [...new Set(rows.map(dom))].sort();

  const body = domains
    .map((d) => {
      const rs = rows.filter((r) => dom(r) === d);
      const passed = rs.filter(aiPassed);
      const rv = reviewed.filter((r) => dom(r) === d && aiPassed(r));
      const pub = rv.filter(published);
      const scores = rs.filter((r) => r.score !== null).map((r) => r.score as number);
      return {
        d,
        n: rs.length,
        passed: passed.length,
        aiRate: rs.length ? passed.length / rs.length : 0,
        rv: rv.length,
        pub: pub.length,
        humanRate: rv.length ? pub.length / rv.length : 0,
        meanScore: mean(scores),
      };
    })
    .sort((x, y) => y.humanRate - x.humanRate)
    .map((x) => [
      x.d,
      String(x.n),
      String(x.passed),
      pct(x.passed, x.n),
      String(x.pub) + "/" + String(x.rv),
      pct(x.pub, x.rv),
      x.meanScore.toFixed(1),
    ]);

  return [
    "## 4. Funnel by domain (whole period)",
    "",
    "The last two columns are the editorial statistic: which domains survive human review.",
    "A gap between ai pass rate and human pass rate means the AI and the editor disagree",
    "about that domain. That gap is the most publishable finding in this report.",
    "",
    table(
      [
        "domain",
        "collected",
        "ai_passed",
        "ai pass rate",
        "published/reviewed",
        "human pass rate",
        "mean score",
      ],
      body
    ),
  ].join("\n");
}

function sectionSource(rows: Row[], reviewed: Row[]): string {
  const sources = [...new Set(rows.map(src))];

  const body = sources
    .map((s) => {
      const rs = rows.filter((r) => src(r) === s);
      const passed = rs.filter(aiPassed);
      const rv = reviewed.filter((r) => src(r) === s && aiPassed(r));
      const pub = rv.filter(published);
      const scores = rs.filter((r) => r.score !== null).map((r) => r.score as number);
      return {
        s,
        n: rs.length,
        passed: passed.length,
        rv: rv.length,
        pub: pub.length,
        meanScore: mean(scores),
        yield: rs.length ? pub.length / rs.length : 0,
      };
    })
    .sort((x, y) => y.yield - x.yield)
    .map((x) => [
      x.s,
      String(x.n),
      String(x.passed),
      pct(x.passed, x.n),
      String(x.pub) + "/" + String(x.rv),
      pct(x.pub, x.rv),
      pct(x.pub, x.n),
      x.meanScore.toFixed(1),
    ]);

  return [
    "## 5. Source efficiency",
    "",
    "final yield = published / collected. Sorted by it.",
    "A source with many collected and near-zero yield is a candidate for removal.",
    "",
    table(
      [
        "source",
        "collected",
        "ai_passed",
        "ai pass rate",
        "published/reviewed",
        "human pass rate",
        "final yield",
        "mean score",
      ],
      body
    ),
  ].join("\n");
}

function sectionScoreBuckets(rows: Row[], reviewed: Row[]): string {
  const scored = rows.filter((r) => r.score !== null);
  const bucketOf = (s: number) => {
    const lo = Math.floor(s / 5) * 5;
    return String(lo).padStart(3, "0") + "-" + String(lo + 4).padStart(3, "0");
  };

  const buckets = groupBy(scored, (r) => bucketOf(r.score as number));

  const body = [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, rs]) => {
      const passed = rs.filter(aiPassed).length;
      const rv = reviewed.filter(
        (r) => r.score !== null && bucketOf(r.score as number) === k && aiPassed(r)
      );
      const pub = rv.filter(published).length;
      return [
        k,
        String(rs.length),
        String(passed),
        String(pub) + "/" + String(rv.length),
        pct(pub, rv.length),
      ];
    });

  const all = scored.map((r) => r.score as number);

  return [
    "## 6. AI score vs human decision",
    "",
    "Within the ai_passed set, does a higher score predict publication?",
    "If the human pass rate is flat across score ranges, the score does not model",
    "editorial judgment. That gap is the starting point for Signal Score.",
    "",
    "score min/mean/median/max: " +
      Math.min(...all) +
      " / " +
      mean(all).toFixed(1) +
      " / " +
      median(all).toFixed(1) +
      " / " +
      Math.max(...all),
    "",
    table(
      ["score range", "collected", "ai_passed", "published/reviewed", "human pass rate"],
      body
    ),
  ].join("\n");
}

function sectionLag(rows: Row[]): string {
  const lags: number[] = [];
  for (const r of rows) {
    if (!r.published_at || !r.created_at) continue;
    const p = new Date(r.published_at).getTime();
    const c = new Date(r.created_at).getTime();
    if (isNaN(p) || isNaN(c)) continue;
    const h = (c - p) / (60 * 60 * 1000);
    if (h < 0) continue;
    lags.push(h);
  }
  if (lags.length === 0) return "";

  const within24 = lags.filter((h) => h <= 24).length;
  const negative = rows.length - lags.length;

  return [
    "## 7. Collection lag (published_at -> created_at, hours)",
    "",
    "samples: " + lags.length + " (excluded, missing or negative: " + negative + ")",
    "mean: " + mean(lags).toFixed(1),
    "median: " + median(lags).toFixed(1),
    "within 24h: " + within24 + " (" + pct(within24, lags.length) + ")",
    "",
    "-> This is the speed claim of the pipeline. Publishable as-is.",
  ].join("\n");
}

// --- main ---------------------------------------------------------------

async function main() {
  console.log("fetching articles ...");
  const rows = await fetchAll();

  const cutoff = Date.now() - REVIEW_CUTOFF_DAYS * 24 * 60 * 60 * 1000;
  const reviewed = rows.filter((r) => {
    if (!r.created_at) return false;
    const t = new Date(r.created_at).getTime();
    return !isNaN(t) && t < cutoff;
  });

  const dates = rows
    .map((r) => r.created_at)
    .filter((x): x is string => !!x)
    .sort();

  const report = [
    "# Mirai Signal - collection statistics",
    "",
    "generated: " + new Date().toISOString(),
    "range (created_at): " +
      (dates[0] || "-").slice(0, 10) +
      " - " +
      (dates[dates.length - 1] || "-").slice(0, 10),
    "rows: " + rows.length + " (reviewable: " + reviewed.length + ")",
    "",
    "definitions:",
    "  ai_passed = approved_at IS NOT NULL (score threshold, automatic)",
    "  published = status = 'approved' (human decision)",
    "  human pass rate = published / ai_passed, last " +
      REVIEW_CUTOFF_DAYS +
      " days excluded",
    "",
    sectionIntegrity(rows),
    "",
    sectionMonthly(rows, reviewed),
    "",
    sectionDomainByMonth(rows),
    "",
    sectionDomainFunnel(rows, reviewed),
    "",
    sectionSource(rows, reviewed),
    "",
    sectionScoreBuckets(rows, reviewed),
    "",
    sectionLag(rows),
    "",
  ].join("\n");

  console.log(report);

  const dir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const out = path.join(
    dir,
    "stats-" + new Date().toISOString().slice(0, 10) + ".md"
  );
  fs.writeFileSync(out, report, "utf8");
  console.log("written: " + out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
