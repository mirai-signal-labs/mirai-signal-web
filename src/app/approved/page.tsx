import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string | null;
  published_at: string | null;
  summary: string | null;
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

export default async function ApprovedPage() {
  const supabase = createServerSupabaseClient();

  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, url, source, published_at, summary")
    .eq("status", "approved")
    .order("published_at", { ascending: false });

  if (error) {
    throw error;
  }

  const items = (articles ?? []) as Article[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 border-b border-zinc-200 pb-6">
        <Link
          href="/"
          className="text-sm text-blue-700 hover:underline"
        >
          ← トップページへ戻る
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900">
          承認済み記事
        </h1>
        <p className="mt-2 text-zinc-600">
          公開候補として承認された記事一覧
        </p>
      </header>

      {items.length === 0 ? (
        <p className="text-zinc-600">承認済みの記事がありません。</p>
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
                {article.summary ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
