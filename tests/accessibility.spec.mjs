import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  "/",
  "/aima/chapter1.html",
  "/signal/intro.html",
  "/control/pid.html",
  "/conv/conv02.html",
  "/pymoo/index.html",
  "/moo-mrpp/"
];
const outputDir = path.resolve("qa-results", "axe");

for (const pagePath of pages) {
  test(`WCAG A/AA scan for ${pagePath}`, async ({ page }) => {
    await page.goto(pagePath, { waitUntil: "domcontentloaded" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    fs.mkdirSync(outputDir, { recursive: true });
    const slug = pagePath === "/" ? "home" : pagePath.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-");
    fs.writeFileSync(path.join(outputDir, `${slug}.json`), JSON.stringify(results, null, 2) + "\n", "utf8");

    const seriousOrCritical = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
    const summary = seriousOrCritical.map((violation) => `${violation.id} (${violation.nodes.length})`).join(", ");
    expect(seriousOrCritical.length, `Serious/critical axe violations: ${summary}. Details: qa-results/axe/${slug}.json`).toBe(0);
  });
}
