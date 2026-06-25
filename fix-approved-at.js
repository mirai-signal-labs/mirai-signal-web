const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'app', 'admin', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. approveArticle: approved_atを記録
const before1 = `await supabase.from("articles").update({ status: "approved" }).eq("id", id);
  revalidatePath("/admin");
}`;
const after1 = `await supabase.from("articles").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin");
}`;

// 2. rejectArticle: approved_atを記録
const before2 = `await supabase.from("articles").update({ status: "rejected" }).eq("id", id);
  revalidatePath("/admin");
}`;
const after2 = `await supabase.from("articles").update({ status: "rejected", approved_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin");
}`;

// 3. unapproveArticle: approved_atをnullに戻す
const before3 = `await supabase.from("articles").update({ status: "translated" }).eq("id", id);
  revalidatePath("/admin");
}

// 却下済み → 承認待ちに戻す`;
const after3 = `await supabase.from("articles").update({ status: "translated", approved_at: null }).eq("id", id);
  revalidatePath("/admin");
}

// 却下済み → 承認待ちに戻す`;

// 4. カレンダーのクエリをapproved_atベースに変更
const before4 = `const { data: calRaw } = await supabase
    .from("articles")
    .select("created_at, status")
    .in("status", ["approved", "rejected"])
    .gte("created_at", rangeStart)
    .lte("created_at", rangeEnd);

  // 日付ごとに approved / rejected の件数を集計する
  const calendarData: CalendarData = {};
  for (const row of calRaw ?? []) {
    if (!row.created_at) continue;
    const dateKey = toJSTDateString(row.created_at); // "YYYY-MM-DD"`;
const after4 = `const { data: calRaw } = await supabase
    .from("articles")
    .select("approved_at, status")
    .in("status", ["approved", "rejected"])
    .gte("approved_at", rangeStart)
    .lte("approved_at", rangeEnd);

  // 日付ごとに approved / rejected の件数を集計する
  const calendarData: CalendarData = {};
  for (const row of calRaw ?? []) {
    if (!row.approved_at) continue;
    const dateKey = toJSTDateString(row.approved_at); // "YYYY-MM-DD"`;

let count = 0;
if (content.includes(before1)) { content = content.replace(before1, after1); count++; console.log('1. approveArticle修正完了'); }
else console.log('警告: approveArticleが見つかりませんでした');

if (content.includes(before2)) { content = content.replace(before2, after2); count++; console.log('2. rejectArticle修正完了'); }
else console.log('警告: rejectArticleが見つかりませんでした');

if (content.includes(before3)) { content = content.replace(before3, after3); count++; console.log('3. unapproveArticle修正完了'); }
else console.log('警告: unapproveArticleが見つかりませんでした');

if (content.includes(before4)) { content = content.replace(before4, after4); count++; console.log('4. カレンダークエリ修正完了'); }
else console.log('警告: カレンダークエリが見つかりませんでした');

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n${count}/4 箇所修正完了`);