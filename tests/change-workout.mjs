import { chromium, expect } from "@playwright/test";
const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("dialog", (d) => d.accept());
  const nav = async (name) =>
    p
      .locator(".bottom-nav")
      .getByRole("button", { name, exact: true })
      .or(p.locator(".bottom-nav").getByRole("tab", { name, exact: true }))
      .click();
  await p.goto(process.env.REVIEW_BASE_URL || "http://127.0.0.1:5177");
  await p.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await p.evaluate(async () => {
    const { LocalStore } = await import("/src/storage.ts");
    const s = await new LocalStore("demo").open();
    const d = s.docs.find((d) => d.kind === "plan"),
      w = structuredClone(d.payload.workouts[0]);
    w.id = "demo-lower";
    w.name = "Inferior · exemplo";
    w.exercises = [
      { ...w.exercises[0], id: "demo-squat", name: "Agachamento livre" },
    ];
    await s.mutate(d.id, "plan", {
      ...d.payload,
      workouts: [...d.payload.workouts, w],
    });
    s.close();
  });
  const choose = async (name) => {
    const change = p.getByRole("button", {
      name: "Trocar treino",
      exact: true,
    });
    if (await change.isVisible()) await change.click();
    else
      await p
        .getByRole("button", { name: "Escolher um treino", exact: true })
        .click();
    await p
      .getByRole("dialog")
      .getByRole("button", { name: new RegExp(name) })
      .click();
  };
  await choose("Superior");
  await p.getByRole("button", { name: "Começar treino" }).click();
  await p
    .getByRole("button", { name: "Pular aquecimento", exact: true })
    .click();
  await p.getByLabel("Carga série 1", { exact: true }).fill("30");
  await p.getByLabel("Repetições série 1", { exact: true }).fill("8");
  await p.getByRole("button", { name: "Salvar série 1 e descansar" }).click();
  await p.getByRole("timer").waitFor();
  await p.getByRole("button", { name: "Voltar para hoje" }).click();
  await choose("Inferior");
  await expect(
    p.getByRole("heading", { name: "Inferior · exemplo", exact: true }),
  ).toBeVisible();
  await p.getByRole("button", { name: "Começar treino" }).click();
  await p.getByRole("heading", { name: "Aquecimento", exact: true }).waitFor();
  await p.getByRole("button", { name: "Voltar para hoje" }).click();
  await p.locator(".paused-workouts summary").click();
  await p
    .locator(".paused-workouts .workout-choice")
    .filter({ hasText: "Superior" })
    .click();
  await p.getByRole("button", { name: "Ver exercícios do treino" }).click();
  await p.locator(".guided-exercise-list > button").first().click();
  await p.getByRole("button", { name: "Ver séries deste exercício" }).click();
  await p.getByRole("button", { name: "Editar série 1", exact: true }).click();
  await expect(p.getByLabel("Carga série 1", { exact: true })).toHaveValue(
    "30",
  );
  await p.getByRole("button", { name: "Voltar para hoje" }).click();
  await nav("Agenda");
  const add = p.getByRole("button", { name: "Adicionar cardio ou atividade" });
  await add.click();
  await p.getByLabel("Atividade", { exact: true }).fill("Caminhada teste");
  await p.getByLabel("Duração em minutos").fill("20");
  await p
    .getByRole("button", { name: "Salvar atividade", exact: true })
    .click();
  await p
    .getByRole("button", { name: "Editar atividade", exact: true })
    .click();
  await p.getByLabel("Duração em minutos").fill("25");
  await p
    .getByRole("button", { name: "Salvar atividade", exact: true })
    .click();
  await expect(
    p.locator(".agenda-row").filter({ hasText: "Caminhada teste" }),
  ).toHaveCount(1);
  await expect(
    p.locator(".agenda-row").filter({ hasText: "Caminhada teste" }),
  ).toContainText("25 min");
  await p.locator(".agenda-dates summary").first().click();
  await expect(
    p.getByLabel("Data realizada", { exact: true }).first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    "PASS troca de treino preserva séries e descanso; retomada; cardio editável sem duplicação; datas acessíveis.",
  );
} finally {
  await b.close();
}
