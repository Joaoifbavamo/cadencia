import { waitForDemoReady } from "./helpers/demo-navigation.mjs";
import { chromium, webkit, expect } from "@playwright/test";
const engine = process.env.BROWSER_ENGINE === "webkit" ? webkit : chromium;
const browser = await engine.launch({
  headless: true,
  ...(engine === chromium
    ? {
        executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
      }
    : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  let dialogs = 0;
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => {
    dialogs++;
    d.accept();
  });
  const base = process.env.REVIEW_BASE_URL || "http://localhost:5188";
  await page.goto(base);
  await page.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await waitForDemoReady(page);
  await page.evaluate(async () => {
    const { LocalStore } = await import("/src/storage.ts");
    const { todayKey } = await import("/src/domain.ts");
    const store = await new LocalStore("demo").open();
    const plan = store.docs.find((d) => d.kind === "plan");
    const day = new Date(todayKey() + "T12:00:00Z").getUTCDay();
    await store.putMany([
      {
        ...plan,
        payload: {
          ...plan.payload,
          workouts: plan.payload.workouts.map((w) => ({
            ...w,
            day: (day + 1) % 7,
          })),
          recovery: [
            {
              day,
              name: "Cardio e abdômen",
              notes: "Orientações de cardio e abdômen. ".repeat(20),
            },
          ],
        },
      },
    ]);
    store.close();
  });
  await expect(page.locator(".recovery-day-notes")).toBeVisible();
  expect(
    await page
      .getByRole("button", { name: "Registrar abdômen", exact: true })
      .evaluate((e) => e.getBoundingClientRect().bottom <= innerHeight),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Registrar abdômen", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Tempo e detalhes das séries são opcionais",
  );
  await page.locator("dialog form").evaluate((form) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(page.locator(".today-activities > div")).toHaveCount(1);
  await expect(page.locator(".today-activities")).toContainText("sem duração");
  await page.reload();
  await page.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await expect(page.locator(".today-activities > div")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Editar atividade Abdômen", exact: true })
    .click();
  await page.locator(".abdominal-details summary").click();
  await page
    .getByRole("button", { name: "Crunch na polia", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar atividade", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Revise a série 1");
  await page
    .getByLabel("Repetições abdominal série 1", { exact: true })
    .fill("12");
  await page
    .getByLabel("Carga abdominal série 1 opcional", { exact: true })
    .fill("15");
  await page
    .getByRole("button", { name: "Abdominal reverso", exact: true })
    .click();
  await page
    .getByLabel("Repetições abdominal série 2", { exact: true })
    .fill("15");
  await page
    .getByRole("button", { name: "Salvar atividade", exact: true })
    .click();
  await expect(page.locator(".today-activities > div")).toHaveCount(1);
  await expect(page.locator(".today-activities")).toContainText(
    "2 séries · 27 reps",
  );
  await page
    .getByRole("button", { name: "Editar atividade Abdômen", exact: true })
    .click();
  const beforeClose = dialogs;
  await page.getByRole("tab", { name: "Outra", exact: true }).click();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  expect(dialogs).toBe(beforeClose + 1);
  await page
    .getByRole("button", { name: "Registrar cardio", exact: true })
    .click();
  await page.getByRole("button", { name: "Bicicleta", exact: true }).click();
  await page.getByRole("button", { name: "20 min", exact: true }).click();
  await page.getByRole("tab", { name: "Abdômen", exact: true }).click();
  await page.getByRole("tab", { name: "Cardio", exact: true }).click();
  await expect(
    page.getByLabel("Duração em minutos", { exact: true }),
  ).toHaveValue("20");
  await page
    .getByRole("button", { name: "Salvar atividade", exact: true })
    .click();
  await expect(page.locator(".today-activities > div")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Editar atividade Bicicleta", exact: true })
    .click();
  await page.getByRole("button", { name: "25 min", exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar atividade", exact: true })
    .click();
  await expect(page.locator(".today-activities > div")).toHaveCount(2);
  await expect(page.locator(".today-activities")).toContainText("25 min");
  await page
    .getByRole("button", { name: "Editar atividade Bicicleta", exact: true })
    .click();
  await page.getByRole("button", { name: "30 min", exact: true }).click();
  await page.evaluate(async () => {
    const { LocalStore } = await import("/src/storage.ts");
    const store = await new LocalStore("demo").open();
    const current = store.docs.find(
      (d) => d.kind === "activity" && d.payload.name === "Bicicleta",
    );
    await store.putMany([
      {
        ...current,
        payload: {
          ...current.payload,
          minutes: 35,
          notes: "Alterado em outra aba",
        },
      },
    ]);
    store.close();
  });
  await page.waitForTimeout(120);
  await page
    .getByRole("button", { name: "Salvar atividade", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("mudou em outro lugar");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.locator(".today-activities")).toContainText("35 min");
  // Capture the new surfaces together, including the expanded detailed form.
  await page
    .getByRole("button", { name: "Editar atividade Abdômen", exact: true })
    .click();
  for (const width of [320, 390, 676, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    expect(
      await page
        .locator("dialog")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    await page.screenshot({
      path: `test-results/guided/quick-abs-${theme}.png`,
      fullPage: true,
    });
    const violations = await page.evaluate(async () =>
      (
        await axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
          },
        })
      ).violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    );
    expect(violations).toEqual([]);
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  expect(
    await page
      .locator("dialog")
      .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
  ).toBe(true);
  await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .locator(".bottom-nav")
    .getByRole("button", { name: "Agenda", exact: true })
    .click();
  await expect(page.locator(".agenda-activity")).toHaveCount(2);
  await page.getByLabel("Ir para uma data", { exact: true }).fill("2026-12-03");
  await page
    .getByRole("button", { name: "Registrar abdômen", exact: true })
    .click();
  await expect(
    page.getByLabel("Data do registro", { exact: true }),
  ).toHaveValue("2026-12-03");
  await page
    .getByRole("button", { name: "Salvar atividade", exact: true })
    .click();
  await expect(page.locator(".agenda-activity")).toHaveCount(1);
  expect(errors).toEqual([]);
  console.log(
    "PASS cardio rápido, abdômen sem minutos, detalhes opcionais, edição sem duplicação, reload, datas e responsividade.",
  );
} finally {
  await browser.close();
}
