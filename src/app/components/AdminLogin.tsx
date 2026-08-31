import { login } from "@/lib//supabase/auth";

export default function AdminLogin() {
  return (
    <div style={{ background: "var(--ms-bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--ms-bg-card)", border: "0.5px solid var(--ms-border)", borderRadius: "12px", padding: "32px", width: "320px" }}>
        <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--ms-text-heading)", marginBottom: "24px", textAlign: "center" }}>
          Mirai<span style={{ color: "var(--ms-accent-strong)" }}>Signal</span> Admin
        </div>
        <form action={login}>
          <input
            type="password"
            name="password"
            placeholder="パスワード"
            style={{ width: "100%", padding: "10px 12px", background: "var(--ms-bg-card)", border: "0.5px solid var(--ms-border)", borderRadius: "6px", color: "var(--ms-text-primary)", fontSize: "14px", marginBottom: "12px", boxSizing: "border-box" }}
          />
          <button type="submit" style={{ width: "100%", padding: "10px", background: "var(--ms-accent)", border: "none", borderRadius: "6px", color: "var(--ms-on-accent)", fontSize: "14px", cursor: "pointer" }}>
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}