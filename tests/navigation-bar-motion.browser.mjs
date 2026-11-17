import { chromium, expect } from "@playwright/test";
import { seedFrontendDemo } from "./helpers/frontend-fixture.mjs";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await page.goto(process.env.REVIEW_BASE_URL || "http://localhost:5188");
  await page.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await seedFrontendDemo(page, 500);
  await expect(
    page.getByRole("heading", { name: "Treino de hoje" }),
  ).toBeVisible();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  for (const name of ["Evolução", "Meu treino", "Agenda", "Hoje"]) {
    const result = await page.locator(".bottom-nav").evaluate((nav, name) => {
      const indicator = nav.querySelector(".nav-indicator");
      const before = getComputedStyle(indicator).transform;
      [...nav.querySelectorAll("button")]
        .find((b) => b.textContent === name)
        .click();
      return new Promise((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            resolve({
              before,
              animations: indicator.getAnimations().length,
              duration: getComputedStyle(indicator).transitionDuration,
              backdrop: getComputedStyle(nav).backdropFilter,
            }),
          ),
        ),
      );
    }, name);
    expect(result.duration).toBe("0.26s");
    expect(result.backdrop).toBe("none");
    expect(result.animations).toBeGreaterThan(0);
    await expect(
      page.getByRole("heading", {
        name: name === "Hoje" ? "Treino de hoje" : name,
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".nav-tab[aria-current=page]")).toHaveText(name);
  }
  await expect(page.locator('[class*="lg-"]')).toHaveCount(0);
  await page.screenshot({
    path: "test-results/frontend-audit/animated-navigation.png",
    fullPage: true,
  });
  console.log(
    "PASS barra opaca, transição real por transform, seleção e páginas corretas sob CPU 4×; sem camada Glisse.",
  );
} finally {
  await browser.close();
}
