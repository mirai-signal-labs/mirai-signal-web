const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'app', 'domain', '[slug]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 紫色で表示している重複のtitle_jaブロックを削除
const duplicate = `{article.title_ja && (
  <p style={{ fontSize: "12px", color: "#7f77dd", margin: "4px 0 0", lineHeight: 1.5 }}>{article.title_ja}</p>
)}`;

content = content.replace(duplicate, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('完了');
