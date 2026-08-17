import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolDir, "..");
const outputDir = path.join(siteRoot, "lighthouse-report");
const pages = [
  { slug: "home", url: "http://127.0.0.1:4173/" },
  { slug: "aima-chapter1", url: "http://127.0.0.1:4173/aima/chapter1.html" },
  { slug: "conv-conv02", url: "http://127.0.0.1:4173/conv/conv02.html" }
];

function waitForServer(processHandle) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Local site server did not become ready in 15 seconds.")), 15000);
    const onData = (chunk) => {
      const message = chunk.toString();
      process.stdout.write(message);
      if (message.includes("Site server listening")) {
        clearTimeout(timeout);
        processHandle.stdout.off("data", onData);
        resolve();
      }
    };
    processHandle.stdout.on("data", onData);
    processHandle.stderr.on("data", (chunk) => process.stderr.write(chunk));
    processHandle.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Local site server exited before it was ready (code ${code}).`));
    });
  });
}

const server = spawn(process.execPath, [path.join(toolDir, "serve-site.mjs")], {
  cwd: siteRoot,
  stdio: ["ignore", "pipe", "pipe"]
});
let chrome;

try {
  await waitForServer(server);
  chrome = await launch({ chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] });
  fs.mkdirSync(outputDir, { recursive: true });

  const summary = [];
  for (const page of pages) {
    const result = await lighthouse(page.url, {
      port: chrome.port,
      logLevel: "warn",
      output: ["html", "json"],
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"]
    });
    if (!result) throw new Error(`Lighthouse did not return a result for ${page.url}`);

    const reports = Array.isArray(result.report) ? result.report : [result.report];
    fs.writeFileSync(path.join(outputDir, `${page.slug}.html`), reports[0], "utf8");
    fs.writeFileSync(path.join(outputDir, `${page.slug}.json`), reports[1], "utf8");

    const scores = Object.fromEntries(
      Object.entries(result.lhr.categories).map(([key, category]) => [key, Math.round((category.score || 0) * 100)])
    );
    summary.push({ url: page.url, scores });
    console.log(`${page.url}: ${Object.entries(scores).map(([key, score]) => `${key}=${score}`).join(", ")}`);
  }

  fs.writeFileSync(path.join(outputDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");
} finally {
  if (chrome) await chrome.kill();
  server.kill("SIGTERM");
}
