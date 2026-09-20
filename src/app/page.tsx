export const revalidate = 0;

import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import SubscribeForm from '@/app/components/SubscribeForm';
import ThemeToggle from "@/app/components/ThemeToggle";
import GlossaryGacha from "@/app/components/GlossaryGacha";

const DOMAINS = [
  { key: 'ai', label: 'AI', desc: 'LLM / Agents / AGI / OSS' },
  { key: 'robotics', label: 'Robotics', desc: 'Embodied AI / Autonomous Robots' },
  { key: 'biotech', label: 'Biotech', desc: 'Drug Discovery / Gene Editing' },
  { key: 'semiconductor', label: 'Semiconductor', desc: 'AI Chip / NVIDIA / HBM' },
  { key: 'energy', label: 'Energy', desc: 'Fusion / Battery Tech' },
  { key: 'space', label: 'Space', desc: 'SpaceX / Satellite AI' },
  { key: 'defense', label: 'Defense', desc: 'Defense AI / Drone' },
  { key: 'other', label: 'Other', desc: 'Other Technology' },
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
  title_ja: string | null;
};

type GlossaryTerm = {
  term: string;
  term_en: string | null;
  domain: string | null;
  explanation: string;
};

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
}

export default async function Home() {
  const supabase = createServerSupabaseClient();

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, url, source, published_at, summary, summary_ja, domain, title_ja')
    .eq('status', 'approved')
    .order('published_at', { ascending: false })
    .limit(100);

  const { data: countData } = await supabase
    .from('articles')
    .select('domain')
    .eq('status', 'approved');

  const { data: glossaryTerms } = await supabase
    .from('glossary_terms')
    .select('term, term_en, domain, explanation')
    .eq('status', 'approved');

  const items = (articles ?? []) as Article[];
  const glossaryItems = (glossaryTerms ?? []) as GlossaryTerm[];

  const domainCounts: Record<string, number> = {};
  (countData ?? []).forEach((a) => {
    if (a.domain) domainCounts[a.domain] = (domainCounts[a.domain] || 0) + 1;
  });

  const getByDomain = (key: string) => items.filter((a) => a.domain === key);

  return (
    <div style={{ background: 'var(--ms-bg)', minHeight: '100vh', color: 'var(--ms-text-primary)' }}>
      <style>{`
        .ms-layout { display: grid; grid-template-columns: 160px 1fr; min-height: calc(100vh - 45px); }
        .ms-sidebar { display: block; }
        .ms-domain-tabs { display: none; }
        @media (max-width: 768px) {
          .ms-layout { grid-template-columns: 1fr; }
          .ms-sidebar { display: none; }
          .ms-domain-tabs { display: flex; }
        }
      `}</style>

      <nav style={{ background: 'var(--ms-bg-sidebar)', borderBottom: '0.5px solid var(--ms-border)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ms-text-heading)', letterSpacing: '0.06em' }}>
          Mirai<span style={{ color: 'var(--ms-accent-strong)' }}>Signal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href='https://x.com/MqS_quest' target='_blank' rel='noopener noreferrer' style={{ fontSize: '11px', color: 'var(--ms-accent-strong)', textDecoration: 'none', whiteSpace: 'nowrap' }}>X フォローする</a>
          <Link href='/glossary' style={{ fontSize: '11px', color: 'var(--ms-text-label)', textDecoration: 'none', whiteSpace: 'nowrap' }}>用語集</Link>
          <Link href='/admin' style={{ fontSize: '11px', color: 'var(--ms-text-label)', textDecoration: 'none' }}>Admin</Link>
          <ThemeToggle />
        </div>
      </nav>

      <div className='ms-domain-tabs' style={{ overflowX: 'auto', borderBottom: '0.5px solid var(--ms-border)', background: 'var(--ms-bg-sidebar)' }}>
        {DOMAINS.map((d) => (
          <Link key={d.key} href={'/domain/' + d.key} style={{ fontSize: '11px', color: 'var(--ms-text-tertiary)', padding: '10px 14px', whiteSpace: 'nowrap', textDecoration: 'none', display: 'block' }}>
            {d.label}
          </Link>
        ))}
      </div>

      <div className='ms-layout'>
        <aside className='ms-sidebar' style={{ background: 'var(--ms-bg-sidebar)', borderRight: '0.5px solid var(--ms-border)', padding: '20px 0' }}>
          <div style={{ padding: '0 14px 16px', borderBottom: '0.5px solid var(--ms-border)', marginBottom: '8px' }}>
            <p style={{ fontSize: '10px', color: 'var(--ms-accent)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px', fontWeight: 500 }}>Detecting the Signals</p>
            <p style={{ fontSize: '12px', color: 'var(--ms-text-tertiary)', margin: 0, lineHeight: 1.5, whiteSpace: 'nowrap' }}>Read the future first</p>
          </div>

          <div style={{ padding: '14px', borderBottom: '0.5px solid var(--ms-border)', marginBottom: '8px' }}>
            <p style={{ fontSize: '10px', color: 'var(--ms-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px', fontWeight: 500 }}>Newsletter</p>
            <p style={{ fontSize: '11px', color: 'var(--ms-text-secondary)', margin: '0 0 10px', whiteSpace: 'nowrap' }}>毎朝、注目記事をメールで</p>
            <SubscribeForm compact={true} />
          </div>

          <div style={{ padding: '14px', borderBottom: '0.5px solid var(--ms-border)', marginBottom: '8px' }}>
            <a href='https://x.com/MqS_quest' target='_blank' rel='noopener noreferrer' style={{ fontSize: '11px', color: 'var(--ms-accent-strong)', textDecoration: 'none', whiteSpace: 'nowrap', display: 'block' }}>
              X @MqS_quest をフォロー
            </a>
          </div>

          <div style={{ padding: '0 14px 14px', borderBottom: '0.5px solid var(--ms-border)', marginBottom: '8px' }}>
            <Link href='/glossary' style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--ms-accent-strong)', textDecoration: 'none' }}>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--ms-accent)', flexShrink: 0 }}></span>
              用語集を見る
            </Link>
          </div>

          {DOMAINS.map((d) => {
            const totalCount = domainCounts[d.key] || 0;
            return (
              <Link key={d.key} href={'/domain/' + d.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: totalCount > 0 ? 'var(--ms-text-tertiary)' : 'var(--ms-text-disabled)', padding: '7px 14px', textDecoration: 'none' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: totalCount > 0 ? 'var(--ms-accent)' : 'var(--ms-border)', flexShrink: 0 }}></span>
                {d.label}
                {totalCount > 0 && <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--ms-accent-border)' }}>{totalCount}</span>}
              </Link>
            );
          })}
        </aside>

        <main style={{ padding: '24px', overflowY: 'auto' }}>
          {glossaryItems.length > 0 && (
            <div style={{ marginBottom: '32px', padding: '18px 20px', background: 'var(--ms-bg-card)', border: '0.5px solid var(--ms-border)', borderLeft: '3px solid var(--ms-accent)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '9px', color: 'var(--ms-accent-strong)', background: 'var(--ms-accent-dim)', padding: '2px 10px', borderRadius: '20px', letterSpacing: '0.08em', display: 'inline-block', marginBottom: '8px' }}>
                  🎲 用語ガチャ
                </span>
                <p style={{ fontSize: '12px', color: 'var(--ms-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  専門用語をランダムに1つ紹介します
                </p>
              </div>
              <GlossaryGacha terms={glossaryItems} buttonLabel="🎲 ガチャを引く" />
            </div>
          )}

          {DOMAINS.map((domain) => {
            const domainArticles = getByDomain(domain.key).slice(0, 3);
            if (domainArticles.length === 0) return null;
            const featured = domainArticles[0];
            const rest = domainArticles.slice(1);
            return (
              <div key={domain.key} style={{ marginBottom: '36px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px', borderBottom: '0.5px solid var(--ms-border)', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ms-accent-strong)' }}>{domain.label}</span>
                    <span style={{ fontSize: '10px', color: 'var(--ms-text-label)' }}>{domain.desc}</span>
                  </div>
                  <Link href={'/domain/' + domain.key} style={{ fontSize: '10px', color: 'var(--ms-accent)', textDecoration: 'none' }}>All articles</Link>
                </div>

                <div style={{ background: 'var(--ms-bg-card)', border: '0.5px solid var(--ms-border)', borderLeft: '3px solid var(--ms-accent)', padding: '14px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--ms-accent-strong)', background: 'var(--ms-accent-dim)', padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.06em', display: 'inline-block', marginBottom: '8px' }}>TOP SIGNAL</span>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', lineHeight: 1.5 }}>
                    <Link href={'/article/' + featured.id} style={{ color: 'var(--ms-text-link)', textDecoration: 'none' }}>
                      {featured.title_ja ?? featured.title}
                    </Link>
                    {featured.title_ja && <p style={{ fontSize: '11px', color: 'var(--ms-text-label)', margin: '4px 0 0', lineHeight: 1.5 }}>{featured.title}</p>}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--ms-text-muted)', marginBottom: '6px' }}>{featured.source} - {formatDate(featured.published_at)}</div>
                  <p style={{ fontSize: '11px', color: 'var(--ms-text-secondary)', lineHeight: 1.7, margin: 0 }}>{featured.summary_ja ?? featured.summary ?? '-'}</p>
                </div>

                {rest.map((article, i) => (
                  <div key={article.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 10px', background: 'var(--ms-bg-card)', border: '0.5px solid var(--ms-border)', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--ms-accent-border)', fontWeight: 500, flexShrink: 0, width: '16px' }}>{i + 2}</span>
                    <div>
                      <Link href={'/article/' + article.id} style={{ fontSize: '11px', color: 'var(--ms-text-primary)', textDecoration: 'none', lineHeight: 1.4, display: 'block', marginBottom: '3px' }}>{article.title_ja ?? article.title}</Link>
                      <span style={{ fontSize: '10px', color: 'var(--ms-text-muted)' }}>{article.source} - {formatDate(article.published_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          <div style={{ marginTop: '40px', padding: '24px', background: 'var(--ms-bg-card)', border: '0.5px solid var(--ms-border)', borderRadius: '8px' }}>
            <p style={{ fontSize: '10px', color: 'var(--ms-accent)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>Newsletter</p>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--ms-text-strong)', margin: '0 0 6px' }}>毎朝の注目記事を届ける</h2>
            <p style={{ fontSize: '12px', color: 'var(--ms-text-secondary)', margin: '0 0 16px' }}>海外AI・テクノロジーの最新動向をメールでお届けします</p>
            <SubscribeForm />
          </div>
        </main>
      </div>
    </div>
  );
}
