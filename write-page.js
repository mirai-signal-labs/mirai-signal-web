const fs = require('fs');

const content = `import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';

const DOMAINS = [
  { key: 'ai', label: 'AI', desc: 'LLM / Agents / AGI / OSS' },
  { key: 'robotics', label: 'Robotics', desc: 'Embodied AI / Autonomous Robots' },
  { key: 'biotech', label: 'Biotech', desc: 'Drug Discovery / Gene Editing' },
  { key: 'semiconductor', label: 'Semiconductor', desc: 'AI Chip / NVIDIA / HBM' },
  { key: 'energy', label: 'Energy', desc: 'Fusion / Battery Tech' },
  { key: 'space', label: 'Space', desc: 'SpaceX / Satellite AI' },
  { key: 'defense', label: 'Defense', desc: 'Defense AI / Drone' },
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

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
}

export default async function Home() {
  const supabase = createServerSupabaseClient();
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, url, source, published_at, summary, summary_ja, domain, title_ja')    .eq('status', 'approved')
    .order('published_at', { ascending: false })
    .limit(100);

  const items = (articles ?? []) as Article[];
  const getByDomain = (key: string) => items.filter((a) => a.domain === key);

  return (
    <div style={{ background: '#080810', minHeight: '100vh', color: '#afa9ec' }}>
      <style>{\`
        .ms-layout { display: grid; grid-template-columns: 160px 1fr; min-height: calc(100vh - 45px); }
        .ms-sidebar { display: block; }
        .ms-domain-tabs { display: none; }
        @media (max-width: 768px) {
          .ms-layout { grid-template-columns: 1fr; }
          .ms-sidebar { display: none; }
          .ms-domain-tabs { display: flex; }
        }
      \`}</style>

      <nav style={{ background: '#0b0b14', borderBottom: '0.5px solid #1e1e30', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
       <div style={{ fontSize: '16px', fontWeight: 600, color: '#c8c4ff', letterSpacing: '0.06em' }}>
          Mirai<span style={{ color: '#7f77dd' }}>Signal</span>
        </div>
        <Link href='/admin' style={{ fontSize: '11px', color: '#444441', textDecoration: 'none' }}>Admin</Link>
      </nav>

      <div className='ms-domain-tabs' style={{ overflowX: 'auto', borderBottom: '0.5px solid #1e1e30', background: '#0b0b14' }}>
        {DOMAINS.map((d) => (
          <Link key={d.key} href={'/domain/' + d.key} style={{ fontSize: '11px', color: '#888780', padding: '10px 14px', whiteSpace: 'nowrap', textDecoration: 'none', display: 'block' }}>
            {d.label}
          </Link>
        ))}
      </div>

      <div className='ms-layout'>
        <aside className='ms-sidebar' style={{ background: '#0b0b14', borderRight: '0.5px solid #1e1e30', padding: '20px 0' }}>
          <div style={{ padding: '0 14px 16px', borderBottom: '0.5px solid #1e1e30', marginBottom: '8px' }}>
            <p style={{ fontSize: '10px', color: '#534ab7', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px', fontWeight: 500 }}>Detecting the Signals</p>
<p style={{ fontSize: '12px', color: '#888780', margin: 0, lineHeight: 1.5 }}>Read the future first</p>
          </div>
          {DOMAINS.map((d) => (
            <Link key={d.key} href={'/domain/' + d.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: getByDomain(d.key).length > 0 ? '#888780' : '#2c2c2a', padding: '7px 14px', textDecoration: 'none' }}>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: getByDomain(d.key).length > 0 ? '#534ab7' : '#1e1e30', flexShrink: 0 }}></span>
              {d.label}
              {getByDomain(d.key).length > 0 && <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#26215c' }}>{getByDomain(d.key).length}</span>}
            </Link>
          ))}
        </aside>

        <main style={{ padding: '24px', overflowY: 'auto' }}>
          {DOMAINS.map((domain) => {
            const domainArticles = getByDomain(domain.key).slice(0, 3);
            if (domainArticles.length === 0) return null;
            const featured = domainArticles[0];
            const rest = domainArticles.slice(1);
            return (
              <div key={domain.key} style={{ marginBottom: '36px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px', borderBottom: '0.5px solid #1e1e30', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#7f77dd' }}>{domain.label}</span>
                    <span style={{ fontSize: '10px', color: '#444441' }}>{domain.desc}</span>
                  </div>
                  <Link href={'/domain/' + domain.key} style={{ fontSize: '10px', color: '#534ab7', textDecoration: 'none' }}>All articles</Link>
                </div>

                <div style={{ background: '#0e0e1a', border: '0.5px solid #1e1e30', borderLeft: '3px solid #534ab7', padding: '14px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', color: '#7f77dd', background: '#1a1830', padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.06em', display: 'inline-block', marginBottom: '8px' }}>TOP SIGNAL</span>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', lineHeight: 1.5 }}>
                    <Link href={'/article/' + featured.id} style={{ color: '#cecbf6', textDecoration: 'none' }}>
  {featured.title_ja ?? featured.title}
</Link>
{featured.title_ja && <p style={{ fontSize: '11px', color: '#444441', margin: '4px 0 0', lineHeight: 1.5 }}>{featured.title}</p>}

                  </div>
                  <div style={{ fontSize: '10px', color: '#3c3489', marginBottom: '6px' }}>{featured.source} - {formatDate(featured.published_at)}</div>
                  <p style={{ fontSize: '11px', color: '#5f5e5a', lineHeight: 1.7, margin: 0 }}>{featured.summary_ja ?? featured.summary ?? '-'}</p>
                </div>

                {rest.map((article, i) => (
                  <div key={article.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 10px', background: '#0e0e1a', border: '0.5px solid #1e1e30', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#26215c', fontWeight: 500, flexShrink: 0, width: '16px' }}>{i + 2}</span>
                    <div>
                      <Link href={'/article/' + article.id} style={{ fontSize: '11px', color: '#afa9ec', textDecoration: 'none', lineHeight: 1.4, display: 'block', marginBottom: '3px' }}>{article.title}</Link>
                      <span style={{ fontSize: '10px', color: '#3c3489' }}>{article.source} - {formatDate(article.published_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/app/page.tsx', content, 'utf8');
console.log('Done!');