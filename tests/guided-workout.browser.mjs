import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const base = process.env.REVIEW_BASE_URL || "http://127.0.0.1:5177";
const b = await chromium.launch({
  executablePath:
    process.env.REVIEW_BROWSER_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const errors = [];
const context = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await context.newPage();
p.on("pageerror", (e) => errors.push(e.message));
const shots = "../../work/guided";
fs.mkdirSync(shots, { recursive: true });
async function overflow(label) {
  for (const width of [320, 375, 390, 430, 676, 1280]) {
    await p.setViewportSize({ width, height: 844 });
    await p.waitForTimeout(80);
    const bad = await p.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: innerWidth,
      offenders: [...document.querySelectorAll("main *")]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return (
            r.width &&
            r.right > innerWidth + 1 &&
            getComputedStyle(e).position !== "fixed"
          );
        })
        .map((e) => e.tagName + "." + e.className)
        .slice(0, 5),
    }));
    expect(
      bad.scroll,
      `${label} ${width} ${JSON.stringify(bad.offenders)}`,
    ).toBeLessThanOrEqual(width + 1);
  }
  await p.setViewportSize({ width: 390, height: 844 });
}
try {
  await p.goto(base);
  await p.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await p
    .getByRole("button", { name: "Escolher um treino", exact: true })
    .click();
  await p
    .getByRole("dialog")
    .getByRole("button", { name: /Superior/ })
    .click();
  await overflow("Hoje");
  await p.getByRole("button", { name: "Começar treino" }).click();
  await expect(
    p.getByRole("heading", { name: "Aquecimento", exact: true }),
  ).toBeVisible();
  await expect(p.getByLabel("Carga série 1", { exact: true })).toHaveCount(0);
  await p.getByLabel("Carga de trabalho para aquecimento").fill("60");
  await p.getByLabel("Peso real da barra em kg").fill("20");
  await p.getByRole("button", { name: "Confirmar peso da barra" }).click();
  await expect(p.getByText("Aproximação 1 de", { exact: false })).toBeVisible();
  await overflow("Aquecimento");
  await p.screenshot({ path: shots + "/aquecimento.png", fullPage: true });
  let guard = 0;
  while (
    await p.getByRole("heading", { name: "Aquecimento", exact: true }).count()
  ) {
    if (guard++ > 6) throw Error("loop aquecimento");
    await p.getByRole("button", { name: /Concluir aproximação/ }).click();
    await expect(
      p.getByRole("heading", { name: "Hora de descansar" }),
    ).toBeVisible();
    await expect(p.locator(".guided-set-form")).toHaveCount(0);
    await p.getByRole("button", { name: "Encerrar descanso agora" }).click();
  }
  await expect(
    p.getByRole("heading", { name: "Supino reto com barra", exact: true }),
  ).toBeVisible();
  await expect(p.getByLabel("Carga série 2", { exact: true })).toHaveCount(0);
  await overflow("Série válida");
  await p.screenshot({ path: shots + "/serie-valida.png", fullPage: true });
  const loadField = p.getByLabel("Carga série 1", { exact: true });
  await loadField.fill("60");
  await loadField.press("Enter");
  await expect(
    p.getByLabel("Repetições série 1", { exact: true }),
  ).toBeFocused();
  await loadField.focus();
  expect(
    await loadField.evaluate((e) => [e.selectionStart, e.selectionEnd]),
  ).toEqual([0, 2]);
  await p.getByLabel("Repetições série 1", { exact: true }).fill("8");
  await p
    .getByRole("button", { name: "Salvar série 1 e descansar", exact: true })
    .click();
  await expect(p.getByRole("timer")).toBeVisible();
  await expect(p.locator(".guided-set-form")).toHaveCount(0);
  await overflow("Descanso");
  await p.reload();
  await p.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await expect(p.getByRole("timer")).toBeVisible();
  await p.screenshot({ path: shots + "/descanso.png", fullPage: true });
  await p.getByRole("button", { name: "Testar alarme" }).click();
  const deadline = await p.evaluate(() =>
    Number(
      localStorage.getItem(
        Object.keys(localStorage).find((k) => k.startsWith("rest-")),
      ),
    ),
  );
  await p.clock.install();
  await p.clock.fastForward(Math.max(0, deadline - Date.now()) + 1500);
  await expect(
    p.getByRole("heading", { name: "Descanso concluído" }),
  ).toBeVisible();
  await p.getByRole("button", { name: "Próxima série", exact: true }).click();
  await expect(p.getByLabel("Carga série 2", { exact: true })).toHaveValue(
    "60",
  );
  await p.getByLabel("Repetições série 2", { exact: true }).fill("8");
  await p.getByRole("button", { name: "Salvar série 2 e descansar" }).click();
  await p.getByRole("button", { name: "Encerrar descanso agora" }).click();
  await p.getByLabel("Repetições série 3", { exact: true }).fill("7");
  await p.getByRole("button", { name: "Salvar série 3 e descansar" }).click();
  await p.getByRole("button", { name: "Encerrar descanso agora" }).click();
  await expect(
    p.getByRole("heading", { name: "Aquecimento", exact: true }),
  ).toBeVisible();
  await expect(
    p.getByText("Remada sentada com apoio no peito", { exact: true }),
  ).toBeVisible();
  await p.getByRole("button", { name: "Ver exercícios do treino" }).click();
  await p.locator(".guided-exercise-list > button").first().click();
  await expect(
    p.getByRole("heading", { name: "Séries concluídas" }),
  ).toBeVisible();
  await expect(p.locator(".guided-set-form")).toHaveCount(0);
  await p.getByRole("button", { name: "Ver séries deste exercício" }).click();
  await p.getByRole("button", { name: "Retirar série 2", exact: true }).click();
  await p.getByRole("button", { name: "Confirmar retirada da série" }).click();
  await expect(
    p.getByRole("button", { name: "Editar série 2", exact: true }),
  ).toHaveCount(0);
  await p.getByRole("button", { name: "Desfazer série" }).click();
  await expect(
    p.getByRole("button", { name: "Editar série 2", exact: true }),
  ).toBeVisible();
  await overflow("Registros");
  await p.getByRole("button", { name: "Ver exercícios do treino" }).click();
  await p.getByRole("button", { name: "Revisar e finalizar" }).click();
  await overflow("Resumo");
  await p
    .getByRole("button", { name: "Finalizar treino", exact: true })
    .click();
  await expect(
    p.getByRole("heading", { name: "Treino concluído" }),
  ).toBeVisible();
  await p
    .getByRole("button", { name: "Voltar para hoje", exact: true })
    .last()
    .click();
  for (const [route, label] of [
    ["agenda", "Agenda"],
    ["evolucao", "Evolução"],
    ["meu-treino", "Editor"],
    ["ajustes", "Ajustes"],
  ]) {
    await p.evaluate((r) => (location.hash = "#/" + r), route);
    await expect(p.locator("main h1").first()).toBeVisible();
    await overflow(label);
  }
  await p.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await p.screenshot({ path: shots + "/escuro.png", fullPage: true });
  expect(errors).toEqual([]);
  console.log(
    "PASS etapas separadas, aproximações, timer zero, RIR opcional, última carga, conclusão, retirada/desfazer, e ausência de overflow 320–1280px.",
  );
} finally {
  await b.close();
}
