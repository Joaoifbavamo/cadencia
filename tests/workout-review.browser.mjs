import { chromium, expect } from "@playwright/test";
const base = process.env.REVIEW_BASE_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.REVIEW_BROWSER_PATH
    ? { executablePath: process.env.REVIEW_BROWSER_PATH }
    : {}),
});
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const open = async (mode) => {
    await page.goto(`${base}/tests/fixtures/workout-review.html?mode=${mode}`);
    await page.waitForLoadState("networkidle");
  };
  await open("history");
  await expect(
    page.getByRole("heading", { name: "Treino concluído", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pular exercício", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Ver e corrigir séries" }).click();
  await page.locator(".guided-exercise-list button").first().click();
  await page
    .getByRole("button", { name: "Editar série 1", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Carga série 1", exact: true })
    .fill("22.5");
  await page
    .getByRole("button", { name: "Salvar alteração da série 1" })
    .click();
  await expect(page.locator("#documents")).toContainText('"load":22.5');
  await expect(page.locator('[role="timer"]')).toHaveCount(0);
  const documents = JSON.parse(await page.locator("#documents").textContent());
  expect(documents.find((d) => d.kind === "session").payload.finishedAt).toBe(
    "2026-11-12T12:30:00Z",
  );
  await page
    .getByRole("button", { name: "Voltar ao resumo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Voltar para hoje", exact: true })
    .last()
    .click();
  await expect(page.getByText("Histórico fechado")).toBeVisible();
  console.log(
    "PASS historical correction preserves timestamp without a rest timer",
  );

  await open("history");
  await page.getByRole("button", { name: "Ver e corrigir séries" }).click();
  await page.locator(".guided-exercise-list button").first().click();
  await page
    .getByRole("button", { name: "Editar série 1", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Carga série 1", exact: true })
    .fill("25");
  await page
    .getByRole("button", { name: "Corrigir carga remotamente", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar alteração da série 1", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "O registro mudou em outro aparelho.",
  );
  await expect(page.locator("#documents")).toContainText('"load":35');
  console.log(
    "PASS remote set correction is preserved when an older form is saved",
  );
  await open("failure");
  await page.locator("details.guided-instructions summary").click();
  await page
    .getByRole("button", { name: "Pular exercício", exact: true })
    .click();
  const sheet = page.getByRole("dialog", { name: "Pular exercício" });
  await sheet.getByRole("textbox", { name: "Motivo" }).fill("");
  await sheet.getByRole("button", { name: "Salvar e avançar" }).click();
  await expect(sheet.getByRole("alert")).toHaveText("Informe o motivo.");
  await sheet.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: "Ver exercícios do treino", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Revisar e finalizar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finalizar treino", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText("Falha simulada ao salvar.");
  console.log(
    "PASS skip validation stays inside its dialog and finalization failure stays on review",
  );

  await open("active");
  await page.getByRole("button", { name: "Arquivar remotamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Este treino foi removido." }),
  ).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  console.log("PASS remotely archived sessions stop exposing editable forms");

  await open("editor");
  await expect(page.locator("#dirty")).toHaveText("false");
  await page
    .getByRole("textbox", { name: "Nome da ficha" })
    .fill("Ficha revisada");
  await expect(page.locator("#dirty")).toHaveText("true");
  const exercise = page.locator(".editor-summary").first();
  await expect(exercise).toHaveAttribute("aria-expanded", "false");
  await exercise.click();
  await expect(exercise).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Salvar ficha" }).click();
  await expect(page.locator("#dirty")).toHaveText("false");
  console.log(
    "PASS editor reports unsaved changes, successful save, and expanded state",
  );
  await open("editor-delay");
  await page
    .getByRole("textbox", { name: "Nome da ficha" })
    .fill("Ficha enviada");
  await page.getByRole("button", { name: "Salvar ficha" }).click();
  await page
    .getByRole("textbox", { name: "Nome da ficha" })
    .fill("Nova edição durante salvamento");
  await expect(page.locator("#documents")).toContainText("Ficha enviada");
  await expect(page.locator("#dirty")).toHaveText("true");
  const prevented = await page.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  console.log("PASS edits during saving remain dirty and protected on reload");
} finally {
  await browser.close();
}
