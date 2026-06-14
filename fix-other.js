const fs = require('fs');
let c = fs.readFileSync('write-page.js', 'utf8');

// 文字化けしたdescを英語に置換
c = c.replace(
  /\{ key: 'other', label: 'Other', desc: '[^']*' \}/,
  "{ key: 'other', label: 'Other', desc: 'Other Technology' }"
);

fs.writeFileSync('write-page.js', c, 'utf8');
console.log('完了');
console.log('確認:', c.match(/other[^\n]*/)?.[0]);
