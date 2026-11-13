import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
const base = process.env.REVIEW_BASE_URL || "http://127.0.0.1:4173";
await page.goto(base);
await page.waitForLoadState("networkidle");
await page.evaluate(() => navigator.serviceWorker.ready);
await page.getByRole("button", { name: "Conhecer a demonstração" }).click();
await page
  .getByRole("button", { name: "Instalar", exact: true })
  .or(page.getByRole("tab", { name: "Instalar", exact: true }))
  .last()
  .click();
await page.getByRole("heading", { name: "Instalar no iPhone" }).waitFor();
const href = await page
  .getByRole("link", { name: "Baixar perfil de configuração" })
  .getAttribute("href");
const profile = await page.request.get(new URL(href, base + "/").href);
if (
  !profile.ok() ||
  !(await profile.text()).includes("com.apple.webClip.managed")
)
  throw Error("Profile missing");
await page
  .getByRole("button", { name: "Hoje", exact: true })
  .or(page.getByRole("tab", { name: "Hoje", exact: true }))
  .last()
  .click();
await page.getByRole("button", { name: "Escolher um treino" }).click();
await page.getByRole("button", { name: /Superior · exemplo/ }).click();
await page.getByRole("button", { name: "Começar treino" }).click();
await page
  .getByRole("button", { name: "Pular aquecimento", exact: true })
  .click();
await page.getByLabel("Carga série 1", { exact: true }).fill("30");
await page.getByLabel("Repetições série 1", { exact: true }).fill("8");
await page
  .getByRole("button", { name: "Salvar série 1 e descansar", exact: true })
  .click();
await page.getByRole("timer").waitFor();
await page.clock.install();
await page.clock.fastForward(121000);
await page
  .getByRole("status")
  .filter({ hasText: "Descanso concluído." })
  .waitFor();
const cdp = await context.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
await context.setOffline(true);
await page.reload();
await page.getByRole("button", { name: "Conhecer a demonstração" }).waitFor();
await page.getByRole("button", { name: "Conhecer a demonstração" }).click();
await page.getByRole("heading", { name: "Descanso concluído", exact: true }).waitFor();
console.log(
  JSON.stringify({
    passed:
      "perfil disponível; cronômetro conclui; primeira reabertura offline com cache HTTP desativado; rascunho preservado",
    errors,
  }),
);
if (errors.length) throw Error("Browser errors");
await browser.close();
