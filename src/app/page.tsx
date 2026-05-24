import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';

const DOMAINS = [
  { key: 'ai', label: 'AI', desc: 'LLM・エージェント・AGI・OSS' },
  { key: 'robotics', label: 'Robotics', desc: '自律ロボット・embodied AI' },
  { key: 'biotech', label: 'Biotech', desc: 'AI創薬・遺伝子編集・longevity' },
  { key: 'semiconductor', label: 'Semiconductor', desc: 'AI chip・NVIDIA・HBM' },
  { key: 'energy', label: 'Energy', desc: '核融合・battery・電力最適化' },
  { key: 'space', label: 'Space', desc: 'SpaceX・宇宙インフラ・衛星AI' },
  { key: 'defense', label: 'Defense', desc: 'defense AI・drone・autonomous' },
] as const;

type Article = {
  id: string;
  title: string;
  url: string;
  source: string | null;
  published_at: string | null;
  summary_ja: string | null;
  summary: string | null;
  domain: string | null;
};

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
}

export default async function Home() {
  const supabase = createServerSupabaseClient();
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, url, source, published_at, summary, summary_ja, domain')
    .eq('status', 'approved')
    .order('published_at', { ascending: false })
    .limit(100);

  const items = (articles ?? []) as Article[];

  return (
    <div style={{ background: 'var(--ms-bg)', minHeight: '100vh' }}>
      <nav style={{ background: 'var(--ms-bg-nav)', borderBottom: '0.5px solid var(--ms-border-nav)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '15px', fontWeight: 500, color: '#c8c4ff', letterSpacing: '0.06em' }}>
          Mirai<span style={{ color: 'var(--ms-accent-light)' }}>Signal</span>
        </div>
        <Link href='/admin' style={{ fontSize: '12px', color: 'var(--ms-text-secondary)', textDecoration: 'none' }}>Admin</Link>
      </nav>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '11px', color: 'var(--ms-accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Detecting the Signals of Tomorrow</p>
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#e8e6ff', margin: '0 0 6px' }}>未来の兆候を、先に読む</h1>
          <p style={{ fontSize: '13px', color: 'var(--ms-text-secondary)', margin: 0 }}>海外AI・テクノロジー情報の要約一覧</p>
        </div>

        {DOMAINS.map((domain) => {
          const domainArticles = items.filter((a) => a.domain === domain.key).slice(0, 3);
          if (domainArticles.length === 0) return null;
          return (
            <div key={domain.key} style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px', borderBottom: '0.5px solid var(--ms-border)', paddingBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ms-accent-light)' }}>{domain.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--ms-text-secondary)', marginLeft: '10px' }}>{domain.desc}</span>
                </div>
                <Link href={'/domain/' + domain.key} style={{ fontSize: '11px', color: 'var(--ms-accent)', textDecoration: 'none' }}>すべて見る →</Link>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {domainArticles.map((article) => (
                  <li key={article.id} style={{ background: 'var(--ms-bg-card)', border: '0.5px solid var(--ms-border)', borderLeft: '2px solid var(--ms-accent)', borderRadius: '0 8px 8px 0', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'var(--ms-accent-light)', background: 'var(--ms-accent-dim)', padding: '2px 8px', borderRadius: '20px' }}>{article.source ?? '-'}</span>
                      <span style={{ fontSize: '11px', color: 'var(--ms-text-muted)' }}>{formatDate(article.published_at)}</span>
                    </div>
                    <h3 style={{ fontSize: '13px', fontWeight: 500, margin: '0 0 6px', lineHeight: 1.5 }}>
                      <a href={article.url} target='_blank' rel='noopener noreferrer' style={{ color: 'var(--ms-text-primary)', textDecoration: 'none' }}>{article.title}</a>
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--ms-text-secondary)', lineHeight: 1.7, margin: 0 }}>
                      {article.summary_ja ?? article.summary ?? '-'}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {items.filter(a => !a.domain).length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ borderBottom: '0.5px solid var(--ms-border)', paddingBottom: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ms-text-secondary)' }}>Other</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.filter(a => !a.domain).slice(0, 3).map((article) => (
                <li key={article.id} style={{ background: 'var(--ms-bg-card)', border: '0.5px solid var(--ms-border)', borderLeft: '2px solid #444441', borderRadius: '0 8px 8px 0', padding: '14px 16px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 500, margin: '0 0 6px', lineHeight: 1.5 }}>
                    <a href={article.url} target='_blank' rel='noopener noreferrer' style={{ color: 'var(--ms-text-primary)', textDecoration: 'none' }}>{article.title}</a>
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--ms-text-secondary)', lineHeight: 1.7, margin: 0 }}>{article.summary_ja ?? article.summary ?? '-'}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}