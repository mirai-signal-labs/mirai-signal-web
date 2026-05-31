import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const DOMAINS: Record<string, { label: string; desc: string }> = {
  ai: { label: 'AI', desc: 'LLM・エージェント・AGI・OSS・AIスタートアップ' },
  robotics: { label: 'Robotics', desc: '自律ロボット・embodied AI・工場自動化' },
  biotech: { label: 'Biotech', desc: 'AI創薬・遺伝子編集・longevity・AlphaFold' },
  semiconductor: { label: 'Semiconductor', desc: 'AI chip・NVIDIA・HBM・推論ハードウェア' },
  energy: { label: 'Energy', desc: '核融合・battery tech・AI電力最適化' },
  space: { label: 'Space', desc: 'SpaceX・宇宙インフラ・衛星AI' },
  defense: { label: 'Defense', desc: 'defense AI・drone warfare・autonomous systems' },
};

type Article = {
  id: string;
  title: string;
  url: string;
  source: string | null;
  published_at: string | null;
  summary: string | null;
  summary_ja: string | null;
};

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function ArchivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const domain = DOMAINS[slug];
  if (!domain) notFound();

  const supabase = createServerSupabaseClient();
  const { data: articles, count } = await supabase
    .from('articles')
    .select('id, title, url, source, published_at, summary, summary_ja', { count: 'exact' })
    .eq('status', 'approved')
    .eq('domain', slug)
    .order('published_at', { ascending: false });

  const items = (articles ?? []) as Article[];

  return (
    <div style={{ background: 'var(--ms-bg)', minHeight: '100vh' }}>
      <nav style={{ background: 'var(--ms-bg-nav)', borderBottom: '0.5px solid var(--ms-border-nav)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href='/' style={{ fontSize: '15px', fontWeight: 500, color: '#c8c4ff', letterSpacing: '0.06em', textDecoration: 'none' }}>
          Mirai<span style={{ color: 'var(--ms-accent-light)' }}>Signal</span>
        </Link>
        <Link href={'/domain/' + slug} style={{ fontSize: '12px', color: 'var(--ms-text-secondary)', textDecoration: 'none' }}>← {domain.label}へ戻る</Link>
      </nav>

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '11px', color: 'var(--ms-accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{domain.label} Archive</p>
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#e8e6ff', margin: '0 0 6px' }}>{domain.desc}</h1>
          <p style={{ fontSize: '13px', color: 'var(--ms-text-secondary)', margin: 0 }}>全{count ?? 0}件</p>
        </div>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--ms-border)', marginBottom: '20px' }} />

        {items.length === 0 ? (
          <p style={{ color: 'var(--ms-text-secondary)', fontSize: '14px' }}>記事がありません。</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map((article) => (
              <li key={article.id} style={{ background: 'var(--ms-bg-card)', border: '0.5px solid var(--ms-border)', borderLeft: '2px solid var(--ms-accent)', borderRadius: '0 8px 8px 0', padding: '18px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--ms-accent-light)', background: 'var(--ms-accent-dim)', padding: '2px 8px', borderRadius: '20px' }}>{article.source ?? '-'}</span>
                  <span style={{ fontSize: '11px', color: 'var(--ms-text-muted)' }}>{formatDate(article.published_at)}</span>
                </div>
                <h2 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 8px', lineHeight: 1.5 }}>
                  <Link href={'/article/' + article.id} style={{ color: 'var(--ms-text-primary)', textDecoration: 'none' }}>{article.title}</Link>
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--ms-text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  {article.summary_ja ?? article.summary ?? '-'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}