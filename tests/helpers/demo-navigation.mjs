import { expect } from "@playwright/test";

// The demo plan is seeded asynchronously after entering. Navigation is rendered
// only once that store is ready, so fixtures can safely read it after this gate.
export async function waitForDemoReady(page) {
  await expect(page.locator(".bottom-nav")).toBeVisible();
}

export async function chooseDemoWorkout(page, name = /Superior · exemplo/) {
  await waitForDemoReady(page);
  await page
    .getByRole("button", { name: /^(Escolher um treino|Trocar treino)$/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Começar treino", exact: true }),
  ).toBeVisible();
}
