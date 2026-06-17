const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 改行コードを統一して比較する（CRLF対応）
const normalize = (s) => s.replace(/\r\n/g, '\n');
content = normalize(content);

// 1. フッターの文字化けを修正（短い断片で確実にマッチ）
const footerH2Pattern = /<h2 style=\{\{ fontSize: '16px', fontWeight: 500, color: '#e8e6ff', margin: '0 0 6px' \}\}>[^<]*<\/h2>\s*\n\s*<p style=\{\{ fontSize: '12px', color: '#5f5e5a', margin: '0 0 16px' \}\}>[^<]*<\/p>/;

if (footerH2Pattern.test(content)) {
  content = content.replace(footerH2Pattern,
    `<h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e8e6ff', margin: '0 0 6px' }}>毎朝の注目記事を届ける</h2>\n              <p style={{ fontSize: '12px', color: '#5f5e5a', margin: '0 0 16px' }}>海外AI・テクノロジーの最新動向をメールでお届けします</p>`
  );
  console.log('フッターの文字化けを修正しました');
} else {
  console.log('警告: フッターのパターンが見つかりませんでした');
}

// 2. サイドバー上部にニュースレターフォームを追加
const sidebarPattern = /(<p style=\{\{ fontSize: '12px', color: '#888780', margin: 0, lineHeight: 1\.5 \}\}>Read the future first<\/p>\s*\n\s*<\/div>)/;

if (sidebarPattern.test(content)) {
  content = content.replace(sidebarPattern, (match) => {
    return match + `\n            <div style={{ padding: '14px', borderBottom: '0.5px solid #1e1e30', marginBottom: '8px' }}>\n              <p style={{ fontSize: '10px', color: '#534ab7', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px', fontWeight: 500 }}>Newsletter</p>\n              <p style={{ fontSize: '11px', color: '#5f5e5a', margin: '0 0 10px', lineHeight: 1.5 }}>毎朝、注目記事をメールで</p>\n              <SubscribeForm />\n            </div>`;
  });
  console.log('サイドバー上部にニュースレターフォームを追加しました');
} else {
  console.log('警告: サイドバーのパターンが見つかりませんでした');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('保存完了: ' + filePath);