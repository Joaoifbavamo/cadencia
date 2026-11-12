import { chromium } from "@playwright/test";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const out = new URL("../../../work/browser-monochrome/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
const shot = (p, n) =>
  p.screenshot({
    path: fileURLToPath(new URL(n + ".png", out)),
    fullPage: true,
  });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "light",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
await page.goto("http://127.0.0.1:5174");
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "Escuro", exact: true }).click();
if (
  (await page.evaluate(() => document.documentElement.dataset.theme)) !== "dark"
)
  throw Error("Dark theme failed");
await page.reload();
await page.getByRole("button", { name: "Claro", exact: true }).waitFor();
if (
  (await page.evaluate(() => document.documentElement.dataset.theme)) !== "dark"
)
  throw Error("Theme not persisted");
await page.getByRole("button", { name: "Sistema", exact: true }).click();
await page.emulateMedia({ colorScheme: "dark" });
await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
if (
  (await page.evaluate(() => document.documentElement.dataset.theme)) !== "dark"
)
  throw Error("System theme failed");
await page.getByRole("button", { name: "Claro", exact: true }).click();
await page.getByRole("button", { name: "Conhecer a demonstração" }).click();
await page.getByRole("heading", { name: "Treino de hoje" }).waitFor();
await page.getByRole("button", { name: "Escolher um treino" }).click();
await page.getByRole("button", { name: /Superior · exemplo/ }).click();
await shot(page, "iphone-light-today");
await page.getByRole("button", { name: "Começar treino" }).click();
await page.getByRole("heading", { name: "Série 1 de 3" }).waitFor();
await shot(page, "iphone-light-workout");
const saveButton = await page
  .getByRole("button", { name: "Salvar série 1", exact: true })
  .boundingBox();
if (!saveButton || saveButton.y + saveButton.height > 844)
  throw Error("Primary recording action not in first mobile viewport");
await page.getByLabel("Carga série 1", { exact: true }).fill("30,5");
await page.getByLabel("Repetições série 1", { exact: true }).fill("8");
await page.getByRole("button", { name: "Salvar série 1", exact: true }).click();
await page.getByRole("heading", { name: "Série 2 de 3" }).waitFor();
await page.reload();
await page.getByRole("button", { name: "Conhecer a demonstração" }).click();
await page.getByRole("button", { name: "Continuar treino" }).click();
await page.locator(".series-history summary").click();
await page.getByRole("button", { name: "Editar série 1", exact: true }).click();
if (
  (await page.getByLabel("Carga série 1", { exact: true }).inputValue()) !==
  "30.5"
)
  throw Error("Draft not persisted");
await page.locator(".series-history summary").click();
await page.getByRole("button", { name: "Série 2", exact: true }).click();
await page.getByLabel("Carga série 2", { exact: true }).fill("30");
await page.getByLabel("Repetições série 2", { exact: true }).fill("0");
await page.getByRole("button", { name: "Salvar série 2", exact: true }).click();
await page
  .getByRole("alert")
  .filter({ hasText: "Informe de 1 a 200 repetições." })
  .waitFor();
await page
  .getByRole("button", { name: "Próximo exercício", exact: true })
  .click();
await page
  .getByRole("heading", {
    name: "Remada sentada com apoio no peito",
    exact: true,
  })
  .waitFor();
await page.getByRole("button", { name: "Revisar treino", exact: true }).click();
await page
  .getByRole("button", { name: "Finalizar treino", exact: true })
  .click();
await page.getByRole("button", { name: "Ajustes", exact: true }).last().click();
await page.getByRole("button", { name: "Escuro", exact: true }).click();
await shot(page, "iphone-dark-settings");
await page.getByRole("button", { name: "Hoje", exact: true }).last().click();
await page.getByRole("button", { name: "Escolher um treino" }).click();
await page.getByRole("button", { name: /Superior · exemplo/ }).click();
await shot(page, "iphone-dark-today");
await page.getByRole("button", { name: "Ver séries", exact: true }).click();
await shot(page, "iphone-dark-workout");
await page.setViewportSize({ width: 1440, height: 1000 });
await shot(page, "desktop-dark-workout");
await page.getByRole("button", { name: "Voltar para hoje" }).click();
await page
  .getByRole("button", { name: "Evolução", exact: true })
  .first()
  .click();
await page.getByRole("heading", { name: "Histórico de séries" }).waitFor();
await page
  .getByRole("button", { name: "Ajustes", exact: true })
  .first()
  .click();
await page.getByRole("button", { name: "Claro", exact: true }).click();
await page.getByRole("button", { name: "Hoje", exact: true }).first().click();
await shot(page, "desktop-light-today");
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
if (overflow) throw Error("Horizontal overflow");
console.log(
  JSON.stringify({
    errors,
    overflow,
    passed:
      "themes light/dark/system and persistence; recording CTA visible on iPhone; optional RIR; decimal; resume; validation; completion; progress",
  }),
);
if (errors.length) throw Error("Browser errors");
await browser.close();
