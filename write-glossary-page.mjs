import fs from "fs";

const b64 = "PASTE_BASE64_HERE";
const content = Buffer.from(b64, "base64").toString("utf-8");

fs.mkdirSync("src/app/admin/glossary", { recursive: true });
fs.writeFileSync("src/app/admin/glossary/page.tsx", content, "utf-8");

console.log("書き込み完了:", content.split("\n").length, "行");