import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/supabase/auth";
import AdminLogin from "@/app/components/AdminLogin";
import AdminNav from "@/app/components/AdminNav";

type GlossaryTerm = {
  id: string;
  term: string;
  term_en: string | null;
  explanation: string;
  domain: string | null;
  created_at: string;
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 承認済み → 却下
async function rejectTerm(id: string) {
  "use server";
  const supabase = createServerSupabaseClient();
  await supabase.from("glossary_terms").update({ status: "rejected" }).eq("id", id);
  revalidatePath("/admin/glossary");
}

// 却下済み → 承認済みに復元
async function restoreTerm(id: string) {
  "use server";
  const supabase = createServerSupabaseClient();
  await supabase.from("glossary_terms").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/glossary");
}

export default async function AdminGlossaryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    return <AdminLogin />;
  }

  const { tab = "approved" } = await searchParams;
  const status = tab === "rejected" ? "rejected" : "approved";

  const supabase = createServerSupabaseClient();

  const { data: terms, error } = await supabase
    .from("glossary_terms")
    .select("id, term, term_en, explanation, domain, created_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const items = (terms ?? []) as GlossaryTerm[];

  const tabs = [
    { key: "approved", label: "承認済み", color: "var(--ms-green)" },
    { key: "rejected", label: "却下済み", color: "var(--ms-error)" },
  ];

  return (
    <div style={{ background: "var(--ms-bg)", minHeight: "100vh" }}>
      <AdminNav current="glossary" />

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "0.5px solid var(--ms-border)", paddingBottom: "0" }}>
          {tabs.map((t) => (
            <a
              key={t.key}
              href={"/admin/glossary?tab=" + t.key}
              style={{
                fontSize: "13px",
                padding: "8px 16px",
                borderRadius: "6px 6px 0 0",
                textDecoration: "none",
                color: tab === t.key ? t.color : "var(--ms-text-secondary)",
                borderBottom: tab === t.key ? "2px solid " + t.color : "2px solid transparent",
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
          <p style={{ color: "var(--ms-text-secondary)", fontSize: "14px" }}>用語がありません。</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            {items.map((t) => (
              <li key={t.id} style={{
                background: "var(--ms-bg-card)",
                border: "0.5px solid var(--ms-border)",
                borderLeft: "2px solid " + (tab === "rejected" ? "var(--ms-error)" : "var(--ms-green)"),
                borderRadius: "0 8px 8px 0",
                padding: "18px"
              }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "10px", color: "var(--ms-accent-strong)", background: "var(--ms-accent-dim)", padding: "2px 8px", borderRadius: "20px" }}>
                    {t.term_en ?? "-"}
                  </span>
                  {t.domain && (
                    <span style={{ fontSize: "10px", color: "var(--ms-text-meta)", background: "var(--ms-bg-tag)", padding: "2px 8px", borderRadius: "20px", border: "0.5px solid var(--ms-border-soft)" }}>
                      {t.domain.toUpperCase()}
                    </span>
                  )}
                  <span style={{ fontSize: "11px", color: "var(--ms-text-muted)" }}>
                    {formatDate(t.created_at)}
                  </span>
                </div>

                <h2 style={{ fontSize: "14px", fontWeight: 500, margin: "0 0 8px", lineHeight: 1.5, color: "var(--ms-text-primary)" }}>
                  {t.term}
                </h2>

                <p style={{ fontSize: "12px", color: "var(--ms-text-secondary)", lineHeight: 1.7, margin: "0 0 14px" }}>
                  {t.explanation}
                </p>

                <div style={{ display: "flex", gap: "8px" }}>
                  {tab === "approved" && (
                    <form action={rejectTerm.bind(null, t.id)}>
                      <button type="submit" style={{ fontSize: "11px", padding: "4px 14px", borderRadius: "4px", border: "0.5px solid var(--ms-red-border)", color: "var(--ms-red)", background: "transparent", cursor: "pointer" }}>
                        却下
                      </button>
                    </form>
                  )}
                  {tab === "rejected" && (
                    <form action={restoreTerm.bind(null, t.id)}>
                      <button type="submit" style={{ fontSize: "11px", padding: "4px 14px", borderRadius: "4px", border: "0.5px solid var(--ms-accent)", color: "var(--ms-accent-strong)", background: "transparent", cursor: "pointer" }}>
                        復元
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
