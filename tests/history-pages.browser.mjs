import { chromium, expect } from "@playwright/test";
import { seedFrontendDemo } from "./helpers/frontend-fixture.mjs";
const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(process.env.REVIEW_BASE_URL || "http://127.0.0.1:5177");
  await p.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await seedFrontendDemo(p, 80);
  await p.evaluate(() => (location.hash = "#/evolucao"));
  await expect(p.locator("tbody tr")).toHaveCount(20);
  const first = await p.locator("tbody tr").first().innerText();
  await p.getByRole("button", { name: "Mais antigos" }).click();
  await expect(p.locator("tbody tr").first()).not.toHaveText(first);
  await p.getByRole("combobox", { name: /Período/ }).selectOption("30");
  await expect(p.getByRole("button", { name: "Mais recentes" })).toBeDisabled();
  console.log(
    "PASS histórico em páginas, próximo lote acessível, filtro reinicia página sem perder dados.",
  );
} finally {
  await b.close();
}
