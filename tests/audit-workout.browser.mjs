import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  page.on("dialog", (d) => d.accept());
  const base = process.env.REVIEW_BASE_URL || "http://localhost:5192";
  await page.goto(`${base}/tests/fixtures/workout-review.html?mode=active`);
  await page
    .getByRole("button", { name: "Pular aquecimento", exact: true })
    .click();
  const load = page.getByRole("textbox", {
    name: "Carga série 1",
    exact: true,
  });
  const reps = page.getByRole("textbox", {
    name: "Repetições série 1",
    exact: true,
  });
  await load.fill("");
  await reps.fill("10");
  await page.locator(".guided-set-form button.primary").click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(
    JSON.parse(await page.locator("#documents").textContent()).filter(
      (d) => d.kind === "set",
    ),
  ).toHaveLength(0);
  await load.fill("72.5");
  await reps.fill("11");
  await page
    .getByRole("button", { name: "Ver séries deste exercício" })
    .click();
  await page
    .getByRole("button", { name: "Voltar às séries válidas", exact: true })
    .click();
  await expect(load).toHaveValue("72.5");
  await expect(reps).toHaveValue("11");
  await page.reload();
  await expect(load).toHaveValue("72.5");
  await expect(reps).toHaveValue("11");
  await page.locator("details.guided-instructions summary").click();
  await page
    .getByRole("button", { name: "Pular exercício", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Pular exercício" })
    .getByRole("textbox", { name: "Motivo" })
    .fill("Aparelho indisponível");
  await page
    .getByRole("dialog", { name: "Pular exercício" })
    .getByRole("button", { name: "Salvar e avançar" })
    .click();
  await page
    .getByRole("button", { name: "Conferir exercícios", exact: true })
    .click();
  await page.getByRole("button", { name: /^Retomar / }).click();
  expect(
    JSON.parse(await page.locator("#documents").textContent()).find(
      (d) => d.kind === "session",
    ).payload.skipped,
  ).toEqual({});
  console.log(
    "PASS blank load rejection, draft navigation/reload and skipped exercise resume",
  );
} finally {
  await browser.close();
}
