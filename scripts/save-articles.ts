import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
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
] as const;

const MAX_ITEMS_PER_SOURCE = 10;
const FETCH_TIMEOUT_MS = 15000;

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

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) { console.error('env error'); process.exit(1); }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const parser = new Parser();
  const day = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getDay();
  try {
    for (const { name, url, source } of SOURCES) {
      if (name === 'arxiv' && (day === 0 || day === 6)) {
        console.log('[arxiv] 土日はスキップします');
        continue;
      }
      console.log('[' + name + '] 取得開始...');
      let feed;
      try {
        const xml = await fetchWithTimeout(url);
        feed = await parser.parseString(xml);
      } catch (e: any) {
        console.log('[' + name + '] タイムアウトまたは取得失敗：スキップ');
        continue;
      }
      console.log('[' + name + '] 取得件数: ' + feed.items.length);
      if (feed.items.length === 0) { console.log('[' + name + '] 記事なし：スキップ'); continue; }
      const items = feed.items.slice(0, MAX_ITEMS_PER_SOURCE);
      for (const item of items) {
        const title = item.title;
        const itemUrl = item.link;
        if (!title || !itemUrl) continue;
        const publishedAt = item.isoDate ?? item.pubDate ?? null;
        const { error } = await supabase.from('articles').insert({ title, url: itemUrl, source, published_at: publishedAt });
        if (error) {
          if (error.code === '23505') { console.log('[' + name + '] スキップ：' + title); continue; }
          throw error;
        }
        console.log('[' + name + '] 保存成功：' + title);
      }
    }
  } catch (error) {
    console.error('保存失敗:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();