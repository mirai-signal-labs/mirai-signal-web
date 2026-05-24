import { config } from "dotenv";
config({ path: ".env.local" });
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const MAX_ARTICLES = 5;
const WAIT_MS = 13000;
const MAX_RETRIES = 3;
const RETRY_WAIT_MS = 30000;

const SUMMARY_PROMPT = `あなたはAI・テクノロジー専門の編集者です。
以下の記事タイトルを英語で3行に要約してください。
条件：
- 何が起きたかを明確に
- なぜ重要かを1文含める
- 誇張禁止`;

async function generateWithRetry(model: any, content: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(content);
      return result.response.text()?.trim() ?? "";
    } catch (error: any) {
      if (attempt === MAX_RETRIES) throw error;
      console.log(`リトライ ${attempt}/${MAX_RETRIES}... ${RETRY_WAIT_MS / 1000}秒待機`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT_MS));
    }
  }
  throw new Error("リトライ上限に達しました");
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("SUPABASE_URL と SUPABASE_ANON_KEY を環境変数に設定してください。");
    process.exit(1);
  }

  if (!geminiApiKey) {
    console.error("GEMINI_API_KEY を環境変数に設定してください。");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction: SUMMARY_PROMPT,
  });

  try {
    const { data: articles, error: fetchError } = await supabase
      .from("articles")
      .select("id, title")
      .eq("status", "pending")
      .limit(MAX_ARTICLES);

    if (fetchError) throw fetchError;
    if (!articles?.length) return;

    for (const article of articles) {
      const summary = await generateWithRetry(model, article.title);
      if (!summary) throw new Error("要約の生成に失敗しました");

      const { error: updateError } = await supabase
        .from("articles")
        .update({ summary, status: "summarized" })
        .eq("id", article.id);

      if (updateError) throw updateError;

      console.log(`要約完了：${article.title}`);
      await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
    }
  } catch (error) {
    console.error("記事の要約に失敗しました:", JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();
