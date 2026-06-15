import { createServer } from "node:http";
import { existsSync, createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import chatHandler from "../api/chat.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 3000);

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp"
};

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = normalize(join(root, pathname));

  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  res.setHeader("content-type", MIME[extname(filePath)] || "application/octet-stream");
  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  if (req.url?.startsWith("/api/chat")) {
    chatHandler(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Colb Docs AI Chat: http://localhost:${port}`);
});
