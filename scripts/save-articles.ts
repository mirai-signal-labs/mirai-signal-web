import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';

const SOURCES = [
  { name: 'hackernews', url: 'https://news.ycombinator.com/rss', source: 'hackernews' },
  { name: 'techcrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', source: 'techcrunch' },
  { name: 'arxiv', url: 'https://arxiv.org/rss/cs.AI', source: 'arxiv' },
  { name: 'ieee_spectrum', url: 'https://spectrum.ieee.org/feeds/feed.rss', source: 'ieee_spectrum' },
  { name: 'mit_tech_review', url: 'https://www.technologyreview.com/feed/', source: 'mit_tech_review' },
  { name: 'spacenews', url: 'https://spacenews.com/feed/', source: 'spacenews' },
  { name: 'nature_biotech', url: 'https://www.nature.com/subjects/biotechnology.rss', source: 'nature_biotech' },
  { name: 'defense_one', url: 'https://www.defenseone.com/rss/all/', source: 'defense_one' },
  { name: 'robot_report', url: 'https://www.therobotreport.com/feed/', source: 'robot_report' },
  { name: 'electrek', url: 'https://electrek.co/feed/', source: 'electrek' },
  { name: 'semiengineering', url: 'https://semiengineering.com/feed/', source: 'semiengineering' },
  { name: 'arxiv_ar', url: 'https://arxiv.org/rss/cs.AR', source: 'arxiv_ar' },
  { name: 'semianalysis', url: 'https://semianalysis.com/feed/', source: 'semianalysis' },
  { name: 'techcrunch_startups', url: 'https://techcrunch.com/category/startups/feed/', source: 'techcrunch_startups' },
  { name: 'venturebeat', url: 'https://venturebeat.com/feed/', source: 'venturebeat' },
] as const;

const MAX_ITEMS_PER_SOURCE = 10;
const FETCH_TIMEOUT_MS = 15000;
const SUPABASE_TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const signal = init?.signal ?? AbortSignal.timeout(SUPABASE_TIMEOUT_MS);
        return fetch(input, { ...init, signal });
      },
    },
  });
}

type InsertResult = 'saved' | 'duplicate' | 'failed';

async function insertWithRetry(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
  label: string,
): Promise<InsertResult> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { error } = await supabase.from('articles').insert(row);
      if (!error) return 'saved';
      if (error.code === '23505') return 'duplicate';
      console.log(label + ' 保存エラー (' + attempt + '/' + MAX_RETRIES + '): ' + error.message);
    } catch (e: any) {
      const message = e && e.message ? e.message : String(e);
      console.log(label + ' 例外発生 (' + attempt + '/' + MAX_RETRIES + '): ' + message);
    }

    if (attempt < MAX_RETRIES) {
      const wait = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(label + ' ' + wait + 'ms 待機して再試行します');
      await sleep(wait);
    }
  }
  return 'failed';
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('環境変数 SUPABASE_URL / SUPABASE_ANON_KEY が設定されていません');
    process.exit(1);
  }

  const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  const parser = new Parser();
  const day = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getDay();

  let totalSaved = 0;
  let totalDuplicate = 0;
  let totalFailed = 0;
  const fetchFailedSources: string[] = [];
  const saveFailedSources: string[] = [];

  for (const { name, url, source } of SOURCES) {
    const label = '[' + name + ']';

    if (name.startsWith('arxiv') && (day === 0 || day === 6)) {
            console.log(label + ' 土日はスキップします');
      continue;
    }

    console.log(label + ' 取得開始...');

    let feed;
    try {
      const xml = await fetchWithTimeout(url);
      feed = await parser.parseString(xml);
    } catch (e: any) {
      const message = e && e.message ? e.message : String(e);
      console.log(label + ' RSS取得失敗：スキップします (' + message + ')');
      fetchFailedSources.push(name);
      continue;
    }

    console.log(label + ' 取得件数: ' + feed.items.length);
    if (feed.items.length === 0) {
      console.log(label + ' 記事なし：スキップします');
      continue;
    }

    const items = feed.items.slice(0, MAX_ITEMS_PER_SOURCE);
    let saved = 0;
    let duplicate = 0;
    let failed = 0;

    for (const item of items) {
      const title = item.title;
      const itemUrl = item.link;
      if (!title || !itemUrl) continue;
      const publishedAt = item.isoDate ?? item.pubDate ?? null;
      const description = item.contentSnippet
        ? item.contentSnippet.trim().slice(0, 1500)
        : null;

      const result = await insertWithRetry(
        supabase,
        { title, url: itemUrl, source, published_at: publishedAt, description },
        label,
      );

      if (result === 'saved') {
        saved++;
        console.log(label + ' 保存成功：' + title);
      } else if (result === 'duplicate') {
        duplicate++;
        console.log(label + ' 重複スキップ：' + title);
      } else {
        failed++;
        console.log(label + ' 保存失敗（' + MAX_RETRIES + '回試行後）：' + title);
      }
    }

    console.log(label + ' 完了 — 保存 ' + saved + ' / 重複 ' + duplicate + ' / 失敗 ' + failed);

    totalSaved += saved;
    totalDuplicate += duplicate;
    totalFailed += failed;
    if (failed > 0) saveFailedSources.push(name);
  }

  console.log('========================================');
  console.log('保存 ' + totalSaved + ' 件 / 重複 ' + totalDuplicate + ' 件 / 失敗 ' + totalFailed + ' 件');
  if (fetchFailedSources.length > 0) {
    console.log('RSS取得に失敗したソース: ' + fetchFailedSources.join(', '));
  }
  if (saveFailedSources.length > 0) {
    console.log('保存に失敗したソース: ' + saveFailedSources.join(', '));
  }
  console.log('========================================');

  if (totalSaved === 0 && totalDuplicate === 0) {
    console.error('全ソースで1件も保存できませんでした。パイプラインを中断します。');
    process.exit(1);
  }

  if (totalFailed > 0 || fetchFailedSources.length > 0) {
    console.log('一部に失敗がありましたが、後続処理を継続します。');
  }
}

main();