import { approveArticle, rejectArticle } from "@/app/actions/articles";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string | null;
  published_at: string | null;
  summary: string | null;
  summary_ja: string | null;
};

function formatDate(dateString: string | null): string {
  if (!dateString) {
    return "—";
  }

  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function Home() {
  const supabase = createServerSupabaseClient();

  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, url, source, published_at, summary, summary_ja")
    .in("status", ["summarized", "translated"])
    .order("published_at", { ascending: false });

  if (error) {
    throw error;
  }

  const items = (articles ?? []) as Article[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 border-b border-zinc-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Mirai Signal
        </h1>
        <p className="mt-2 text-zinc-600">
          海外AI・テクノロジー情報の要約一覧
        </p>
      </header>

      {items.length === 0 ? (
        <p className="text-zinc-600">表示できる記事がありません。</p>
      ) : (
        <ul className="space-y-8">
          {items.map((article) => (
            <li
              key={article.id}
              className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold leading-snug">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline"
                >
                  {article.title}
                </a>
              </h2>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
                <span>{article.source ?? "—"}</span>
                <time dateTime={article.published_at ?? undefined}>
                  {formatDate(article.published_at)}
                </time>
              </div>

              <p className="mt-4 whitespace-pre-wrap leading-relaxed text-zinc-800">
                {article.summary_ja ?? article.summary ?? "—"}
              </p>

              <div className="mt-6 flex gap-3">
                <form action={approveArticle}>
                  <input type="hidden" name="id" value={article.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    承認
                  </button>
                </form>
                <form action={rejectArticle}>
                  <input type="hidden" name="id" value={article.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    却下
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
