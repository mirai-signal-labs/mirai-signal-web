import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約",
  description: "Mirai Signalの利用規約",
};

export default function TermsPage() {
  return (
    <div style={{ background: "var(--ms-bg)", minHeight: "100vh" }}>
      <nav style={{ background: "var(--ms-bg-nav)", borderBottom: "0.5px solid var(--ms-border-nav)", padding: "14px 24px" }}>
        <a href="/" style={{ fontSize: "15px", fontWeight: 500, color: "#c8c4ff", textDecoration: "none", letterSpacing: "0.06em" }}>
          Mirai<span style={{ color: "var(--ms-accent-light)" }}>Signal</span>
        </a>
      </nav>
      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--ms-text-primary)", marginBottom: "32px" }}>
          利用規約
        </h1>
        <div style={{ fontSize: "14px", color: "var(--ms-text-secondary)", lineHeight: 2, display: "flex", flexDirection: "column", gap: "32px" }}>

          <section>
            <p>Mirai Signal（以下「当サイト」）をご利用いただく前に、以下の利用規約をお読みください。利用を開始した時点で本規約に同意したものとみなします。</p>
          </section>

          <section>
            <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--ms-text-primary)", marginBottom: "12px" }}>コンテンツの著作権</h2>
            <p>当サイトに掲載された記事・要約・翻訳文の著作権はMirai Signalに帰属します。無断転載・複製はお断りします。小宭な引用やシェアは歓迎します。</p>
          </section>

          <section>
            <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--ms-text-primary)", marginBottom: "12px" }}>元コンテンツについて</h2>
            <p>当サイトが掲載する記事は、海外のニュースソースを元にAIで要約・翻訳したものです。元記事の著作権は各元サイトに帰属します。</p>
          </section>

          <section>
            <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--ms-text-primary)", marginBottom: "12px" }}>免責事項</h2>
            <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>当サイトの情報は正確性・最新性を保証するものではありません。利用により生じた損害について、運営者は一切の責任を負いません。</li>
              <li>サイトの内容は予告なく変更・中断する場合があります。</li>
              <li>AIによる翻訳・要約には誤りが含まれる場合があります。重要な意思決定には必ず元コンテンツをご確認ください。</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--ms-text-primary)", marginBottom: "12px" }}>リンクについて</h2>
            <p>当サイトへのリンクは原則自由です。ただし、内容を誤解させる形でのリンクや、フレームへの埋め込みはお断りします。</p>
          </section>

          <section>
            <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--ms-text-primary)", marginBottom: "12px" }}>準拠法・裁判管轄</h2>
            <p>本規約は日本法に従い解釈されます。われわれと利用者の間で紛争が生じた場合、大阪地方裁判所を第一審管轄裁判所とします。</p>
          </section>

          <section>
            <p style={{ fontSize: "12px", color: "var(--ms-text-muted)" }}>制定日：2026年7月8日</p>
          </section>

        </div>
      </main>
    </div>
  );
}