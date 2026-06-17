const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. フッターの文字化けを修正
const footerBefore = `<h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e8e6ff', margin: '0 0 6px' }}>豈取悃縺ｮ豕ｨ逶ｮ險倅ｺ九ｒ螻翫￠繧・/h2>
              <p style={{ fontSize: '12px', color: '#5f5e5a', margin: '0 0 16px' }}>豬ｷ螟泡I繝ｻ繝・け繝弱Ο繧ｸ繝ｼ縺ｮ譛譁ｰ蜍募髄繧偵Γ繝ｼ繝ｫ縺ｧ縺雁ｱ翫￠縺励∪縺・/p>`;

const footerAfter = `<h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e8e6ff', margin: '0 0 6px' }}>毎朝の注目記事を届ける</h2>
              <p style={{ fontSize: '12px', color: '#5f5e5a', margin: '0 0 16px' }}>海外AI・テクノロジーの最新動向をメールでお届けします</p>`;

if (content.includes(footerBefore)) {
  content = content.replace(footerBefore, footerAfter);
  console.log('フッターの文字化けを修正しました');
} else {
  console.log('警告: フッターの文字化け箇所が見つかりませんでした（手動確認が必要）');
}

// 2. サイドバー上部にニュースレターフォームを追加
const sidebarMarker = `<p style={{ fontSize: '12px', color: '#888780', margin: 0, lineHeight: 1.5 }}>Read the future first</p>
            </div>`;

const sidebarReplacement = `<p style={{ fontSize: '12px', color: '#888780', margin: 0, lineHeight: 1.5 }}>Read the future first</p>
            </div>
            <div style={{ padding: '14px', borderBottom: '0.5px solid #1e1e30', marginBottom: '8px' }}>
              <p style={{ fontSize: '10px', color: '#534ab7', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px', fontWeight: 500 }}>Newsletter</p>
              <p style={{ fontSize: '11px', color: '#5f5e5a', margin: '0 0 10px', lineHeight: 1.5 }}>毎朝、注目記事をメールで</p>
              <SubscribeForm />
            </div>`;

if (content.includes(sidebarMarker)) {
  content = content.replace(sidebarMarker, sidebarReplacement);
  console.log('サイドバー上部にニュースレターフォームを追加しました');
} else {
  console.log('警告: サイドバーの挿入箇所が見つかりませんでした（手動確認が必要）');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('保存完了: ' + filePath);