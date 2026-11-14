import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import { seedFrontendDemo } from "./helpers/frontend-fixture.mjs";
const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const p = await b.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await p.goto(process.env.REVIEW_BASE_URL || "http://127.0.0.1:5177");
  await p.getByRole("button", { name: "Conhecer a demonstração" }).click();
  await seedFrontendDemo(p, 500);
  await p.evaluate(() => (location.hash = "#/hoje"));
  await p.waitForTimeout(300);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.evaluate(() => {
    window.probe = {
      rects: 0,
      frames: [],
      movingFrames: [],
      commits: [],
      tasks: [],
    };
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      window.probe.rects++;
      return original.call(this);
    };
    new PerformanceObserver((list) => {
      window.probe.tasks.push(...list.getEntries().map((e) => e.duration));
    }).observe({ type: "longtask" });
    let last = performance.now(),
      moving = false;
    const tick = (now) => {
      const gap = now - last;
      window.probe.frames.push(gap);
      if (moving) window.probe.movingFrames.push(gap);
      const bar = document.querySelector(".lg-tab-bar");
      moving =
        !!bar &&
        (bar.hasAttribute("data-away") || bar.hasAttribute("data-lensing"));
      last = now;
      requestAnimationFrame(tick);
    };
    let title = document.querySelector("main h1")?.textContent;
    new MutationObserver(() => {
      const next = document.querySelector("main h1")?.textContent;
      if (next !== title) {
        title = next;
        const bar = document.querySelector(".lg-tab-bar");
        probe.commits.push({
          title,
          moving:
            !!bar &&
            (bar.hasAttribute("data-away") || bar.hasAttribute("data-lensing")),
        });
      }
    }).observe(document.querySelector("main"), {
      childList: true,
      subtree: true,
    });
    requestAnimationFrame(tick);
    window.originalBar = document.querySelector(".lg-tab-bar");
  });
  const results = [];
  for (const name of ["Evolução", "Meu treino", "Agenda", "Hoje"]) {
    await p.evaluate(() => {
      probe.rects = 0;
      probe.frames = [];
      probe.movingFrames = [];
      probe.commits = [];
      probe.tasks = [];
    });
    await p
      .locator(".bottom-nav")
      .getByRole("tab", { name, exact: true })
      .tap();
    await p
      .getByRole("heading", {
        name: name === "Hoje" ? "Treino de hoje" : name,
        exact: true,
      })
      .waitFor();
    await p.waitForTimeout(180);
    results.push(
      await p.evaluate((name) => {
        const frames = probe.frames.slice().sort((a, b) => a - b);
        return {
          tab: name,
          rectReads: probe.rects,
          longTasks: probe.tasks,
          maxMovingFrameMs: Math.max(0, ...probe.movingFrames),
          commits: probe.commits,
          p95FrameMs: frames[Math.floor(frames.length * 0.95)],
          maxFrameMs: Math.max(...frames),
          sameGlass: originalBar === document.querySelector(".lg-tab-bar"),
          rows: document.querySelectorAll("tbody tr").length,
        };
      }, name),
    );
  }
  const output =
    "test-results/frontend-audit/motion-" +
    (process.env.AUDIT_PASS || "before") +
    ".json";
  fs.writeFileSync(output, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
  expect(results.every((r) => r.sameGlass)).toBe(true);
  expect(results.every((r) => r.commits.every((c) => !c.moving))).toBe(true);
} finally {
  await b.close();
}
