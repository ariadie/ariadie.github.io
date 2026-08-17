import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolDir, "..");
const baseUrl = "https://ariadie.github.io/";
const microsites = new Set(["aima", "control", "conv", "moo-mrpp", "pymoo", "signal"]);
const errors = [];

function walkFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "tools"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkFiles(full));
    else if (entry.isFile()) results.push(full);
  }
  return results;
}

function relative(file) {
  return path.relative(siteRoot, file).split(path.sep).join("/");
}

function canonicalFor(relativePath) {
  if (relativePath === "index.html") return baseUrl;
  if (relativePath.endsWith("/index.html")) return baseUrl + relativePath.slice(0, -"index.html".length);
  return baseUrl + relativePath;
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"))?.[2] ?? null;
}

function metaContent(html, key, value) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (attribute(tag, key)?.toLowerCase() === value.toLowerCase()) return attribute(tag, "content");
  }
  return null;
}

function canonicalValue(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if ((attribute(tag, "rel") || "").toLowerCase().split(/\s+/).includes("canonical")) return attribute(tag, "href");
  }
  return null;
}

function checkLocalReference(sourceRelative, rawReference) {
  const clean = rawReference.trim();
  if (!clean || clean.startsWith("#") || /^(?:https?:|mailto:|tel:|data:|javascript:|blob:|\/\/)/i.test(clean)) return;

  let pathname;
  try {
    pathname = decodeURIComponent(clean.split(/[?#]/, 1)[0]);
  } catch {
    errors.push(`${sourceRelative}: referensi lokal tidak dapat didekode: ${clean}`);
    return;
  }
  if (!pathname) return;

  const normalizedUrlPath = pathname.replace(/\\/g, "/").replace(/^\/+/, "");
  if (/(^|\/)(?:dst|p04|paper|klancar)(?:\/|$)/i.test(normalizedUrlPath) || /(?:^|\/)(?:refs|referensi_ariadie)\.html$/i.test(normalizedUrlPath)) {
    errors.push(`${sourceRelative}: referensi menuju konten privat: ${clean}`);
  }

  const sourceDir = path.dirname(path.join(siteRoot, sourceRelative));
  const target = pathname.startsWith("/")
    ? path.join(siteRoot, pathname.replace(/^\/+/, ""))
    : path.resolve(sourceDir, pathname);
  const resolved = pathname.endsWith("/") ? path.join(target, "index.html") : target;
  if (!fs.existsSync(resolved)) errors.push(`${sourceRelative}: target lokal tidak ditemukan: ${clean}`);
}

const allFiles = walkFiles(siteRoot);
const contentPages = allFiles
  .filter((file) => file.toLowerCase().endsWith(".html") && relative(file) !== "404.html")
  .sort((a, b) => relative(a).localeCompare(relative(b)));

for (const file of contentPages) {
  const rel = relative(file);
  const html = fs.readFileSync(file, "utf8");
  const expectedCanonical = canonicalFor(rel);

  for (const [label, actual] of [
    ["description", metaContent(html, "name", "description")],
    ["og:title", metaContent(html, "property", "og:title")],
    ["og:description", metaContent(html, "property", "og:description")],
    ["og:type", metaContent(html, "property", "og:type")],
    ["og:url", metaContent(html, "property", "og:url")]
  ]) {
    if (!actual?.trim()) errors.push(`${rel}: metadata ${label} hilang/kosong`);
  }

  const canonical = canonicalValue(html);
  if (canonical !== expectedCanonical) errors.push(`${rel}: canonical '${canonical}' seharusnya '${expectedCanonical}'`);
  if (metaContent(html, "property", "og:url") !== expectedCanonical) errors.push(`${rel}: og:url tidak sama dengan canonical`);

  const section = rel.split("/")[0];
  const shellCssCount = (html.match(/site-shell\.css/g) || []).length;
  const shellJsCount = (html.match(/site-shell\.js/g) || []).length;
  if (microsites.has(section) && (shellCssCount !== 1 || shellJsCount !== 1)) {
    errors.push(`${rel}: aset breadcrumb harus muncul tepat satu kali`);
  }
  if (!microsites.has(section) && (shellCssCount || shellJsCount)) {
    errors.push(`${rel}: aset breadcrumb tidak semestinya dipasang di halaman root`);
  }

  for (const tag of html.match(/<a\b[^>]*>/gi) || []) {
    if (attribute(tag, "target")?.toLowerCase() === "_blank") {
      const relTokens = new Set((attribute(tag, "rel") || "").toLowerCase().split(/\s+/).filter(Boolean));
      if (!relTokens.has("noopener") || !relTokens.has("noreferrer")) errors.push(`${rel}: tautan _blank belum aman: ${tag}`);
    }
    const href = attribute(tag, "href");
    if (href !== null) checkLocalReference(rel, href);
  }
  for (const tag of html.match(/<(?:img|script|link)\b[^>]*>/gi) || []) {
    const reference = attribute(tag, tag.toLowerCase().startsWith("<link") ? "href" : "src");
    if (reference !== null) checkLocalReference(rel, reference);
  }
}

const expectedUrls = contentPages.map((file) => canonicalFor(relative(file)));
const sitemap = fs.readFileSync(path.join(siteRoot, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
if (JSON.stringify(sitemapUrls) !== JSON.stringify(expectedUrls)) errors.push("sitemap.xml tidak sama dengan daftar canonical halaman publik");

const homepage = fs.readFileSync(path.join(siteRoot, "index.html"), "utf8");
if ((homepage.match(/<h1\b/gi) || []).length !== 1) errors.push("index.html harus memiliki tepat satu h1");
if (!homepage.includes('<span class="stat-value">Lintas</span>')) errors.push("index.html belum memakai label topik nonnumerik");

const conv02 = fs.readFileSync(path.join(siteRoot, "conv", "conv02.html"), "utf8");
if (/href\s*=\s*(["'])conv03\.html\1/i.test(conv02)) errors.push("conv/conv02.html masih menautkan conv03.html");

for (const required of ["404.html", "robots.txt", "README.md", "LICENSE.md", "assets/site-shell.css", "assets/site-shell.js"]) {
  if (!fs.existsSync(path.join(siteRoot, required))) errors.push(`file fondasi hilang: ${required}`);
}

if (errors.length) {
  console.error(`Audit gagal dengan ${errors.length} masalah:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Audit lulus: ${contentPages.length} halaman publik, ${microsites.size} microsite, ${sitemapUrls.length} URL sitemap, tanpa tautan lokal rusak.`);
}
