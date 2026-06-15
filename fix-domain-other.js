const fs = require('fs');
const path = require('path');
 
const filePath = path.join(process.cwd(), 'src', 'app', 'domain', '[slug]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');
 
const oldStr = '  defense: { label: "Defense", desc: "Defense AI / Drone" },\n};';
const newStr = '  defense: { label: "Defense", desc: "Defense AI / Drone" },\n  other: { label: "Other", desc: "Other Technology" },\n};';
 
if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('完了');
} else {
  console.log('対象文字列が見つかりませんでした');
}
 
