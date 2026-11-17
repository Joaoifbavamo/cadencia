import test from "node:test";
import assert from "node:assert/strict";
import { afterNavigationSettles } from "../src/navigation-motion.ts";
test("navigation settles before commit; cancellation cannot mount an obsolete page", () => {
  let handler: (event: any) => void = () => {},
    commits = 0;
  const main = { inert: false, setAttribute() {}, removeAttribute() {} };
  const nav = {
    addEventListener(_name: string, fn: any) {
      handler = fn;
    },
    removeEventListener() {},
  };
  Object.assign(globalThis, {
    document: {
      querySelector: (s: string) => (s === "main" ? main : nav),
      hidden: false,
      addEventListener() {},
      removeEventListener() {},
    },
    matchMedia: () => ({ matches: false }),
  });
  const event = {
    propertyName: "transform",
    target: { classList: { contains: (s: string) => s === "nav-indicator" } },
  };
  const cancel = afterNavigationSettles(() => commits++);
  assert.equal(main.inert, true);
  cancel();
  handler(event);
  assert.equal(commits, 0);
  assert.equal(main.inert, false);
  afterNavigationSettles(() => commits++);
  handler(event);
  handler(event);
  assert.equal(commits, 1);
  assert.equal(main.inert, false);
});
test("reduced motion commits immediately", () => {
  Object.assign(globalThis, { matchMedia: () => ({ matches: true }) });
  let called = false;
  afterNavigationSettles(() => {
    called = true;
  });
  assert.equal(called, true);
});
