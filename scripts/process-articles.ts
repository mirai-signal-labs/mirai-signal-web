import { config } from 'dotenv';
config({ path: '.env.local' });
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const BATCH_SIZE = 5;        // 1コールで処理する記事数
const MAX_ARTICLES = 100;    // 1回の実行で処理する最大記事数（増やしました）
const WAIT_MS = 13000;       // コール間の待機時間（ミリ秒）
const MAX_RETRIES = 3;
const RETRY_WAIT_MS = 30000;
const SCORE_THRESHOLD = 30;
const MAX_SCORE = 50;

const PROMPT = readFileSync(join(process.cwd(), 'scripts', 'process_prompt.txt'), 'utf-8');

// ---- 型定義 ----
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

// ---- 1件分のJSONを検証・パース ----
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
  return obj as ProcessResult;
}

// ---- バッチレスポンスをパース ----
// Geminiは [{...}, {...}, {...}] のようなJSON配列を返す
function parseBatchResult(text: string, batchSize: number): ProcessResult[] {
  // JSON配列を抽出
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('JSON配列の解析に失敗しました');
  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) throw new Error('配列ではありません');
  if (parsed.length !== batchSize) {
    throw new Error(`件数不一致: 期待${batchSize}件 / 実際${parsed.length}件`);
  }
  // 各要素を検証
  return parsed.map((item, i) => {
    try {
      return parseOneResult(item);
    } catch (e: any) {
      throw new Error(`${i + 1}件目の解析エラー: ${e.message}`);
    }
  });
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

// ---- 用語集への保存（重複チェック付き） ----
async function saveGlossaryTerms(
  supabase: any,
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
          status: 'pending',
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
      .select('id, title, description')
      .eq('status', 'pending')
      .limit(MAX_ARTICLES);

    if (fetchError) throw fetchError;
    if (!articles?.length) { console.log('処理対象の記事がありません'); return; }

    console.log(`処理開始: ${articles.length}件 / バッチサイズ: ${BATCH_SIZE}件`);

    // ---- BATCH_SIZE件ずつ分割して処理 ----
    // 例: 10件をBATCH_SIZE=5で処理する場合 → 2回のAPIコール
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE); // 5件ずつ切り出す
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(articles.length / BATCH_SIZE);

      console.log(`\nバッチ ${batchNum}/${totalBatches} (${batch.length}件) 処理中...`);

      // Geminiへ送るプロンプトを作成
      // タイトルを番号付きリストで渡す
      const batchPrompt =
        `以下の${batch.length}件の記事について、タイトルと概要（ある場合）を確認し、それぞれ評価してください。\n` +
        `必ず${batch.length}件分のJSONオブジェクトを含む配列を返してください。\n` +
        `順番は入力と同じ順序で返してください。\n\n` +
        batch.map((a, idx) => {
          const desc = a.description ? `\n概要: ${a.description}` : '';
          return `${idx + 1}. タイトル: ${a.title}${desc}`;
        }).join('\n\n');

      try {
        const text = await generateWithRetry(model, batchPrompt);
        const results = parseBatchResult(text, batch.length);

        // 各記事をDBに保存
        for (let j = 0; j < batch.length; j++) {
          const article = batch[j];
          const result = results[j];
          const total = result.total_score;
          const approved = total >= SCORE_THRESHOLD;
          const primaryDomain = result.domains.length > 0 ? result.domains[0] : null;

          await supabase.from('articles').update({
            status: approved ? 'translated' : 'rejected',
            domain: primaryDomain,
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
            (result.future_candidate ? '⭐ ' : '') +
            article.title + ' -> ' +
            (approved ? '承認待ち' : '却下')
          );

          if (approved && result.glossary_terms.length > 0) {
            await saveGlossaryTerms(supabase, article.id, primaryDomain, result.glossary_terms);
          }
        }
        
      } catch (e: any) {
        // バッチ全体が失敗した場合、1件ずつフォールバック処理
        console.log(`バッチ失敗（${e.message}）→ 1件ずつ処理に切り替えます`);
        for (const article of batch) {
          try {
            const text = await generateWithRetry(model, article.title);
            // 単体の場合は配列ではなくオブジェクトが返る
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('JSON解析失敗');
            const result = parseOneResult(JSON.parse(jsonMatch[0]));
            const total = result.total_score;
            const approved = total >= SCORE_THRESHOLD;
            const primaryDomain = result.domains.length > 0 ? result.domains[0] : null;

            await supabase.from('articles').update({
              status: approved ? 'translated' : 'rejected',
              domain: primaryDomain,
              title_ja: result.title_ja,
              summary: result.summary,
              summary_ja: result.summary_ja,
              score: total,
            }).eq('id', article.id);

            const domainLabel = result.domains.length > 0
              ? result.domains.map(d => d.toUpperCase()).join('+')
              : 'OTHER';
            console.log(
              '[フォールバック] [' + total + '/' + MAX_SCORE + '] [' + domainLabel + '] ' +
              article.title + ' -> ' + (approved ? '承認待ち' : '却下')
            );
            
            if (approved && result.glossary_terms.length > 0) {
              await saveGlossaryTerms(supabase, article.id, primaryDomain, result.glossary_terms);
            }
          } catch (e2: any) {
            console.log('スキップ（エラー）：' + article.title + ' / ' + e2.message);
          }
          await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
        }
      }

      // 次のバッチまで待機（最後のバッチは待機不要）
      if (i + BATCH_SIZE < articles.length) {
        console.log(`${WAIT_MS / 1000}秒待機中...`);
        await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
      }
    }

    console.log('\n全件処理完了');
  } catch (error) {
    console.error('処理失敗:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();
