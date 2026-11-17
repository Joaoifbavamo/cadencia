import { chromium, webkit, expect } from "@playwright/test";
import fs from "node:fs";
import { seedFrontendDemo } from "./helpers/frontend-fixture.mjs";
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
  page.on("dialog", (d) => d.accept());
  const base = process.env.REVIEW_BASE_URL || "http://localhost:5188";
  await page.goto(base);
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page
    .getByRole("button", { name: "Mostrar senha", exact: true })
    .click();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Ocultar senha", exact: true })
    .click();
  await page.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await seedFrontendDemo(page, 20);
  await page.evaluate(() => (location.hash = "#/ajustes"));
  await page
    .locator("summary")
    .filter({ hasText: "Cargas e aquecimento" })
    .click();
  await page.getByLabel("Peso da barra em kg", { exact: true }).fill("17.5");
  await expect(page.locator('.bottom-nav [aria-current="page"]')).toHaveCount(
    0,
  );
  expect(
    await page
      .locator(".nav-indicator")
      .evaluate((e) => getComputedStyle(e).opacity),
  ).toBe("0");
  await page.getByRole("tab", { name: "Alertas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Notificações", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Geral", exact: true }).click();
  await expect(
    page.getByLabel("Peso da barra em kg", { exact: true }),
  ).toHaveValue("17.5");
  await page.getByRole("tab", { name: "Geral", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Alertas", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Dados", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.locator("summary").filter({ hasText: "Seus dados" }).click();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar séries CSV" }).click();
  const csv = fs.readFileSync(await (await exported).path(), "utf8");
  expect(csv).toContain('"Data";"Exercício"');
  expect(csv).toContain("Supino");
  await page.evaluate(() => (location.hash = "#/agenda"));
  await page.getByLabel("Ir para uma data", { exact: true }).fill("2026-12-02");
  await expect(page.locator(".calendar-detail h2")).toContainText("2 de dez");
  await page
    .getByRole("button", { name: "Adicionar cardio ou atividade", exact: true })
    .click();
  await page.getByRole("button", { name: "Cardio", exact: true }).click();
  await expect(page.getByLabel("Atividade", { exact: true })).toHaveValue(
    "Cardio",
  );
  await expect(
    page.getByLabel("Duração em minutos", { exact: true }),
  ).toHaveValue("");
  await page.getByLabel("Duração em minutos", { exact: true }).fill("30");
  await page
    .getByRole("button", { name: "Salvar atividade", exact: true })
    .click();
  await expect(
    page.locator(".agenda-row").filter({ hasText: "Cardio" }),
  ).toContainText("30");
  await page.evaluate(() => (location.hash = "#/meu-treino"));
  await page.locator(".plan-day-links a").first().click();
  await expect(page).toHaveURL(/#\/meu-treino$/);
  const planFile = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar esta ficha" }).click();
  const plan = JSON.parse(
    fs.readFileSync(await (await planFile).path(), "utf8"),
  );
  expect(plan.documents).toHaveLength(1);
  expect(plan.documents[0].kind).toBe("plan");
  await page.evaluate(() => (location.hash = "#/evolucao"));
  await page.getByLabel("Buscar exercício", { exact: true }).fill("SUPINO");
  await expect(
    page.getByRole("status").filter({ hasText: "variações encontradas" }),
  ).toContainText("1");
  await page.goto(base + "/tests/fixtures/training-insights.html");
  await page.getByRole("button", { name: "Alternar teste" }).click();
  await page.getByRole("button", { name: "Aumentar carga em 2.5 kg" }).click();
  await expect(page.getByLabel("Carga série 1", { exact: true })).toHaveValue(
    "22.5",
  );
  await expect(
    page.getByLabel("Repetições série 1", { exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Diminuir carga em 2.5 kg" }).click();
  await expect(page.getByLabel("Carga série 1", { exact: true })).toHaveValue(
    "20",
  );
  expect(errors).toEqual([]);
  console.log(
    "PASS Ajustes com estado preservado, teclado, CSV legível, data e cardio, ficha, busca, senha e carga rápida sem reps inventadas.",
  );
} finally {
  await browser.close();
}
