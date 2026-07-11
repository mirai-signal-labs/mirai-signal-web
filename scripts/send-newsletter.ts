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

  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, title_ja, url, source, published_at, summary_ja, summary, domain")
    .eq("status", "approved")
    .order("published_at", { ascending: false })
    .limit(5);

  console.log("取得件数:", articles?.length);

  if (!articles?.length) {
    console.log("記事がありません");
    return;
  }

  const { data: subscribers } = await supabase
    .from("subscribers")
    .select("email, unsubscribe_token")
    .eq("active", true);

  if (!subscribers?.length) {
    console.log("購読者がいません");
    return;
  }

  const articleHtml = articles.map((a) => {
    const domainLabel = a.domain ? DOMAINS[a.domain] ?? a.domain : null;
    const title = a.title_ja ?? a.title;
    const summary = a.summary_ja ?? a.summary ?? "";
    return [
      '<div style="margin-bottom:20px;padding:14px 16px;background:#0e0e1a;border-left:3px solid #534ab7;border-radius:0 8px 8px 0;">',
      domainLabel ? '<span style="font-size:11px;color:#7f77dd;background:#1a1830;padding:2px 8px;border-radius:20px;">' + domainLabel + '</span>' : '',
      '<h2 style="font-size:15px;margin:8px 0 4px;line-height:1.4;">',
      '<a href="https://mirai-signal-web-kzfb.vercel.app/article/' + a.id + '" style="color:#afa9ec;text-decoration:none;">' + title + '</a>',
      '</h2>',
      '<p style="font-size:11px;color:#3c3489;margin:0 0 6px;">' + (a.source ?? "") + ' &middot; ' + formatDate(a.published_at) + '</p>',
      '<p style="font-size:13px;color:#888780;line-height:1.6;margin:0;">' + summary + '</p>',
      '</div>',
    ].join('');
  }).join("");

  const dateStr = today.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  const subject = "Mirai Signal - " + dateStr + " の注目記事";

  for (const subscriber of subscribers) {
    // 購読解除リンクをトークンごとに生成
    const unsubscribeUrl = subscriber.unsubscribe_token
      ? "https://mirai-signal-web-kzfb.vercel.app/unsubscribe?token=" + subscriber.unsubscribe_token
      : "https://mirai-signal-web-kzfb.vercel.app/unsubscribe";

    const html = [
      '<div style="background:#080810;padding:28px 20px;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">',
      '<div style="margin-bottom:20px;">',
      '<h1 style="font-size:20px;color:#c8c4ff;margin:0 0 4px;">Mirai<span style="color:#7f77dd;">Signal</span></h1>',
      '<p style="font-size:12px;color:#5f5e5a;margin:0;">' + dateStr + ' の注目記事</p>',
      '</div>',
      '<hr style="border:none;border-top:0.5px solid #1e1e30;margin-bottom:20px;" />',
      articleHtml,
      '<hr style="border:none;border-top:0.5px solid #1e1e30;margin-top:8px;margin-bottom:14px;" />',
      '<p style="font-size:11px;color:#444441;text-align:center;margin:0;">',
      '<a href="https://mirai-signal-web-kzfb.vercel.app" style="color:#534ab7;">Mirai Signal</a>',
      ' &middot; ',
      '<a href="' + unsubscribeUrl + '" style="color:#444441;">購読解除</a>',
      '</p>',
      '</div>',
    ].join('');

    const { error } = await resend.emails.send({
      from: "Mirai Signal <onboarding@resend.dev>",
      to: subscriber.email,
      subject,
      html,
    });

    if (error) {
      console.error("送信失敗:", subscriber.email, error);
    } else {
      console.log("送信成功:", subscriber.email);
    }
  }
}

main();