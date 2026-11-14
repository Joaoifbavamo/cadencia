import test from "node:test";
import assert from "node:assert/strict";
import { afterGlassSettles } from "../src/navigation-motion.ts";
test("page waits for actual glass settlement; canceled transitions never mount obsolete pages", () => {
  const callbacks = new Map<number, FrameRequestCallback>();
  let next = 0,
    moving = true,
    commits = 0;
  Object.assign(globalThis, {
    document: {
      querySelector: (selector: string) =>
        selector === "main"
          ? null
          : {
              isConnected: true,
              hasAttribute: (name: string) => moving && name === "data-away",
            },
      hidden: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (fn: FrameRequestCallback) => {
      callbacks.set(++next, fn);
      return next;
    },
    cancelAnimationFrame: (id: number) => callbacks.delete(id),
  });
  const tick = () => {
    const queue = [...callbacks.values()];
    callbacks.clear();
    queue.forEach((fn) => fn(0));
  };
  const cancel = afterGlassSettles(() => commits++);
  tick();
  tick();
  assert.equal(commits, 0);
  cancel();
  moving = false;
  tick();
  assert.equal(commits, 0);
  afterGlassSettles(() => commits++);
  tick();
  assert.equal(commits, 0);
  tick();
  assert.equal(commits, 1);
});
