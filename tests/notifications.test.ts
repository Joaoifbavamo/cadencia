import { test } from "node:test";
import assert from "node:assert/strict";
import {
  timerRemaining,
  restTag,
  nextDailyReminder,
} from "../src/notification-domain.ts";
test("cronômetro usa prazo absoluto e não ticks acumulados", () => {
  assert.equal(timerRemaining(10000, 7001), 3);
  assert.equal(timerRemaining(10000, 11000), 0);
});
test("tag identifica prazo e sessão para deduplicar alertas", () => {
  assert.equal(restTag("s", 123), "rest-s-123");
  assert.notEqual(restTag("s", 123), restTag("s", 124));
});
test("próximo lembrete diário respeita hora e São Paulo", () => {
  assert.equal(
    nextDailyReminder("20:00", new Date("2026-11-11T22:00:00Z")).toISOString(),
    "2026-11-11T23:00:00.000Z",
  );
  assert.equal(
    nextDailyReminder("20:00", new Date("2026-11-11T23:01:00Z")).toISOString(),
    "2026-11-12T23:00:00.000Z",
  );
});
