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

type ProcessResult = {
  domain_relevance: number;
  technical_depth: number;
  future_impact: number;
  novelty: number;
  signal_quality: number;
  domain: string | null;
  summary: string;
  summary_ja: string;
};

function parseResult(text: string): ProcessResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON解析に失敗しました');
  const parsed = JSON.parse(jsonMatch[0]) as ProcessResult;
  const scores = [parsed.domain_relevance, parsed.technical_depth, parsed.future_impact, parsed.novelty, parsed.signal_quality];
  if (scores.some((s) => typeof s !== 'number' || s < 0 || s > 10)) throw new Error('スコア形式が不正です');
  if (!parsed.summary || !parsed.summary_ja) throw new Error('要約が空です');
  return parsed;
}

function calculateTotal(r: ProcessResult): number {
  return r.domain_relevance + r.technical_depth + r.future_impact + r.novelty + r.signal_quality;
}

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
        const total = calculateTotal(result);
        const approved = total >= SCORE_THRESHOLD;
        await supabase.from('articles').update({
          status: approved ? 'translated' : 'rejected',
          domain: result.domain,
          summary: result.summary,
          summary_ja: result.summary_ja,
        }).eq('id', article.id);
        const domainLabel = result.domain ? result.domain.toUpperCase() : 'OTHER';
        console.log('[' + total + '/' + MAX_SCORE + '] [' + domainLabel + '] ' + article.title + ' -> ' + (approved ? '承認待ち' : '却下'));
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
