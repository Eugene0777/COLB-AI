import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "api/chat.js",
  "data/docs.json",
  "media/LOGO.svg",
  "media/Roboto-Regular.ttf",
  "media/Roboto-Bold.ttf",
  "media/EBGaramond-Regular.ttf",
  "media/COLB_cool.webp",
  "media/COLB_love-hard.webp",
  "media/COLB_sus.webp"
];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const docs = JSON.parse(readFileSync("data/docs.json", "utf8"));
if (!Array.isArray(docs.chunks) || docs.chunks.length === 0) {
  throw new Error("Docs index is empty. Run npm run ingest.");
}

console.log(`OK: ${docs.pages.length} pages, ${docs.chunks.length} chunks indexed.`);
