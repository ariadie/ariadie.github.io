import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolDir, "..");
const outputDir = path.join(siteRoot, "qa-results");
const ignoredDirectories = new Set([".git", ".github", ".lighthouseci", "lighthouse-report", "node_modules", "playwright-report", "qa-results", "test-results", "tests", "tools"]);

function walkHtml(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(full);
  }
  return files;
}

function hrefs(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)].map((match) => match[2]);
}

async function request(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "ariadie.github.io-link-check/1.0",
        ...(method === "GET" ? { Range: "bytes=0-0" } : {})
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function check(url) {
  const started = Date.now();
  try {
    let response = await request(url, "HEAD");
    if ([403, 405].includes(response.status)) response = await request(url, "GET");
    const result = {
      url,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      durationMs: Date.now() - started
    };
    await response.body?.cancel();
    return result;
  } catch (error) {
    return {
      url,
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started
    };
  }
}

const urls = new Set();
for (const file of walkHtml(siteRoot)) {
  for (const href of hrefs(fs.readFileSync(file, "utf8"))) {
    if (/^https?:\/\//i.test(href)) {
      const normalized = new URL(href);
      normalized.hash = "";
      urls.add(normalized.href);
    }
  }
}

const queue = [...urls].sort();
const results = [];
const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
  while (queue.length) {
    const url = queue.shift();
    if (url) results.push(await check(url));
  }
});
await Promise.all(workers);
results.sort((a, b) => a.url.localeCompare(b.url));

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "external-links.json"), JSON.stringify(results, null, 2) + "\n", "utf8");

const failures = results.filter((result) => !result.ok);
console.log(`Checked ${results.length} unique external URLs: ${results.length - failures.length} passed, ${failures.length} failed.`);
for (const failure of failures) console.error(`- ${failure.status ?? "ERROR"} ${failure.url}${failure.error ? ` (${failure.error})` : ""}`);
if (failures.length) process.exitCode = 1;
