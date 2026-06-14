import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

const DOMAINS: Record<string, string> = {
  ai: "AI",
  robotics: "Robotics",
  biotech: "Biotech",
  semiconductor: "Semiconductor",
  energy: "Energy",
  space: "Space",
  defense: "Defense",
  other: "Other",
};

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function main(): Promise<void> {
  const today = new Date();

  // approved記事を最新10件取得（日付フィルターなし）
  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, title_ja, url, source, published_at, summary_ja, summary, domain")
    .eq("status", "approved")
    .order("published_at", { ascending: false })
    .limit(10);

  console.log("取得件数:", articles?.length);

  if (!articles?.length) {
    console.log("記事がありません");
    return;
  }

  const { data: subscribers } = await supabase
    .from("subscribers")
    .select("email")
    .eq("active", true);

  if (!subscribers?.length) {
    console.log("購読者がいません");
    return;
  }

  const articleHtml = articles.map((a) => {
    const domainLabel = a.domain ? DOMAINS[a.domain] ?? a.domain : null;
    const title = a.title_ja ?? a.title;
    const summary = a.summary_ja ?? a.summary ?? "";
    return `
      <div style="margin-bottom:24px;padding:16px;background:#0e0e1a;border-left:3px solid #534ab7;border-radius:0 8px 8px 0;">
        ${domainLabel ? `<span style="font-size:11px;color:#7f77dd;background:#1a1830;padding:2px 8px;border-radius:20px;">${domainLabel}</span>` : ""}
        <h2 style="font-size:15px;margin:8px 0 4px;">
          <a href="https://mirai-signal-web-kzfb.vercel.app/article/${a.id}" style="color:#afa9ec;text-decoration:none;">${title}</a>
        </h2>
        <p style="font-size:11px;color:#3c3489;margin:0 0 8px;">${a.source ?? ""} &middot; ${formatDate(a.published_at)}</p>
        <p style="font-size:13px;color:#888780;line-height:1.7;margin:0;">${summary}</p>
      </div>
    `;
  }).join("");

  const dateStr = today.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  const html = `
    <div style="background:#080810;min-height:100vh;padding:32px 24px;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="margin-bottom:24px;">
        <h1 style="font-size:20px;color:#c8c4ff;margin:0 0 4px;">
          Mirai<span style="color:#7f77dd;">Signal</span>
        </h1>
        <p style="font-size:12px;color:#5f5e5a;margin:0;">${dateStr} の注目記事</p>
      </div>
      <hr style="border:none;border-top:0.5px solid #1e1e30;margin-bottom:24px;" />
      ${articleHtml}
      <hr style="border:none;border-top:0.5px solid #1e1e30;margin-top:24px;margin-bottom:16px;" />
      <p style="font-size:11px;color:#444441;text-align:center;">
        <a href="https://mirai-signal-web-kzfb.vercel.app" style="color:#534ab7;">Mirai Signal</a> &middot;
        購読解除はこのメールに返信してください
      </p>
    </div>
  `;

  const subject = `Mirai Signal - ${dateStr} の注目記事`;

  for (const subscriber of subscribers) {
    const { error } = await resend.emails.send({
      from: "Mirai Signal <onboarding@resend.dev>",
      to: subscriber.email,
      subject,
      html,
    });

    if (error) {
      console.error(`送信失敗: ${subscriber.email}`, error);
    } else {
      console.log(`送信成功: ${subscriber.email}`);
    }
  }
}

main();