import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.REVIEW_BROWSER_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let acceptDialog = true;
  let dialogs = 0;
  page.on("dialog", (d) => {
    dialogs++;
    return acceptDialog ? d.accept() : d.dismiss();
  });
  const base = process.env.REVIEW_BASE_URL || "http://127.0.0.1:5178";
  await page.goto(base + "/#/meu-treino");
  await page.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await page
    .getByRole("heading", { name: "Meu treino", exact: true })
    .waitFor();
  await page
    .getByRole("textbox", { name: "Nome da ficha", exact: true })
    .fill("Ficha recuperável");
  await expect(
    page.getByText("Ficha com alterações não salvas.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await expect(
    page.getByRole("heading", { name: "Recuperar sua ficha?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Recuperar rascunho", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Nome da ficha", exact: true }),
  ).toHaveValue("Ficha recuperável");
  await page.getByRole("button", { name: "Salvar ficha", exact: true }).click();
  await expect(
    page.getByText("Ficha sem alterações pendentes.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("cadencia-editor-draft-demo"),
    ),
  ).toBeNull();
  await page
    .locator(".bottom-nav")
    .getByRole("tab", { name: "Agenda", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/agenda$/);
  await expect(page.locator("main h1")).toBeFocused();
  await page
    .locator(".bottom-nav")
    .getByRole("tab", { name: "Evolução", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/evolucao$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/agenda$/);
  await expect(page.locator("main h1")).toContainText("Agenda");
  await page.goForward();
  await expect(page).toHaveURL(/#\/evolucao$/);
  const evolution = page
    .locator(".bottom-nav")
    .getByRole("tab", { name: "Evolução", exact: true });
  await evolution.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page
      .locator(".bottom-nav")
      .getByRole("tab", { name: "Meu treino", exact: true }),
  ).toBeFocused();
  await expect(page).toHaveURL(/#\/meu-treino$/);
  await page
    .getByRole("textbox", { name: "Nome da ficha", exact: true })
    .fill("Descartar alteração");
  acceptDialog = false;
  dialogs = 0;
  await page.goBack();
  await expect(page).toHaveURL(/#\/meu-treino$/);
  await expect(
    page.getByRole("textbox", { name: "Nome da ficha", exact: true }),
  ).toHaveValue("Descartar alteração");
  expect(dialogs).toBe(1);
  acceptDialog = true;
  await page.goBack();
  await expect(page).toHaveURL(/#\/evolucao$/);
  await page
    .locator(".bottom-nav")
    .getByRole("tab", { name: "Hoje", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/hoje$/);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("cadencia-editor-draft-demo"),
    ),
  ).toBeNull();
  await page
    .locator(".bottom-nav")
    .getByRole("tab", { name: "Meu treino", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Nome da ficha", exact: true }),
  ).toHaveValue("Ficha recuperável");
  expect(errors).toEqual([]);
  console.log(
    "PASS editor recovery/save/account draft and direct hash, Back/forward, heading focus, tab arrow focus",
  );
} finally {
  await browser.close();
}
