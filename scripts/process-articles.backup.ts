import { config } from 'dotenv';
config({ path: '.env.local' });
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const MAX_ARTICLES = 10;
const WAIT_MS = 13000;
const MAX_RETRIES = 3;
const RETRY_WAIT_MS = 30000;
const SCORE_THRESHOLD = 30;
const MAX_SCORE = 50;

const PROMPT = readFileSync(join(process.cwd(), 'scripts', 'process_prompt.txt'), 'utf-8');

// ---- 型定義 ----
// プロンプトの新しいスキーマに合わせて更新
type ProcessResult = {
  // 5つのスコア項目（各0〜10）
  domain_relevance: number;
  technical_depth: number;
  future_impact: number;
  novelty: number;
  signal_strength: number;       // 旧: signal_quality → 新: signal_strength

  // 将来性スコア（合計には含まない）
  paradigm_shift_potential: number;
  counter_consensus_score: number;

  // 将来の重要候補フラグ
  future_candidate: boolean;

  // Geminiが計算した合計スコア
  total_score: number;

  // ドメイン（複数可）例: ["ai", "semiconductor"]
  domains: string[];

  // コンテンツ種別 例: "research_paper", "funding" など
  content_type: string;

  // 日本語タイトル
  title_ja: string;

  // 重要理由（英語1文）
  importance_reason: string;

  // 英語要約
  summary: string;

  // 日本語要約
  summary_ja: string;
};

// ---- JSONパース ----
function parseResult(text: string): ProcessResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON解析に失敗しました');
  const parsed = JSON.parse(jsonMatch[0]) as ProcessResult;

  // 5つの主要スコアを検証
  const scores = [
    parsed.domain_relevance,
    parsed.technical_depth,
    parsed.future_impact,
    parsed.novelty,
    parsed.signal_strength,  // ← 変更点
  ];
  if (scores.some((s) => typeof s !== 'number' || s < 0 || s > 10)) {
    throw new Error('スコア形式が不正です');
  }

  // domainsが配列であることを確認
  if (!Array.isArray(parsed.domains)) {
    throw new Error('domainsが配列ではありません');
  }

  if (!parsed.summary || !parsed.summary_ja) throw new Error('要約が空です');

  return parsed;
}

// ---- リトライ付きAPI呼び出し ----
async function generateWithRetry(model: any, content: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(content);
      return result.response.text()?.trim() ?? '';
    } catch (error: any) {
      if (attempt === MAX_RETRIES) throw error;
      console.log('リトライ ' + attempt + '/' + MAX_RETRIES + '... ' + RETRY_WAIT_MS / 1000 + '秒待機');
      await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT_MS));
    }
  }
  throw new Error('リトライ上限に達しました');
}

// ---- メイン処理 ----
async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!supabaseUrl || !supabaseAnonKey) { console.error('env error'); process.exit(1); }
  if (!geminiApiKey) { console.error('GEMINI_API_KEY error'); process.exit(1); }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite', systemInstruction: PROMPT });

  try {
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('id, title')
      .eq('status', 'pending')
      .limit(MAX_ARTICLES);

    if (fetchError) throw fetchError;
    if (!articles?.length) { console.log('処理対象の記事がありません'); return; }

    for (const article of articles) {
      try {
        const text = await generateWithRetry(model, article.title);
        const result = parseResult(text);

        // total_scoreはGeminiが返した値を使う（ただし検証する）
        const total = result.total_score;
        const approved = total >= SCORE_THRESHOLD;

        // domainsの1つ目をdomainカラムに保存（後方互換性のため）
        const primaryDomain = result.domains.length > 0 ? result.domains[0] : null;

        await supabase.from('articles').update({
          status: approved ? 'translated' : 'rejected',
          domain: primaryDomain,            // 後方互換: 1つ目のドメイン
          title_ja: result.title_ja,
          summary: result.summary,
          summary_ja: result.summary_ja,
          score: total,
        }).eq('id', article.id);

        const domainLabel = result.domains.length > 0
          ? result.domains.map(d => d.toUpperCase()).join('+')
          : 'OTHER';

        console.log(
          '[' + total + '/' + MAX_SCORE + '] ' +
          '[' + domainLabel + '] ' +
          (result.future_candidate ? '⭐ ' : '') +  // 将来候補はスターで表示
          article.title + ' -> ' +
          (approved ? '承認待ち' : '却下')
        );
      } catch (e: any) {
        console.log('スキップ（エラー）：' + article.title + ' / ' + e.message);
      }

      await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
    }
  } catch (error) {
    console.error('処理失敗:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();
