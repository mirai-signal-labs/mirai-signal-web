import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import Parser from "rss-parser";

const SOURCES = [
  {
    name: "hackernews",
    url: "https://news.ycombinator.com/rss",
    source: "hackernews",
  },
  {
    name: "techcrunch",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    source: "techcrunch",
  },
  {
    name: "arxiv",
    url: "https://arxiv.org/rss/cs.AI",
    source: "arxiv",
  },
] as const;

const MAX_ITEMS_PER_SOURCE = 10;

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "SUPABASE_URL と SUPABASE_ANON_KEY を環境変数に設定してください。",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const parser = new Parser();

  try {
    const day = new Date().getDay();

    for (const { name, url, source } of SOURCES) {
      if (name === "arxiv" && (day === 0 || day === 6)) {
        console.log("[arxiv] 土日はスキップします");
        continue;
      }

      console.log(`[${name}] 取得開始...`);
      const feed = await parser.parseURL(url);
      console.log(`[${name}] 取得件数: ${feed.items.length}`);
      const items = feed.items.slice(0, MAX_ITEMS_PER_SOURCE);

      for (const item of items) {
        const title = item.title;
        const itemUrl = item.link;

        if (!title || !itemUrl) {
          continue;
        }

        const publishedAt = item.isoDate ?? item.pubDate ?? null;

        const { error } = await supabase.from("articles").insert({
          title,
          url: itemUrl,
          source,
          published_at: publishedAt,
        });

        if (error) {
          if (error.code === "23505") {
            console.log(`[${name}] スキップ：${title}`);
            continue;
          }
          throw error;
        }

        console.log(`[${name}] 保存成功：${title}`);
      }
    }
  } catch (error) {
    console.error(
      "記事の保存に失敗しました:",
      JSON.stringify(error, null, 2),
    );
    process.exit(1);
  }
}

main();
