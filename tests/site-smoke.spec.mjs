import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", shell: false },
  { path: "/aima/chapter1.html", shell: true },
  { path: "/signal/intro.html", shell: true },
  { path: "/control/pid.html", shell: true },
  { path: "/conv/conv02.html", shell: true },
  { path: "/pymoo/index.html", shell: true },
  { path: "/moo-mrpp/", shell: true },
  { path: "/404.html", shell: false }
];

for (const entry of pages) {
  test(`loads ${entry.path} with its local assets`, async ({ page }) => {
    const localFailures = [];
    page.on("response", (response) => {
      if (response.url().startsWith("http://127.0.0.1:4173") && response.status() >= 400) {
        localFailures.push(`${response.status()} ${response.url()}`);
      }
    });

    const response = await page.goto(entry.path, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    expect((await page.title()).trim()).not.toBe("");
    if (entry.shell) await expect(page.locator(".acn-site-shell")).toBeVisible();
    expect(localFailures).toEqual([]);
  });
}

test("homepage drawer supports keyboard and restores focus", async ({ page }) => {
  await page.goto("/");
  const openButton = page.getByRole("button", { name: "Buka menu navigasi" });
  const drawer = page.locator("#drawer");
  const closeButton = drawer.getByRole("button", { name: "Tutup menu" });

  await expect(openButton).toHaveAttribute("aria-expanded", "false");
  await expect(drawer).toHaveAttribute("aria-hidden", "true");
  await openButton.focus();
  expect(await openButton.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await openButton.click();
  await expect(openButton).toHaveAttribute("aria-expanded", "true");
  await expect(drawer).toHaveAttribute("aria-hidden", "false");
  await expect(closeButton).toBeFocused();

  const lastLink = drawer.locator("a[href]").last();
  await lastLink.focus();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(openButton).toHaveAttribute("aria-expanded", "false");
  await expect(openButton).toBeFocused();
});

test("homepage theme control exposes its current action", async ({ page }) => {
  await page.goto("/");
  const toggle = page.locator("#themeToggle");
  const initialPressed = await toggle.getAttribute("aria-pressed");
  const initialLabel = await toggle.getAttribute("aria-label");
  await toggle.click();
  expect(await toggle.getAttribute("aria-pressed")).not.toBe(initialPressed);
  expect(await toggle.getAttribute("aria-label")).not.toBe(initialLabel);
});

test("homepage honors reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const transitionDuration = await page.locator("#drawer").evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transitionDuration)).toBeLessThan(0.01);
});
