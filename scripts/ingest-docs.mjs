import { mkdir, writeFile } from "node:fs/promises";

const DOCS_HOME = "https://docs.colb.finance";
const LLMS_URL = `${DOCS_HOME}/llms.txt`;
const OUT_FILE = new URL("../data/docs.json", import.meta.url);
const CHUNK_WORDS = 320;
const OVERLAP_WORDS = 50;

function unique(values) {
  return [...new Set(values)];
}

function markdownLinks(markdown) {
  const links = [];
  const pattern = /\[([^\]]+)\]\((https:\/\/docs\.colb\.finance\/[^)\s]+?\.md)\)/g;
  let match;

  while ((match = pattern.exec(markdown))) {
    links.push({ title: match[1].trim(), url: match[2].trim() });
  }

  return unique(links.map((link) => JSON.stringify(link))).map((link) => JSON.parse(link));
}

function cleanMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pageTitle(fallback, markdown) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback;
}

function headingFor(wordsBefore, markdown) {
  const before = markdown.split(/\s+/).slice(0, wordsBefore).join(" ");
  const headings = [...before.matchAll(/#{1,3}\s+([^#]+?)(?=\s+#|\s*$)/g)];
  return headings.at(-1)?.[1]?.trim() || "";
}

function chunkPage(page) {
  const clean = cleanMarkdown(page.markdown);
  const words = clean.split(/\s+/).filter(Boolean);
  const chunks = [];

  if (!words.length) return chunks;

  for (let start = 0; start < words.length; start += CHUNK_WORDS - OVERLAP_WORDS) {
    const slice = words.slice(start, start + CHUNK_WORDS);
    if (slice.length < 35 && chunks.length) break;

    chunks.push({
      id: `${page.slug}-${chunks.length + 1}`,
      title: page.title,
      heading: headingFor(start, page.markdown),
      url: page.url.replace(/\.md$/, ""),
      text: slice.join(" ")
    });
  }

  return chunks;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "ColbDocsAI/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.text();
}

async function main() {
  const llms = await fetchText(LLMS_URL);
  const links = markdownLinks(llms);

  if (!links.length) {
    throw new Error("No markdown documentation links found in llms.txt");
  }

  const pages = [];

  for (const [index, link] of links.entries()) {
    const markdown = await fetchText(link.url);
    const slug = link.url
      .replace(`${DOCS_HOME}/`, "")
      .replace(/\.md$/, "")
      .replace(/[^\w-]+/g, "-");

    pages.push({
      title: pageTitle(link.title, markdown),
      url: link.url.replace(/\.md$/, ""),
      slug,
      markdown
    });

    console.log(`${index + 1}/${links.length} ${link.url}`);
  }

  const chunks = pages.flatMap(chunkPage);
  const payload = {
    generatedAt: new Date().toISOString(),
    source: LLMS_URL,
    pages: pages.map(({ title, url, slug }) => ({ title, url, slug })),
    chunks
  };

  await mkdir(new URL("../data", import.meta.url), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`Wrote ${chunks.length} chunks from ${pages.length} pages to ${OUT_FILE.pathname}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
