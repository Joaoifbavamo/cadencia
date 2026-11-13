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
  await page.evaluate(async () => {
    const { LocalStore } = await import("/src/storage.ts");
    const store = await new LocalStore("demo").open();
    const dirty = store.docs.filter((d) => d.dirty);
    await store.ackMany(
      dirty,
      dirty.map((d) => ({ ...d, version: d.version + 1 })),
    );
    const docs = [0, 1].map((i) => ({
      id: crypto.randomUUID(),
      kind: "session",
      payload: {
        id: crypto.randomUUID(),
        actualDate: "2020-01-01",
        finishedAt: "2020-01-01T12:00:00Z",
        workout: { exercises: [] },
      },
      version: 1,
      change_seq: 1,
      mutationId: crypto.randomUUID(),
      deleted: false,
      dirty: false,
      localSeq: 0,
    }));
    await store.putMany(docs);
    await store.createCleanup("2021-01-01", true);
    await store.advanceCleanup(true);
    store.close();
  });
  await page
    .locator("summary")
    .filter({ hasText: "Gerenciar histórico" })
    .click();
  await expect(
    page.getByRole("button", { name: "Restaurar último lote", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await page
    .locator("summary")
    .filter({ hasText: "Gerenciar histórico" })
    .click();
  await expect(
    page.getByRole("button", { name: "Restaurar último lote", exact: true }),
  ).toBeDisabled();
  await page.evaluate(async () => {
    const { LocalStore } = await import("/src/storage.ts");
    const store = await new LocalStore("demo").open();
    const dirty = store.docs.filter((d) => d.dirty);
    await store.ackMany(
      dirty,
      dirty.map((d) => ({ ...d, version: d.version + 1 })),
    );
    store.close();
  });
  await expect(
    page.getByRole("button", { name: "Restaurar último lote", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Restaurar último lote", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Restaurar último lote", exact: true }),
  ).toHaveCount(0);
  const restored = await page.evaluate(async () => {
    const { LocalStore } = await import("/src/storage.ts");
    const s = await new LocalStore("demo").open();
    const result = {
      sessions: s.docs.filter((d) => d.kind === "session" && !d.deleted).length,
      summaries: s.docs.filter((d) => d.kind === "summary" && !d.deleted)
        .length,
      status: s.cleanupJob.status,
    };
    s.close();
    return result;
  });
  expect(restored).toEqual({ sessions: 2, summaries: 0, status: "cancelled" });
  console.log(
    "PASS last cleanup chunk persists across reload, waits for ACK, restores sessions and reverses summary",
  );
} finally {
  await browser.close();
}
