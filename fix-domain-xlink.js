const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'app', 'domain', '[slug]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\r\n/g, '\n');

const before = '<Link href="/admin" style={{ fontSize: "11px", color: "#444441", textDecoration: "none" }}>Admin</Link>';
const after = `<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a href="https://x.com/MqS_quest" target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "#7f77dd", textDecoration: "none" }}>𝕏 フォローする</a>
          <Link href="/admin" style={{ fontSize: "11px", color: "#444441", textDecoration: "none" }}>Admin</Link>
        </div>`;

if (content.includes(before)) {
  content = content.replace(before, after);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('修正完了');
} else {
  console.log('警告: 対象箇所が見つかりませんでした');
}