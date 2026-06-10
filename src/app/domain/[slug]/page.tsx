import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const domain = DOMAINS[slug];
  if (!domain) return {};

  return {
    title: `${domain.label} - ${domain.desc}`,
    description: `海外${domain.label}分野の最新技術情報を毎日日本語で届けます。${domain.desc}に関する一次情報をAIで収集・分析・翻訳。`,
    openGraph: {
      title: `${domain.label} | Mirai Signal`,
      description: `海外${domain.label}分野の最新技術情報を毎日日本語で届けます。`,
      url: `https://mirai-signal-web-kzfb.vercel.app/domain/${slug}`,
      siteName: "Mirai Signal",
      locale: "ja_JP",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${domain.label} | Mirai Signal`,
      description: `海外${domain.label}分野の最新技術情報を毎日日本語で届けます。`,
    },
  };
}

const DOMAINS: Record<string, { label: string; desc: string }> = {
  ai: { label: "AI", desc: "LLM / Agents / AGI / OSS" },
  robotics: { label: "Robotics", desc: "Embodied AI / Autonomous Robots" },
  biotech: { label: "Biotech", desc: "Drug Discovery / Gene Editing" },
  semiconductor: { label: "Semiconductor", desc: "AI Chip / NVIDIA / HBM" },
  energy: { label: "Energy", desc: "Fusion / Battery Tech" },
  space: { label: "Space", desc: "SpaceX / Satellite AI" },
  defense: { label: "Defense", desc: "Defense AI / Drone" },
};

const LATEST_LIMIT = 10;

type Article = {
  id: string;
  title: string;
  url: string;
  source: string | null;
  published_at: string | null;
  summary: string | null;
  summary_ja: string | null;
  title_ja: string | null;
};
function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

export default async function DomainPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const domain = DOMAINS[slug];
  if (!domain) notFound();

  const supabase = createServerSupabaseClient();
  const { data: articles, count } = await supabase
    .from("articles")
	.select("id, title, url, source, published_at, summary, summary_ja, title_ja", { count: "exact" })
    .eq("status", "approved")
    .eq("domain", slug)
    .order("published_at", { ascending: false })
    .limit(LATEST_LIMIT);

  const items = (articles ?? []) as Article[];
  const totalCount = count ?? 0;
  const hasArchive = totalCount > LATEST_LIMIT;

  return (
    <div style={{ background: "#080810", minHeight: "100vh" }}>
      <style>{`
        .ms-layout { display: grid; grid-template-columns: 160px 1fr; min-height: calc(100vh - 45px); }
        .ms-sidebar { display: block; }
        .ms-domain-tabs { display: none; }
        @media (max-width: 768px) {
          .ms-layout { grid-template-columns: 1fr; }
          .ms-sidebar { display: none; }
          .ms-domain-tabs { display: flex; }
        }
      `}</style>

      <nav style={{ background: "#0b0b14", borderBottom: "0.5px solid #1e1e30", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ fontSize: "16px", fontWeight: 600, color: "#c8c4ff", letterSpacing: "0.06em", textDecoration: "none" }}>
          Mirai<span style={{ color: "#7f77dd" }}>Signal</span>
        </Link>
        <Link href="/admin" style={{ fontSize: "11px", color: "#444441", textDecoration: "none" }}>Admin</Link>
      </nav>

      <div className="ms-domain-tabs" style={{ overflowX: "auto", borderBottom: "0.5px solid #1e1e30", background: "#0b0b14" }}>
        {Object.entries(DOMAINS).map(([key, d]) => (
          <Link key={key} href={"/domain/" + key} style={{ fontSize: "11px", color: key === slug ? "#afa9ec" : "#444441", padding: "10px 14px", whiteSpace: "nowrap", textDecoration: "none", display: "block", borderBottom: key === slug ? "2px solid #534ab7" : "2px solid transparent" }}>
            {d.label}
          </Link>
        ))}
      </div>

      <div className="ms-layout">
        <aside className="ms-sidebar" style={{ background: "#0b0b14", borderRight: "0.5px solid #1e1e30", padding: "20px 0" }}>
          <div style={{ padding: "0 14px 16px", borderBottom: "0.5px solid #1e1e30", marginBottom: "8px" }}>
            <p style={{ fontSize: "10px", color: "#534ab7", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 6px", fontWeight: 500 }}>Detecting the Signals</p>
            <p style={{ fontSize: "12px", color: "#888780", margin: 0, lineHeight: 1.5 }}>Read the future first</p>
          </div>
          {Object.entries(DOMAINS).map(([key, d]) => (
            <Link key={key} href={"/domain/" + key} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: key === slug ? "#afa9ec" : "#444441", padding: "7px 14px", textDecoration: "none", background: key === slug ? "#14142a" : "transparent", borderRight: key === slug ? "2px solid #534ab7" : "2px solid transparent" }}>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: key === slug ? "#534ab7" : "#1e1e30", flexShrink: 0 }}></span>
              {d.label}
            </Link>
          ))}
        </aside>

        <main style={{ padding: "24px" }}>
          <div style={{ marginBottom: "24px", borderBottom: "0.5px solid #1e1e30", paddingBottom: "16px" }}>
            <p style={{ fontSize: "10px", color: "#534ab7", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px" }}>{domain.label}</p>
            <h1 style={{ fontSize: "18px", fontWeight: 500, color: "#e8e6ff", margin: "0 0 6px" }}>{domain.desc}</h1>
            <p style={{ fontSize: "12px", color: "#444441", margin: 0 }}>最新{items.length}件 / 全{totalCount}件</p>
          </div>

          {items.length === 0 ? (
            <p style={{ color: "#5f5e5a", fontSize: "14px" }}>記事がありません。</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              {items.map((article) => (
                <li key={article.id} style={{ background: "#0e0e1a", border: "0.5px solid #1e1e30", borderLeft: "2px solid #534ab7", borderRadius: "0 8px 8px 0", padding: "16px" }}>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", color: "#7f77dd", background: "#1a1830", padding: "2px 8px", borderRadius: "20px" }}>{article.source ?? "-"}</span>
                    <span style={{ fontSize: "11px", color: "#3c3489" }}>{formatDate(article.published_at)}</span>
                  </div>
                  <h2 style={{ fontSize: "14px", fontWeight: 500, margin: "0 0 8px", lineHeight: 1.5 }}>
                    <Link href={"/article/" + article.id} style={{ color: "#afa9ec", textDecoration: "none" }}>
  {article.title_ja ?? article.title}
</Link>
{article.title_ja && (
  <p style={{ fontSize: "11px", color: "#444441", margin: "4px 0 0", lineHeight: 1.5 }}>{article.title}</p>
)}

                  </h2>
                  <p style={{ fontSize: "12px", color: "#5f5e5a", lineHeight: 1.7, margin: 0 }}>
                    {article.summary_ja ?? article.summary ?? "-"}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {hasArchive && (
            <div style={{ marginTop: "24px", textAlign: "center" }}>
              <Link href={"/domain/" + slug + "/archive"} style={{ fontSize: "13px", color: "#534ab7", textDecoration: "none", border: "0.5px solid #534ab7", padding: "8px 20px", borderRadius: "20px", display: "inline-block" }}>
                アーカイブを見る（全{totalCount}件）
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}