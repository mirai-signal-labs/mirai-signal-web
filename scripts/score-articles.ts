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
const SCORE_THRESHOLD = 28;
const MAX_SCORE = 50;

const SCORING_PROMPT = readFileSync(join(process.cwd(), 'scripts', 'scoring_prompt.txt'), 'utf-8');

type ScoreResult = {
  domain_relevance: number;
  technical_depth: number;
  future_impact: number;
  novelty: number;
  signal_quality: number;
  domain: string | null;
};

function parseScoreResult(text: string): ScoreResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON解析に失敗しました');
  const parsed = JSON.parse(jsonMatch[0]) as ScoreResult;
  const scores = [parsed.domain_relevance, parsed.technical_depth, parsed.future_impact, parsed.novelty, parsed.signal_quality];
  if (scores.some((s) => typeof s !== 'number' || s < 0 || s > 10)) throw new Error('スコア形式が不正です');
  return parsed;
}

function calculateTotal(score: ScoreResult): number {
  return score.domain_relevance + score.technical_depth + score.future_impact + score.novelty + score.signal_quality;
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite', systemInstruction: SCORING_PROMPT });
  try {
    const { data: articles, error: fetchError } = await supabase.from('articles').select('id, title').eq('status', 'pending').limit(MAX_ARTICLES);
    if (fetchError) throw fetchError;
    if (!articles?.length) return;
    for (const article of articles) {
      const text = await generateWithRetry(model, article.title);
      const score = parseScoreResult(text);
      const total = calculateTotal(score);
      const approved = total >= SCORE_THRESHOLD;
      await supabase.from('articles').update({ status: approved ? 'pending' : 'rejected', domain: score.domain }).eq('id', article.id);
      console.log('[' + total + '/' + MAX_SCORE + '] [' + (score.domain ?? 'OTHER') + '] ' + article.title + ' -> ' + (approved ? '承認待ち' : '却下'));
      await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
    }
  } catch (error) {
    console.error('スコアリング失敗:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();