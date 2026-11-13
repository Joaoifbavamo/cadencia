import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.REVIEW_BROWSER_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
try {
  const page = await browser.newPage();
  await page.goto(
    (process.env.REVIEW_BASE_URL || "http://127.0.0.1:5179") + "/#/ajustes",
  );
  await page.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await page.getByRole("heading", { name: "Ajustes", exact: true }).waitFor();
  await page
    .locator("summary")
    .filter({ hasText: "Cargas e aquecimento" })
    .click();
  await page
    .getByRole("textbox", { name: "Peso da barra em kg", exact: true })
    .fill("20");
  await page.evaluate(async () => {
    const { singletonIdentity } = await import("/src/singleton.ts");
    const id = await singletonIdentity("demo", "profile");
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("cadencia-demo", 2);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise((resolve, reject) => {
      const t = db.transaction("docs", "readwrite");
      t.objectStore("docs").put({
        id,
        kind: "profile",
        payload: {
          barWeight: 15,
          increment: 2.5,
          timezone: "America/Sao_Paulo",
        },
        deleted: false,
        dirty: false,
        version: 1,
        change_seq: 1,
        mutationId: crypto.randomUUID(),
        localSeq: 0,
      });
      t.oncomplete = resolve;
      t.onerror = () => reject(t.error);
    });
    db.close();
    const c = new BroadcastChannel("cadencia-demo");
    c.postMessage("changed");
    c.close();
  });
  // Allow the asynchronous cross-tab notification and React render to finish.
  await page.waitForTimeout(150);
  await page
    .getByRole("button", { name: "Salvar preferências", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "mudou em outro lugar" }),
  ).toBeVisible();
  const weight = await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open("cadencia-demo", 2);
      r.onsuccess = () => resolve(r.result);
    });
    const docs = await new Promise((resolve) => {
      const r = db.transaction("docs").objectStore("docs").getAll();
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return docs.find((d) => d.kind === "profile").payload.barWeight;
  });
  expect(weight).toBe(15);
  await page
    .getByRole("button", { name: "Carregar preferências atuais", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Peso da barra em kg", exact: true }),
  ).toHaveValue("15");
  await page
    .getByRole("textbox", { name: "Peso da barra em kg", exact: true })
    .fill("20");
  await page
    .getByRole("button", { name: "Salvar preferências", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Preferências salvas localmente." }),
  ).toBeVisible();
  console.log(
    "PASS profile CAS preserves remote change while local fields were being edited",
  );
} finally {
  await browser.close();
}
