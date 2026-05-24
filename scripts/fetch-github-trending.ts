import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

const TRENDING_URL = "https://github.com/trending";
const SOURCE = "github_trending";
const MAX_ITEMS = 10;

type TrendingRepo = {
  title: string;
  url: string;
  description: string;
};

async function fetchTrendingRepos(): Promise<TrendingRepo[]> {
  const response = await fetch(TRENDING_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MiraiSignal/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub Trendingの取得に失敗しました: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const repos: TrendingRepo[] = [];

  $("article.Box-row").each((_, element) => {
    if (repos.length >= MAX_ITEMS) {
      return false;
    }

    const href = $(element).find("h2 a").first().attr("href");
    if (!href) {
      return;
    }

    const title = href.replace(/^\//, "");
    const url = `https://github.com${href}`;
    const description = $(element).find("p").first().text().trim();

    repos.push({ title, url, description });
  });

  return repos;
}

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

  try {
    const repos = await fetchTrendingRepos();

    for (const repo of repos) {
      const { error } = await supabase.from("articles").insert({
        title: repo.title,
        url: repo.url,
        source: SOURCE,
      });

      if (error) {
        if (error.code === "23505") {
          continue;
        }
        throw error;
      }

      console.log(`保存成功：${repo.title}`);
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
