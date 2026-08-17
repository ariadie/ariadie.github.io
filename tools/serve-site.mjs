import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolDir, "..");
const port = Number.parseInt(process.env.PORT || "4173", 10);
const host = "127.0.0.1";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8"
};

function resolveRequest(requestUrl) {
  const parsed = new URL(requestUrl || "/", `http://${host}:${port}`);
  let pathname;
  try {
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }

  if (pathname.endsWith("/")) pathname += "index.html";
  const candidate = path.resolve(siteRoot, `.${pathname}`);
  if (candidate !== siteRoot && !candidate.startsWith(siteRoot + path.sep)) return null;
  return candidate;
}

const server = http.createServer((request, response) => {
  let file = resolveRequest(request.url);
  if (file && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");

  let status = 200;
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    file = path.join(siteRoot, "404.html");
    status = 404;
  }

  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[path.extname(file).toLowerCase()] || "application/octet-stream"
  });
  if (request.method === "HEAD") response.end();
  else fs.createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Site server listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
