import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs";
import { seedFrontendDemo } from "./helpers/frontend-fixture.mjs";
const base = process.env.REVIEW_BASE_URL || "http://127.0.0.1:5177",
  out = "test-results/frontend-audit",
  pass = process.env.AUDIT_PASS || "after";
fs.mkdirSync(out, { recursive: true });
const browser = await (
  process.env.BROWSER_ENGINE === "webkit" ? webkit : chromium
).launch({
  ...(process.env.BROWSER_ENGINE === "webkit"
    ? {}
    : {
        executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
      }),
  headless: true,
});
const p = await browser.newPage({
    viewport: { width: 390, height: 844 },
    ...(process.env.BROWSER_ENGINE === "webkit"
      ? { isMobile: true, hasTouch: true }
      : {}),
  }),
  errors = [],
  report = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("dialog", (d) => d.accept());
async function axeCheck(theme) {
  await p.addScriptTag({
    path: process.env.AXE_SCRIPT || "node_modules/axe-core/axe.min.js",
  });
  return p.evaluate(
    async (theme) =>
      (
        await axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
          },
        })
      ).violations.map((v) => ({
        theme,
        id: v.id,
        impact: v.impact,
        nodes: v.nodes
          .map((n) => ({ target: n.target, failure: n.failureSummary }))
          .slice(0, 6),
      })),
    theme,
  );
}
async function scan(name, shot = true) {
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(80);
  const violations = await axeCheck("light"),
    overflow = [];
  for (const width of [320, 375, 390, 430, 676, 768, 1024, 1440]) {
    await p.setViewportSize({ width, height: 844 });
    const b = await p.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    if (b.scroll > width + 1) overflow.push(b);
  }
  await p.setViewportSize({ width: 390, height: 844 });
  if (shot)
    await p.screenshot({ path: `${out}/${name}-${pass}.png`, fullPage: true });
  await p.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  violations.push(...(await axeCheck("dark")));
  if (shot)
    await p.screenshot({
      path: `${out}/${name}-dark-${pass}.png`,
      fullPage: true,
    });
  await p.evaluate(() => (document.documentElement.dataset.theme = "light"));
  report.push({ name, violations, overflow });
  fs.writeFileSync(
    `${out}/${pass}.json`,
    JSON.stringify({ report, errors }, null, 2),
  );
}
try {
  await p.goto(base);
  await scan("login");
  await p.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await seedFrontendDemo(p, 80);
  for (const [path, name] of [
    ["hoje", "today"],
    ["agenda", "agenda"],
    ["evolucao", "progress"],
    ["meu-treino", "editor"],
    ["instalar", "install"],
    ["ajustes", "settings"],
  ]) {
    await p.evaluate((path) => (location.hash = "#/" + path), path);
    await p.locator("main h1").waitFor();
    await scan(name);
    if (name === "editor") {
      await p.locator(".editor-summary").first().click();
      await scan("editor-open");
    }
    if (name === "settings") {
      for (const d of await p.locator("main details").all())
        await d.evaluate((e) => (e.open = true));
      await scan("settings-open");
    }
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.screenshot({
      path: `${out}/${name}-desktop-${pass}.png`,
      fullPage: true,
    });
    await p.setViewportSize({ width: 390, height: 844 });
  }
  await p.evaluate(() => (location.hash = "#/agenda"));
  const trigger = p.getByRole("button", { name: /Adicionar cardio/ });
  await trigger.focus();
  await trigger.press("Enter");
  await scan("activity-dialog");
  await p.setViewportSize({ width: 390, height: 380 });
  await expect(
    p.getByRole("button", { name: "Fechar", exact: true }),
  ).toBeVisible();
  await p.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(
    await p.evaluate(() => document.documentElement.style.overflow),
  ).not.toBe("hidden");
  await p.setViewportSize({ width: 390, height: 844 });
  await p.locator(".agenda-dates summary").first().click();
  await scan("agenda-dates");
  await p.evaluate(() => (location.hash = "#/hoje"));
  await p
    .getByRole("button", { name: /Treinar novamente|Começar treino/ })
    .click();
  await scan("warmup");
  await p
    .getByRole("button", { name: "Pular aquecimento", exact: true })
    .click();
  await scan("working-set");
  await p.getByLabel("Repetições série 1", { exact: true }).fill("8");
  await p.getByRole("button", { name: "Salvar série 1 e descansar" }).click();
  await scan("rest");
  await p.getByRole("button", { name: "Ver exercícios do treino" }).click();
  await scan("workout-overview");
  await p.locator(".guided-exercise-list > button").first().click();
  await p.getByRole("button", { name: "Ver séries deste exercício" }).click();
  await scan("workout-records");
  await p.getByRole("button", { name: "Ver exercícios do treino" }).click();
  await p.getByRole("button", { name: "Revisar e finalizar" }).click();
  await scan("workout-summary");
  await p.goto(base + "/tests/fixtures/notifications.html");
  await scan("notification-setup");
  await p.goto(base + "/tests/fixtures/motivation.html");
  await p.locator("summary").first().click();
  await scan("motivation-editor");
  for (const path of [
    "hoje",
    "agenda",
    "evolucao",
    "meu-treino",
    "instalar",
    "ajustes",
  ]) {
    await p.goto(base + "/#/" + path);
    if (
      await p
        .getByRole("button", { name: "Conhecer a demonstração" })
        .isVisible()
    )
      await p.getByRole("button", { name: "Conhecer a demonstração" }).click();
    await p.setViewportSize({ width: 320, height: 844 });
    await p.evaluate(() => (document.documentElement.style.fontSize = "200%"));
    const width = await p.evaluate(() => document.documentElement.scrollWidth);
    if (width > 321)
      report.push({
        name: path + "-text200",
        overflow: [{ width: 320, scroll: width }],
        violations: [],
      });
    await p.evaluate(() => (document.documentElement.style.fontSize = ""));
  }
  fs.writeFileSync(
    `${out}/${pass}.json`,
    JSON.stringify({ report, errors }, null, 2),
  );
  const failures = report.filter(
    (r) => r.violations.length || r.overflow.length,
  );
  console.log(JSON.stringify({ surfaces: report.length, failures, errors }));
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
} finally {
  await browser.close();
}
