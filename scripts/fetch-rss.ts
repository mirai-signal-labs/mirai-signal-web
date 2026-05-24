import Parser from "rss-parser";

const RSS_URL =
  "https://techcrunch.com/category/artificial-intelligence/feed/";

async function main(): Promise<void> {
  const parser = new Parser();

  try {
    const feed = await parser.parseURL(RSS_URL);

    for (const item of feed.items) {
      console.log(item.title ?? "(no title)");
      console.log(item.link ?? "(no url)");
      console.log("");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(`RSSの取得に失敗しました: ${message}`);
    process.exit(1);
  }
}

main();
