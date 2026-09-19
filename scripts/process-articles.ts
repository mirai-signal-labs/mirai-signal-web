import { config } from 'dotenv';
config({ path: '.env.local' });
import { GoogleGenerativeAI, SchemaType, type Schema, type GenerativeModel } from '@google/generative-ai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// ==================================================
// 設定値
// ==================================================
const MODEL_NAME = 'gemini-2.5-flash-lite';
const BATCH_SIZE = 15;            // 1コールで処理する記事数（無料枠20RPD対策で 5 → 15）
const MAX_ARTICLES = 150;         // 1回の実行で処理する最大記事数（新しい記事から順に処理）
const MAX_REQUESTS_PER_RUN = 15;  // 1回の実行でGeminiに送る最大リクエスト数（リトライも含む）
                                  // 無料枠(20回/日)の場合は15。課金する場合は50などに増やしてOK
const WAIT_MS = 13000;            // コール間の待機時間（ミリ秒）
const MAX_RETRIES = 3;
const RETRY_WAIT_MS = 30000;
const SCORE_THRESHOLD = 30;
const MAX_SCORE = 50;

const PROMPT = readFileSync(join(process.cwd(), 'scripts', 'process_prompt.txt'), 'utf-8');

// ==================================================
// 型定義
// ==================================================
type Article = {
  id: string;
  title: string;
  description: string | null;
};
type GlossaryTerm = {
  term: string;
  term_en: string;
  explanation: string;
  example_context: string;
};
type ProcessResult = {
  domain_relevance: number;
  technical_depth: number;
  future_impact: number;
  novelty: number;
  signal_strength: number;
  paradigm_shift_potential: number;
  counter_consensus_score: number;
  future_candidate: boolean;
  total_score: number;
  domains: string[];
  content_type: string;
  title_ja: string;
  importance_reason: string;
  summary: string;
  summary_ja: string;
  glossary_terms: GlossaryTerm[];
};

// ==================================================
// 出力形式（JSONスキーマ）
// Geminiに「この形のJSON以外は返さない」と強制する。
// これでJSONの書式崩れによるバッチ失敗がほぼ無くなる。
// ==================================================
const glossaryTermSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    term: { type: SchemaType.STRING },
    term_en: { type: SchemaType.STRING },
    explanation: { type: SchemaType.STRING },
    example_context: { type: SchemaType.STRING },
  },
  required: ['term', 'explanation', 'example_context'],
};

const resultSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    domain_relevance: { type: SchemaType.INTEGER },
    technical_depth: { type: SchemaType.INTEGER },
    future_impact: { type: SchemaType.INTEGER },
    novelty: { type: SchemaType.INTEGER },
    signal_strength: { type: SchemaType.INTEGER },
    paradigm_shift_potential: { type: SchemaType.INTEGER },
    counter_consensus_score: { type: SchemaType.INTEGER },
    future_candidate: { type: SchemaType.BOOLEAN },
    total_score: { type: SchemaType.INTEGER },
    domains: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    content_type: { type: SchemaType.STRING },
    title_ja: { type: SchemaType.STRING },
    importance_reason: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    summary_ja: { type: SchemaType.STRING },
    glossary_terms: { type: SchemaType.ARRAY, items: glossaryTermSchema },
  },
  required: [
    'domain_relevance', 'technical_depth', 'future_impact', 'novelty', 'signal_strength',
    'paradigm_shift_potential', 'counter_consensus_score', 'future_candidate',
    'domains', 'content_type', 'title_ja', 'importance_reason',
    'summary', 'summary_ja', 'glossary_terms',
  ],
};

const batchSchema: Schema = {
  type: SchemaType.ARRAY,
  items: resultSchema,
};

// ==================================================
// クォータ（利用上限）関連
// ==================================================

// 「これ以上続けても無駄」なときに投げる専用エラー
class QuotaStopError extends Error {}

// この実行で何回Geminiにリクエストしたか（リトライも1回と数える）
let requestsUsed = 0;

// 429エラーのうち「1日の上限」によるものかを判定
// （1分あたりの上限なら待てば回復するが、1日の上限は待っても回復しない）
function isDailyQuotaError(error: any): boolean {
  const msg = String(error?.message ?? '');
  return msg.includes('429') && msg.includes('PerDay');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================================================
// 1件分のJSONを検証
// ==================================================
function parseOneResult(obj: any): ProcessResult {
  const scores = [
    obj.domain_relevance,
    obj.technical_depth,
    obj.future_impact,
    obj.novelty,
    obj.signal_strength,
  ];
  if (scores.some((s) => typeof s !== 'number' || s < 0 || s > 10)) {
    throw new Error('スコア形式が不正です');
  }
  if (!Array.isArray(obj.domains)) {
    throw new Error('domainsが配列ではありません');
  }
  if (!obj.summary || !obj.summary_ja) {
    throw new Error('要約が空です');
  }
  if (!Array.isArray(obj.glossary_terms)) {
    console.log('glossary_termsが不正な形式のため空配列で処理を続行します');
    obj.glossary_terms = [];
  }
  // 合計点はAIに計算させず、コード側で計算する（50点超えの防止）
  obj.total_score = scores.reduce((sum: number, s: number) => sum + s, 0);
  return obj as ProcessResult;
}

// ==================================================
// バッチレスポンスを検証
// ==================================================
function parseBatchResult(text: string, batchSize: number): ProcessResult[] {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('配列ではありません');
  if (parsed.length !== batchSize) {
    throw new Error(`件数不一致: 期待${batchSize}件 / 実際${parsed.length}件`);
  }
  return parsed.map((item, i) => {
    try {
      return parseOneResult(item);
    } catch (e: any) {
      throw new Error(`${i + 1}件目の解析エラー: ${e.message}`);
    }
  });
}

// ==================================================
// リトライ付きAPI呼び出し
// ==================================================
async function generateWithRetry(model: GenerativeModel, content: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // この実行での上限回数に達していたら、リクエストせずに止める
    if (requestsUsed >= MAX_REQUESTS_PER_RUN) {
      throw new QuotaStopError(`この実行のリクエスト上限（${MAX_REQUESTS_PER_RUN}回）に達しました`);
    }
    requestsUsed++;

    try {
      const result = await model.generateContent(content);
      return result.response.text()?.trim() ?? '';
    } catch (error: any) {
      // 1日の上限に達した場合は、リトライしても無駄なので即中断
      if (isDailyQuotaError(error)) {
        throw new QuotaStopError('Gemini APIの1日のリクエスト上限に達しました');
      }
      if (attempt === MAX_RETRIES) throw error;
      console.log('リトライ ' + attempt + '/' + MAX_RETRIES + '... ' + RETRY_WAIT_MS / 1000 + '秒待機');
      await sleep(RETRY_WAIT_MS);
    }
  }
  throw new Error('リトライ上限に達しました');
}

// ==================================================
// 用語集への保存（重複チェック付き）
// ==================================================
async function saveGlossaryTerms(
  supabase: SupabaseClient,
  articleId: string,
  domain: string | null,
  terms: GlossaryTerm[],
): Promise<void> {
  for (const t of terms) {
    if (!t.term) continue;

    // 既存の用語を探す（同じ用語を2回登録しないようにする）
    const { data: existing } = await supabase
      .from('glossary_terms')
      .select('id')
      .eq('term', t.term)
      .maybeSingle();

    let termId: string;

    if (existing) {
      termId = existing.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('glossary_terms')
        .insert({
          term: t.term,
          term_en: t.term_en || null,
          explanation: t.explanation,
          domain,
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError || !inserted) {
        console.log('  用語集への保存に失敗しました（' + t.term + '）：' + insertError?.message);
        continue;
      }
      termId = inserted.id;
    }

    // 記事との紐付け（同じ記事×同じ用語の二重リンクを防ぐ）
    await supabase
      .from('glossary_term_articles')
      .upsert(
        { term_id: termId, article_id: articleId, example_context: t.example_context || null },
        { onConflict: 'term_id,article_id', ignoreDuplicates: true },
      );
  }
}

// ==================================================
// 1記事分の結果をDBに保存
// ==================================================
async function saveResult(supabase: SupabaseClient, article: Article, result: ProcessResult): Promise<void> {
  const total = result.total_score;
  const approved = total >= SCORE_THRESHOLD;
  const primaryDomain = result.domains.length > 0 ? result.domains[0] : null;

  const { error } = await supabase.from('articles').update({
    status: approved ? 'translated' : 'rejected',
    domain: primaryDomain,
    title_ja: result.title_ja,
    summary: result.summary,
    summary_ja: result.summary_ja,
    score: total,
  }).eq('id', article.id);

  if (error) {
    console.log('  DB保存に失敗しました（' + article.title + '）：' + error.message);
    return;
  }

  const domainLabel = result.domains.length > 0
    ? result.domains.map((d) => d.toUpperCase()).join('+')
    : 'OTHER';

  console.log(
    '[' + total + '/' + MAX_SCORE + '] ' +
    '[' + domainLabel + '] ' +
    (result.future_candidate ? '⭐ ' : '') +
    article.title + ' -> ' +
    (approved ? '承認待ち' : '却下')
  );

  if (approved && result.glossary_terms.length > 0) {
    await saveGlossaryTerms(supabase, article.id, primaryDomain, result.glossary_terms);
  }
}

// ==================================================
// Geminiへ送るプロンプトを作成
// ==================================================
function buildBatchPrompt(batch: Article[]): string {
  return (
    `以下の${batch.length}件の記事について、タイトルと概要（ある場合）を確認し、それぞれ評価してください。\n` +
    `必ず${batch.length}件分のJSONオブジェクトを含む配列を返してください。\n` +
    `順番は入力と同じ順序で返してください。\n\n` +
    batch.map((a, idx) => {
      const desc = a.description ? `\n概要: ${a.description}` : '';
      return `${idx + 1}. タイトル: ${a.title}${desc}`;
    }).join('\n\n')
  );
}

// ==================================================
// 1バッチを処理
// 失敗したら「半分に分けて再挑戦」する。
// （以前は1件ずつに分けていたため、1回の失敗でリクエストが5倍に増えていた）
// ==================================================
async function processBatch(model: GenerativeModel, supabase: SupabaseClient, batch: Article[]): Promise<void> {
  try {
    const text = await generateWithRetry(model, buildBatchPrompt(batch));
    const results = parseBatchResult(text, batch.length);
    for (let j = 0; j < batch.length; j++) {
      await saveResult(supabase, batch[j], results[j]);
    }
  } catch (e: any) {
    // クォータ系は呼び出し元で処理を止める
    if (e instanceof QuotaStopError) throw e;

    if (batch.length === 1) {
      console.log('スキップ（エラー）：' + batch[0].title + ' / ' + e.message);
      return;
    }

    const mid = Math.ceil(batch.length / 2);
    console.log(`バッチ失敗（${e.message}）→ ${mid}件と${batch.length - mid}件に分けて再試行します`);
    await sleep(WAIT_MS);
    await processBatch(model, supabase, batch.slice(0, mid));
    await sleep(WAIT_MS);
    await processBatch(model, supabase, batch.slice(mid));
  }
}

// ==================================================
// メイン処理
// ==================================================
async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!supabaseUrl || !supabaseAnonKey) { console.error('env error'); process.exit(1); }
  if (!geminiApiKey) { console.error('GEMINI_API_KEY error'); process.exit(1); }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: batchSchema,
    },
  });

  let stoppedByQuota = false;

  try {
    // 新しい記事から順に処理する（上限で止まっても、新しいニュースが優先される）
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, description')
      .eq('status', 'pending')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(MAX_ARTICLES);

    if (fetchError) throw fetchError;
    if (!articles?.length) { console.log('処理対象の記事がありません'); return; }

    const totalBatches = Math.ceil(articles.length / BATCH_SIZE);
    console.log(
      `処理開始: ${articles.length}件 / バッチサイズ: ${BATCH_SIZE}件 / ` +
      `予定リクエスト数: ${totalBatches}回 / 上限: ${MAX_REQUESTS_PER_RUN}回`
    );

    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE) as Article[];
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      console.log(`\nバッチ ${batchNum}/${totalBatches} (${batch.length}件) 処理中...`);

      try {
        await processBatch(model, supabase, batch);
      } catch (e: any) {
        if (e instanceof QuotaStopError) {
          const remaining = articles.length - i;
          console.log(`\n⚠ ${e.message}。残り約${remaining}件はpendingのまま次回処理します`);
          stoppedByQuota = true;
          break;
        }
        throw e;
      }

      // 次のバッチまで待機（最後のバッチは待機不要）
      if (i + BATCH_SIZE < articles.length) {
        console.log(`${WAIT_MS / 1000}秒待機中...`);
        await sleep(WAIT_MS);
      }
    }

    console.log(`\n使用リクエスト数: ${requestsUsed}回`);
    if (stoppedByQuota) {
      // 失敗扱いで終了 → GitHub Actionsが赤くなり、失敗通知メールが届く
      process.exit(1);
    }
    console.log('全件処理完了');
  } catch (error: any) {
    console.error('処理失敗:', error?.message ?? JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();