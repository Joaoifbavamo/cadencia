import { spawn } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const webkit = process.argv.includes("--webkit"),
  production = process.argv.includes("--production"),
  motion = process.argv.includes("--motion");
const port = production ? 4173 : 5177;
const base = process.env.REVIEW_BASE_URL || `http://127.0.0.1:${port}`;
let server;
for (const p of [
  "test-results/guided",
  "test-results/frontend-audit",
  ".impeccable/review",
])
  fs.mkdirSync(p, { recursive: true });
async function reachable() {
  try {
    const r = await fetch(base, { signal: AbortSignal.timeout(1500) });
    return r.ok && (await r.text()).includes("Cadência");
  } catch {
    return false;
  }
}
const suites = webkit
  ? ["progress-navigation.browser.mjs", "frontend-integral.browser.mjs"]
  : production
    ? ["pwa.mjs"]
    : motion
      ? ["glisse-motion.browser.mjs"]
      : [
          "guided-workout.browser.mjs",
          "workout-review.browser.mjs",
          "mobile-clean.mjs",
          "archive-flow.mjs",
          "editor-routes.browser.mjs",
          "editor-discard-motion.browser.mjs",
          "settings-cas.browser.mjs",
          "cleanup-recovery.browser.mjs",
          "history-pages.browser.mjs",
          "change-workout.mjs",
          "glass-motivation.mjs",
          "progress-navigation.browser.mjs",
          "frontend-integral.browser.mjs",
        ];
try {
  if (!(await reachable())) {
    server = spawn(
      process.execPath,
      [
        "node_modules/vite/bin/vite.js",
        ...(production ? ["preview"] : []),
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
      ],
      { stdio: "ignore", windowsHide: true },
    );
    let ready = false;
    for (let i = 0; i < 50; i++) {
      if (await reachable()) {
        ready = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!ready)
      throw Error("O servidor de teste não iniciou. Confira a porta " + port);
  }
  for (const suite of suites) {
    console.log("\nVerificando " + suite);
    const code = await new Promise((resolve, reject) => {
      const c = spawn(process.execPath, ["tests/" + suite], {
        stdio: "inherit",
        windowsHide: true,
        env: {
          ...process.env,
          REVIEW_BASE_URL: base,
          REVIEW_BROWSER_PATH:
            process.env.REVIEW_BROWSER_PATH ||
            (process.platform === "win32"
              ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
              : ""),
          BROWSER_ENGINE: webkit ? "webkit" : "chromium",
          AUDIT_PASS: webkit ? "webkit-final" : "final",
        },
      });
      c.on("error", reject);
      c.on("exit", resolve);
    });
    if (code !== 0) throw Error(suite + " falhou (código " + code + ")");
  }
  console.log("\nPASS " + suites.length + " suítes de interface.");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  server?.kill();
}
