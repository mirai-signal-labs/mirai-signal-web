import { config } from "dotenv";
config({ path: ".env.local" });
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const MAX_ARTICLES = 10;
const WAIT_MS = 13000;
const MAX_RETRIES = 3;
const RETRY_WAIT_MS = 30000;
const SCORE_THRESHOLD = 25;
const MAX_SCORE = 40;

const SCORING_PROMPT = `あなたはAI・テクノロジー専門の編集者です。
以下の記事タイトルをスコアリングしてください。
各項目は0〜10点（整数）で評価し、JSONのみを返してください。
評価基準：
- technical_importance: AI・ロボティクス・半導体など技術的に重要か
- future_potential: 長期的に重要なトレンドか
- novelty: 新しい発見・発表・動向か
- anti_hype: 誇張が少ないほど高得点（逆転評価）
出力形式：
{
  "technical_importance": 0,
  "future_potential": 0,
  "novelty": 0,
  "anti_hype": 0
}`;

type ScoreResult = {
  technical_importance: number;
  future_potential: number;
  novelty: number;
  anti_hype: number;
};

function parseScoreResult(text: string): ScoreResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("スコアのJSON解析に失敗しました");
  const parsed = JSON.parse(jsonMatch[0]) as ScoreResult;
  const scores = [parsed.technical_importance, parsed.future_potential, parsed.novelty, parsed.anti_hype];
  if (scores.some((s) => typeof s !== "number" || s < 0 || s > 10)) {
    throw new Error("スコアの形式が不正です");
  }
  return parsed;
}

function calculateTotal(score: ScoreResult): number {
  return score.technical_importance + score.future_potential + score.novelty + score.anti_hype;
}

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
    systemInstruction: SCORING_PROMPT,
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
      const text = await generateWithRetry(model, article.title);
      const score = parseScoreResult(text);
      const total = calculateTotal(score);
      const approved = total >= SCORE_THRESHOLD;

      if (!approved) {
        const { error: updateError } = await supabase
          .from("articles")
          .update({ status: "rejected" })
          .eq("id", article.id);
        if (updateError) throw updateError;
      }

      console.log(`[${total}/${MAX_SCORE}] ${article.title} → ${approved ? "承認" : "却下"}`);
      await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
    }
  } catch (error) {
    console.error("記事のスコアリングに失敗しました:", JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();
