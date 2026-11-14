import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch({
  executablePath:
    process.env.REVIEW_BROWSER_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.REVIEW_BASE_URL || "http://127.0.0.1:5177");
  await page.getByRole("button", { name: "Conhecer a demonstração" }).click();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const nav = (name) => page.getByRole("tab", { name, exact: true }).click();
  const settled = async () => {
    await expect(page.locator("main")).not.toHaveAttribute("aria-busy", "true");
    expect(await page.locator("main").evaluate((main) => main.inert)).toBe(
      false,
    );
  };
  await nav("Meu treino");
  await settled();
  const name = page.getByLabel("Nome da ficha");
  const original = await name.inputValue();
  await name.fill("Rascunho preservado");
  page.once("dialog", (dialog) => dialog.dismiss());
  await nav("Hoje");
  await settled();
  await expect(name).toHaveValue("Rascunho preservado");
  await expect(page.locator('.lg-tab[aria-selected="true"]')).toHaveText(
    "Meu treino",
  );

  for (const destination of ["rapid-return", "back"]) {
    await name.fill("Rascunho descartado " + destination);
    page.once("dialog", (dialog) => dialog.accept());
    await nav("Hoje");
    // Exercise cancellation while the old editor is still mounted.
    await expect(page.locator("main")).toHaveAttribute("aria-busy", "true");
    if (destination === "back") await page.goBack();
    else await nav("Meu treino");
    await settled();
    await expect(page.locator("main h1")).toHaveText("Meu treino");
    await expect(name).toHaveValue(original);
    await expect(page.locator('.lg-tab[aria-selected="true"]')).toHaveText(
      "Meu treino",
    );
    expect(
      await page.evaluate(() =>
        localStorage.getItem("cadencia-editor-draft-demo"),
      ),
    ).toBeNull();
  }
  expect(errors).toEqual([]);
  console.log(
    "PASS dirty refusal; accepted discard with rapid return and Back before settle; no stale draft or locked main.",
  );
} finally {
  await browser.close();
}
