import { logout } from "@/lib/supabase/auth";

export default function AdminNav({ current }: { current: "review" | "stats" }) {
  const linkStyle = (active: boolean) => ({
    fontSize: "12px",
    textDecoration: "none",
    color: active ? "var(--ms-accent-strong)" : "var(--ms-text-secondary)",
    marginLeft: "16px",
  });

  return (
    <nav style={{ background: "var(--ms-bg-nav)", borderBottom: "0.5px solid var(--ms-border-nav)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--ms-text-heading)", letterSpacing: "0.06em" }}>
        Mirai<span style={{ color: "var(--ms-accent-strong)" }}>Signal</span>
        <span style={{ fontSize: "11px", color: "var(--ms-accent)", marginLeft: "10px" }}>ADMIN</span>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <a href="/admin" style={linkStyle(current === "review")}>記事</a>
        <a href="/admin/stats" style={linkStyle(current === "stats")}>統計</a>
        <form action={logout} style={{ marginLeft: "16px" }}>
          <button type="submit" style={{ fontSize: "12px", color: "var(--ms-text-secondary)", background: "transparent", border: "none", cursor: "pointer" }}>
            ログアウト
          </button>
        </form>
      </div>
    </nav>
  );
}