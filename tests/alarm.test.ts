import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { armAlarm, cancelAlarm, unlockAlarm } from "../src/alarm.ts";

test("alarm delivers once, catches up from background, respects sound changes and cancellation", async () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: 10000 });
  const values = new Map<string, string>();
  const documentEvents = new EventTarget();
  const windowEvents = new EventTarget();
  let visibility = "visible",
    tones = 0,
    notifications = 0;
  const previous = Object.fromEntries(
    ["window", "document", "localStorage", "CustomEvent"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  let resolveResume = () => {};
  class Audio {
    static current: Audio;
    constructor() {
      Audio.current = this;
    }
    state = "running";
    currentTime = 0;
    destination = {};
    async resume() {
      await new Promise<void>((resolve) => {
        resolveResume = resolve;
      });
      this.state = "running";
    }
    createOscillator() {
      return {
        type: "",
        frequency: { value: 0 },
        connect() {},
        disconnect() {},
        start() {
          tones++;
        },
        stop() {},
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
    }
  }
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: Object.assign(windowEvents, { AudioContext: Audio }),
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: Object.assign(documentEvents, {
      get visibilityState() {
        return visibility;
      },
    }),
  });
  // Object.assign copies accessor values; define a live visibility state explicitly.
  Object.defineProperty(globalThis.document, "visibilityState", {
    get: () => visibility,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  if (typeof CustomEvent === "undefined")
    Object.defineProperty(globalThis, "CustomEvent", {
      configurable: true,
      value: class extends Event {
        detail: unknown;
        constructor(type: string, init: { detail: unknown }) {
          super(type);
          this.detail = init.detail;
        }
      },
    });
  windowEvents.addEventListener("cadencia-rest-ended", () => notifications++);
  const rest = (session: string, deadline: number) =>
    values.set("rest-" + session, String(deadline));
  try {
    await unlockAlarm();
    rest("normal", 11000);
    armAlarm("normal", 11000, true);
    mock.timers.tick(1000);
    assert.equal(tones, 3);
    assert.equal(notifications, 1);
    armAlarm("normal", 11000, true);
    documentEvents.dispatchEvent(new Event("visibilitychange"));
    assert.equal(tones, 3);
    assert.equal(notifications, 1);
    visibility = "hidden";
    rest("background", 12000);
    armAlarm("background", 12000, true);
    mock.timers.tick(1000);
    assert.equal(notifications, 1);
    visibility = "visible";
    documentEvents.dispatchEvent(new Event("visibilitychange"));
    assert.equal(tones, 6);
    assert.equal(notifications, 2);
    rest("muted", 13000);
    armAlarm("muted", 13000, true);
    armAlarm("muted", 13000, false);
    mock.timers.tick(1000);
    assert.equal(tones, 6);
    assert.equal(notifications, 3);
    rest("cancelled", 14000);
    armAlarm("cancelled", 14000, true);
    cancelAlarm("cancelled");
    mock.timers.tick(1000);
    assert.equal(notifications, 3);
    rest("restored", 13500);
    armAlarm("restored", 13500, true);
    assert.equal(notifications, 4);
    assert.equal(tones, 9);
    Audio.current.state = "suspended";
    rest("resumed", 15000);
    armAlarm("resumed", 15000, true);
    mock.timers.tick(1000);
    assert.equal(tones, 9);
    assert.equal(notifications, 5);
    resolveResume();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(tones, 12);
    Audio.current.state = "suspended";
    rest("resume-muted", 16000);
    armAlarm("resume-muted", 16000, true);
    mock.timers.tick(1000);
    armAlarm("resume-muted", 16000, false);
    resolveResume();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(tones, 12);
    assert.equal(notifications, 6);
    rest("stale", 1);
    mock.timers.tick(300001);
    armAlarm("stale", 1, true);
    assert.equal(notifications, 6);
  } finally {
    for (const key of [
      "normal",
      "background",
      "muted",
      "cancelled",
      "restored",
      "stale",
      "resumed",
      "resume-muted",
    ])
      cancelAlarm(key);
    mock.timers.reset();
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
