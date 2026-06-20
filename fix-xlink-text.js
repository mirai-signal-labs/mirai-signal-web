const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\r\n/g, '\n');

const before = `𝕏 で毎日の更新情報をチェック → @MqS_quest`;
const after = `𝕏 @MqS_quest をフォロー`;

if (content.includes(before)) {
  content = content.replace(before, after);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('修正完了');
} else {
  console.log('警告: 対象箇所が見つかりませんでした');
}