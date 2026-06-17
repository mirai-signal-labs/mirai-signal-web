const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const before = "lineHeight: 1.4, display: 'block', marginBottom: '3px' }}>{article.title}</Link>";
const after = "lineHeight: 1.4, display: 'block', marginBottom: '3px' }}>{article.title_ja ?? article.title}</Link>";

if (!content.includes(before)) {
  console.error('置き換え対象の文字列が見つかりませんでした。手動確認が必要です。');
  process.exit(1);
}

content = content.replace(before, after);
fs.writeFileSync(filePath, content, 'utf8');
console.log('修正完了: ' + filePath);