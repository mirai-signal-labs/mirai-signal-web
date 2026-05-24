import { config } from "dotenv";
config({ path: ".env.local" });
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const MAX_ARTICLES = 5;
const WAIT_MS = 13000;
const MAX_RETRIES = 3;
const RETRY_WAIT_MS = 30000;

const TRANSLATE_PROMPT = `あなたはAI・テクノロジー専門の翻訳者です。
以下のテキストを日本語に翻訳してください。
条件：
- 翻訳文のみを出力する
- 選択肢・オプション・説明は一切不要
- 意味保持を最優先
- 専門用語は統一（reasoning→推論、agent→エージェント、alignment→アラインメント）
- 自然な日本語より正確さを優先`;

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
    systemInstruction: TRANSLATE_PROMPT,
  });

  try {
    const { data: articles, error: fetchError } = await supabase
      .from("articles")
      .select("id, title, summary")
      .eq("status", "summarized")
      .limit(MAX_ARTICLES);

    if (fetchError) throw fetchError;
    if (!articles?.length) return;

    for (const article of articles) {
      if (!article.summary) continue;

      const summaryJa = await generateWithRetry(model, article.summary);
      if (!summaryJa) throw new Error("翻訳の生成に失敗しました");

      const { error: updateError } = await supabase
        .from("articles")
        .update({ summary_ja: summaryJa, status: "translated" })
        .eq("id", article.id);

      if (updateError) throw updateError;

      console.log(`翻訳完了：${article.title}`);
      await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
    }
  } catch (error) {
    console.error("記事の翻訳に失敗しました:", JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();
