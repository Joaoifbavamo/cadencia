import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.REVIEW_BROWSER_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const base = process.env.REVIEW_BASE_URL || "http://127.0.0.1:5174";
try {
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + "/tests/fixtures/progress-navigation.html");
  await expect(
    page.getByRole("heading", { name: "Últimas sessões comparáveis" }),
  ).toBeVisible();
  await expect(page.locator(".progress-comparison")).toContainText(
    "25 kg × 10 reps",
  );
  await expect(page.locator(".progress-comparison")).toContainText(
    "20 kg × 10 reps",
  );
  for (const width of [320, 375, 390, 430, 676]) {
    await page.setViewportSize({ width, height: 812 });
    await expect(page.locator(".lg-tab")).toHaveCount(5);
    const bounds = await page.evaluate(() => {
      const nav = document.querySelector(".bottom-nav").getBoundingClientRect();
      const tabs = [...document.querySelectorAll(".lg-tab")].map((tab) =>
        tab.getBoundingClientRect(),
      );
      return {
        scroll: document.documentElement.scrollWidth,
        width: innerWidth,
        left: nav.left,
        right: nav.right,
        last: tabs.at(-1).right,
        first: tabs[0].left,
      };
    });
    expect(bounds.scroll).toBe(width);
    expect(bounds.first).toBeGreaterThanOrEqual(bounds.left);
    expect(bounds.last).toBeLessThanOrEqual(bounds.right + 0.1);
    await page.locator(".lg-tab").nth(3).click();
    await expect(page.locator("#current")).toHaveText("Evolução");
    console.log("PASS glass bounds + click", width, bounds);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator(".bottom-nav").evaluate((nav) => {
    nav.style.left = "44px";
    nav.style.right = "44px";
  });
  await page.waitForTimeout(100);
  const safe = await page.evaluate(() => {
    const nav = document.querySelector(".bottom-nav").getBoundingClientRect();
    const last = [...document.querySelectorAll(".lg-tab")]
      .at(-1)
      .getBoundingClientRect();
    return { right: nav.right, last: last.right };
  });
  expect(safe.last).toBeLessThanOrEqual(safe.right);
  await page.locator(".bottom-nav").evaluate((nav) => {
    nav.style.removeProperty("left");
    nav.style.removeProperty("right");
  });
  await page.waitForTimeout(100);
  const bar = await page.locator(".lg-tab-bar").boundingBox();
  await page.mouse.move(bar.x + 30, bar.y + 25);
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.move(bar.x + bar.width - 30, bar.y + 25, { steps: 20 });
  await page.mouse.up();
  await expect(page.locator("#current")).toHaveText("Atividades");
  await page.locator(".lg-tab").nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#current")).toHaveText("Ficha");
  await page.screenshot({
    path: "../../work/guided/progress-navigation-mobile.png",
    fullPage: true,
  });
  const measure = async () =>
    page.evaluate(async () => {
      const original = Element.prototype.getBoundingClientRect;
      let count = 0;
      Element.prototype.getBoundingClientRect = function () {
        count++;
        return original.call(this);
      };
      await new Promise((resolve) => setTimeout(resolve, 500));
      Element.prototype.getBoundingClientRect = original;
      return count;
    });
  await page.waitForTimeout(500);
  const activeReads = await measure();
  await page.getByRole("button", { name: "Ocultar navegação" }).click();
  const hiddenReads = await measure();
  console.log(
    "Fixture layout rectangle reads / 500ms: visible glass",
    activeReads,
    "unmounted glass",
    hiddenReads,
  );
  await expect(page.locator(".bottom-nav")).toHaveCount(0);
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".bottom-nav")).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".static-nav")).toBeVisible();
  await expect(page.locator(".lg-tab-bar")).toHaveCount(0);
  await page.getByRole("button", { name: "Evolução", exact: true }).click();
  await expect(page.locator("#current")).toHaveText("Evolução");
  expect(errors).toEqual([]);
  console.log(
    "PASS drag, keyboard, unmount in workout/desktop and reduced-motion fallback; zero page errors",
  );
} finally {
  await browser.close();
}
