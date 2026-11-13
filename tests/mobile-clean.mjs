import { chromium } from "@playwright/test";
const b = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  }),
  c = await b.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  }),
  p = await c.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(process.env.REVIEW_BASE_URL || "http://127.0.0.1:5177");
await p.getByRole("button", { name: "Conhecer a demonstração" }).click();
await p.getByRole("button", { name: "Escolher um treino" }).click();
await p.getByRole("button", { name: /Superior · exemplo/ }).click();
if ((await p.locator(".today-exercises details").getAttribute("open")) !== null)
  throw Error("Lista não recolhida");
await p.getByRole("button", { name: "Começar treino" }).click();
p.once("dialog", (d) => d.accept());
await p.getByRole("button", { name: "Pular aquecimento", exact: true }).click();
if (await p.getByLabel("RIR série 1 opcional").isVisible())
  throw Error("RIR deve ser opcional e recolhido");
await p.locator(".guided-rir summary").click();
await p.getByLabel("RIR série 1 opcional").fill("2");
await p.getByLabel("Carga série 1", { exact: true }).fill("30,5");
await p.getByLabel("Repetições série 1", { exact: true }).fill("8");
await p
  .getByRole("button", { name: "Salvar série 1 e descansar", exact: true })
  .click();
await p
  .getByRole("heading", { name: "Hora de descansar", exact: true })
  .waitFor();
if (await p.getByLabel("Carga série 1", { exact: true }).count())
  throw Error("Descanso mistura formulário de série");
await p
  .getByRole("button", { name: "Encerrar descanso agora", exact: true })
  .click();
await p.getByRole("heading", { name: "Série 2 de 3" }).waitFor();
await p
  .getByRole("button", { name: "Ver séries deste exercício", exact: true })
  .click();
await p.getByRole("button", { name: "Editar série 1", exact: true }).click();
if ((await p.getByLabel("RIR série 1 opcional").inputValue()) !== "2")
  throw Error("RIR perdido");
if (
  (await p.getByLabel("Carga série 1", { exact: true }).inputValue()) !== "30.5"
)
  throw Error("Carga perdida");
for (const width of [320, 375, 390, 430, 676, 1440]) {
  await p.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    throw Error("Overflow " + width);
  const box = await p
    .getByRole("button", { name: "Salvar alteração da série 1" })
    .boundingBox();
  if (width < 700 && box.y + box.height > 844)
    throw Error("Salvar fora do viewport " + width);
}
console.log(
  JSON.stringify({
    passed:
      "RIR recolhido, gravação com vírgula e RIR, histórico editável sem perda, 320/375/390/430/676/1440 sem overflow",
    errors,
  }),
);
if (errors.length) throw Error("Console errors");
await b.close();
