import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs";
const engine = process.env.BROWSER_ENGINE === "webkit" ? webkit : chromium;
const browser = await engine.launch({
  headless: true,
  ...(engine === chromium
    ? {
        executablePath:
          process.env.REVIEW_BROWSER_PATH ||
          "C:/Program Files/Google/Chrome/Application/chrome.exe",
      }
    : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    (process.env.REVIEW_BASE_URL || "http://localhost:5188") +
      "/tests/fixtures/training-insights.html",
  );
  await expect(
    page.getByRole("heading", { name: "Evolução", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".insights-summary")).toContainText("25");
  await expect(page.locator(".attendance-bars time")).toHaveCount(8);
  await page.getByRole("button", { name: "Repetições", exact: true }).click();
  await expect(page.locator(".chart-explore output")).toContainText("19 reps");
  await page.getByRole("button", { name: "Volume", exact: true }).click();
  await expect(page.locator(".chart-explore output")).toContainText(
    "402,5 kg·reps",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const file = await download;
  expect(fs.readFileSync(await file.path(), "utf8")).toContain('"20";"10";""');
  for (const theme of ["light", "dark"])
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
      if (width !== 320)
        await page.screenshot({
          path: `test-results/guided/insights-${theme}-${width}.png`,
          fullPage: true,
        });
    }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Alternar teste" }).click();
  await expect(page.getByLabel("Referência da série")).toContainText(
    "Semana passada",
  );
  await expect(page.getByLabel("Referência da série")).toContainText(
    "20 kg × 10 reps",
  );
  await expect(page.getByLabel("Carga série 1", { exact: true })).toHaveValue(
    "20",
  );
  await expect(
    page.getByLabel("Repetições série 1", { exact: true }),
  ).toHaveValue("");
  await page.getByLabel("Repetições série 1", { exact: true }).fill("11");
  await page.getByRole("button", { name: /Salvar série 1/ }).click();
  await page.getByRole("button", { name: "Encerrar descanso agora" }).click();
  await expect(page.getByLabel("Referência da série")).toContainText(
    "22.5 kg × 9 reps",
  );
  await expect(page.getByLabel("Carga série 2", { exact: true })).toHaveValue(
    "22.5",
  );
  await expect(
    page.getByLabel("Repetições série 2", { exact: true }),
  ).toHaveValue("");
  await page.screenshot({
    path: "test-results/guided/insights-workout.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  console.log(
    "PASS comparação por série, reps vazias, métricas, exportação, temas e responsividade.",
  );
} finally {
  await browser.close();
}
