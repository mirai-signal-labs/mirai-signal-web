import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "Mirai Signalのプライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <div style={{ background: "var(--ms-bg)", minHeight: "100vh" }}>
      <nav style={{ background: "var(--ms-bg-nav)", borderBottom: "0.5px solid var(--ms-border-nav)", padding: "14px 24px" }}>
        <a href="/" style={{ fontSize: "15px", fontWeight: 500, color: "#c8c4ff", textDecoration: "none", letterSpacing: "0.06em" }}>
          Mirai<span style={{ color: "var(--ms-accent-light)" }}>Signal</span>
        </a>
      </nav>
      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--ms-text-primary)", marginBottom: "32px" }}>
          プライバシーポリシー
        </h1>
        <div style={{ fontSize: "14px", color: "var(--ms-text-secondary)", lineHeight: 2, display: "flex", flexDirection: "column", gap: "32px" }}>

          <section>
            <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--ms-text-primary)", marginBottom: "12px" }}>運営者</h2>
            <p>Mirai Signal（運営者：MqS）</p>
            <p>お問い合わせ：<a href="https://forms.gle/hZoQHXuBckkrToMo7" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ms-accent-light)" }}>コンタクトフォーム</a></p>
          </section>

          <section>
            <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--ms-text-primary)", marginBottom: "12px" }}>収集する情報と利用目的</h2>
            <p>当サイトでは、以下の個人情報を収集する場合があります。</p>
            <ul style={{ paddingLeft: "20px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>メールアドレス：ニュースレター登録時に収集します。ニュースレターの配信のみに利用し、第三者への提供は行いません。</li>
              <li>アクセスログ：Google Analyticsを使用して、サイトのアクセス状況を分析しています。Cookieを使用して收集されますが、個人を特定する情報は取得しません。</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--ms-text-primary)", marginBottom: "12px" }}>Google Analyticsについて</h2>
            <p>当サイトはGoogle LLCの提供するGoogle Analyticsを利用しています。Google AnalyticsはCookieを使用してアクセス情報を収集します。収集される情報については、<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ms-accent-light)" }}>Googleのプライバシーポリシー</a>をご確認ください。</p>
            <p style={{ marginTop: "8px" }}>Google Analyticsのオプトアウトは<a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ms-accent-light)" }}>Google Analyticsオプトアウトアドオン</a>から行えます。</p>
          </section>

          <section>
            <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--ms-text-primary)", marginBottom: "12px" }}>ニュースレターの登録解除</h2>
            <p>ニュースレターの登録解除は、各メールの末尾に記載されたリンクからいつでも行えます。登録解除後はメールアドレスの情報は除去されます。</p>
          </section>

          <section>
            <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--ms-text-primary)", marginBottom: "12px" }}>プライバシーポリシーの変更</h2>
            <p>本ポリシーは必要に応じて改訂する場合があります。重要な変更があった場合は、サイト上でお知らせします。</p>
          </section>

          <section>
            <p style={{ fontSize: "12px", color: "var(--ms-text-muted)" }}>制定日：2026年7月8日</p>
          </section>

        </div>
      </main>
    </div>
  );
}