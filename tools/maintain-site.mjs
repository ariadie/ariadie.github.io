import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolDir, "..");
const baseUrl = "https://ariadie.github.io/";
const microsites = new Set(["ai", "control", "conv", "moo-mrpp", "pymoo", "signal"]);

const descriptions = {
  "ai/index.html": "Panduan interaktif Kecerdasan Artifisial tentang agen, pencarian, permainan, constraint satisfaction, logika, dan topik AI lainnya dari beragam referensi.",
  "ai/chapter1.html": "Pengantar Kecerdasan Artifisial: definisi AI, fondasi bidang, sejarah, kemampuan, risiko, dan perkembangan agen cerdas.",
  "ai/chapter2a.html": "Intelligent agents, rationality, PEAS, serta karakteristik lingkungan tugas untuk perancangan agen cerdas.",
  "ai/chapter2b.html": "Struktur agen cerdas: simple reflex, model-based, goal-based, utility-based, learning agents, dan representasi internal.",
  "ai/chapter3a.html": "Formulasi masalah dan uninformed search, termasuk BFS, uniform-cost, depth-first, iterative deepening, dan evaluasinya.",
  "ai/chapter3b.html": "Informed search: greedy best-first, A*, heuristic functions, admissibility, consistency, dan pencarian berbasis memori.",
  "ai/chapter4a.html": "Pencarian pada lingkungan nondeterministik dan contingency problems, termasuk AND-OR search dan strategi conditional.",
  "ai/chapter4b.html": "Partially observable environments, belief states, sensorless problems, online search, dan exploration agents.",
  "ai/chapter5.html": "Adversarial search dan permainan: minimax, alpha-beta pruning, evaluation functions, stochastic games, dan Monte Carlo tree search.",
  "ai/chapter6.html": "Constraint Satisfaction Problems: constraint propagation, backtracking, heuristik variabel, local search, dan struktur masalah.",
  "ai/chapter7.html": "Logical agents dan propositional logic: knowledge bases, entailment, inference, theorem proving, dan model checking.",
  "ai/chapter8.html": "First-Order Logic: objek, relasi, fungsi, quantifier, syntax, semantics, dan knowledge engineering.",
  "ai/chapter9.html": "Inferensi dalam First-Order Logic: unification, forward chaining, backward chaining, resolution, dan pembuktian.",
  "conv/index.html": "Catatan interaktif Convex Optimization berdasarkan Boyd dan Vandenberghe, mencakup pengantar, convex sets, dan jalur materi lanjutan.",
  "conv/conv01.html": "Pengantar Convex Optimization: masalah optimasi, least squares, linear programming, convexity, duality, serta contoh aplikasi.",
  "conv/conv02.html": "Materi Convex Sets: affine dan convex sets, operasi, generalized inequalities, separation, dual cones, serta Pareto optimality.",
  "moo-mrpp/index.html": "Dokumentasi publik MOO-MRPP untuk optimasi multiobjektif pada multi-robot path planning, meliputi konsep, arsitektur, dan evaluasi.",
  "signal/index.html": "Panduan interaktif Signals & Systems berdasarkan Oppenheim, mencakup sistem LTI, Fourier, sampling, DFT, dan z-transform.",
  "signal/intro.html": "Pengantar sinyal dan sistem: klasifikasi sinyal, transformasi variabel bebas, sifat sistem, energi, daya, dan simulasi interaktif.",
  "signal/chapter2a.html": "Materi konvolusi sistem LTI waktu kontinu dan diskrit, impulse response, sifat konvolusi, serta visualisasi interaktif.",
  "signal/chapter2b.html": "Fungsi eigen sistem LTI serta penyelesaian persamaan beda dan diferensial untuk analisis respons sistem.",
  "signal/chapter3a.html": "Deret Fourier waktu kontinu dan diskrit: representasi harmonik, koefisien Fourier, konvergensi, dan sifat-sifat penting.",
  "signal/chapter3b.html": "Transformasi Fourier waktu kontinu dan diskrit: spektrum, sifat transformasi, duality, convolution, serta aplikasi analisis sistem.",
  "signal/chapter4a.html": "Filtering dan sampling waktu kontinu: frequency response, filter ideal, sampling theorem, dan hubungan domain waktu-frekuensi.",
  "signal/chapter4b.html": "Aliasing, rekonstruksi, dan pemrosesan diskrit untuk sinyal waktu kontinu, dilengkapi penjelasan dan visualisasi interaktif.",
  "signal/chapter5a.html": "DTFT, sampling pada domain diskrit, dan DFT: periodicity, frequency sampling, circular convolution, serta interpretasi spektrum.",
  "signal/chapter5b.html": "z-Transform: region of convergence, pole-zero plot, inverse transform, sifat transformasi, dan analisis sistem LTI diskrit."
};

function walkHtml(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", ".github", ".lighthouseci", "assets", "lighthouse-report", "node_modules", "playwright-report", "qa-results", "test-results", "tests", "tools"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) results.push(full);
  }
  return results;
}

function relPath(file) {
  return path.relative(siteRoot, file).split(path.sep).join("/");
}

function decodeEntities(value) {
  const named = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", mdash: "—", ndash: "–", nbsp: " " };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, num) => String.fromCodePoint(Number.parseInt(num, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function escapeAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function metaContent(html, key, value) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const keyMatch = tag.match(new RegExp(`\\b${key}\\s*=\\s*(["'])${value}\\1`, "i"));
    if (!keyMatch) continue;
    return tag.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i)?.[2] ?? "";
  }
  return null;
}

function hasCanonical(html) {
  return /<link\b(?=[^>]*\brel\s*=\s*(["'])canonical\1)[^>]*>/i.test(html);
}

function canonicalFor(relative) {
  if (relative === "index.html") return baseUrl;
  if (relative.endsWith("/index.html")) return baseUrl + relative.slice(0, -"index.html".length);
  return baseUrl + relative;
}

function hardenBlankTargets(html) {
  return html.replace(/<a\b[^>]*>/gi, (tag) => {
    if (!/\btarget\s*=\s*(["'])_blank\1/i.test(tag)) return tag;
    const rel = tag.match(/\brel\s*=\s*(["'])(.*?)\1/i);
    if (rel) {
      const tokens = new Set(rel[2].split(/\s+/).filter(Boolean).map((token) => token.toLowerCase()));
      tokens.add("noopener");
      tokens.add("noreferrer");
      return tag.replace(rel[0], `rel=${rel[1]}${[...tokens].join(" ")}${rel[1]}`);
    }
    return tag.replace(/>$/, ' rel="noopener noreferrer">');
  });
}

function injectManagedMetadata(html, relative) {
  if (relative === "404.html") return html;

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) throw new Error(`Missing title in ${relative}`);
  const titleText = decodeEntities(titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  const description = metaContent(html, "name", "description") ?? descriptions[relative];
  if (!description) throw new Error(`Missing managed description for ${relative}`);

  const canonical = canonicalFor(relative);
  const additions = [];
  if (metaContent(html, "name", "description") === null) additions.push(`<meta name="description" content="${escapeAttr(description)}">`);
  if (!hasCanonical(html)) additions.push(`<link rel="canonical" href="${canonical}">`);
  if (metaContent(html, "property", "og:title") === null) additions.push(`<meta property="og:title" content="${escapeAttr(titleText)}">`);
  if (metaContent(html, "property", "og:description") === null) additions.push(`<meta property="og:description" content="${escapeAttr(decodeEntities(description))}">`);
  if (metaContent(html, "property", "og:type") === null) additions.push('<meta property="og:type" content="website">');
  if (metaContent(html, "property", "og:url") === null) additions.push(`<meta property="og:url" content="${canonical}">`);

  if (additions.length) {
    const block = `\n  <!-- Managed site metadata -->\n  ${additions.join("\n  ")}`;
    html = html.replace(titleMatch[0], titleMatch[0] + block);
  }
  return html;
}

function injectSiteShell(html, relative) {
  const section = relative.split("/")[0];
  if (!microsites.has(section)) return html;
  if (!html.includes("site-shell.css")) {
    html = html.replace(/<\/head>/i, '  <link rel="stylesheet" href="../assets/site-shell.css">\n</head>');
  }
  if (!html.includes("site-shell.js")) {
    html = html.replace(/<\/head>/i, '  <script defer src="../assets/site-shell.js"></script>\n</head>');
  }
  return html;
}

const htmlFiles = walkHtml(siteRoot).sort((a, b) => relPath(a).localeCompare(relPath(b)));
const publicPages = [];

for (const file of htmlFiles) {
  const relative = relPath(file);
  let html = fs.readFileSync(file, "utf8");
  html = hardenBlankTargets(html);
  html = injectManagedMetadata(html, relative);
  html = injectSiteShell(html, relative);
  fs.writeFileSync(file, html, "utf8");
  if (relative !== "404.html") publicPages.push(relative);
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...publicPages.map((relative) => `  <url><loc>${canonicalFor(relative)}</loc></url>`),
  "</urlset>",
  ""
].join("\n");

fs.writeFileSync(path.join(siteRoot, "sitemap.xml"), sitemap, "utf8");
console.log(`Maintained ${publicPages.length} public HTML pages and rebuilt sitemap.xml.`);
