import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildHistoryIndex,
  comparisonKey,
  dailyLoads,
} from "../src/history-index.ts";
import type { Entity, Exercise } from "../src/domain.ts";
const exercise = {
  id: "e",
  name: "Remada",
  unit: "machine",
  min: 8,
  max: 12,
  machine: "A",
} as Exercise;
const doc = (
  id: string,
  kind: Entity["kind"],
  payload: unknown,
  deleted = false,
) => ({ id, kind, payload, deleted }) as Entity;
const session = (id: string, date: string, extra = {}) =>
  doc(id, "session", {
    actualDate: date,
    startedAt: date + "T10:00:00Z",
    workout: { exercises: [exercise] },
    ...extra,
  });
const set = (id: string, sessionId: string, index = 0, extra = {}) =>
  doc(id, "set", {
    sessionId,
    exerciseId: "e",
    index,
    machine: "A",
    load: 20,
    reps: 10,
    rir: 2,
    ...extra,
  });
test("history joins by session and exercise, excluding deleted, archived and orphan records", () => {
  const index = buildHistoryIndex([
    session("old", "2026-11-10"),
    session("new", "2026-11-12"),
    session("gone", "2026-11-13", { archivedAt: "2026-11-13T12:00:00Z" }),
    { ...session("deleted", "2026-11-14"), deleted: true },
    set("a", "old"),
    set("b", "new", 1),
    set("c", "new", 0),
    set("d", "gone"),
    set("e", "deleted"),
    set("f", "unknown"),
    { ...set("g", "new"), deleted: true },
  ]);
  const history = index.byComparison.get(comparisonKey(exercise, "A"))!;
  assert.deepEqual(
    history.map((x) => x.sessionId),
    ["new", "old"],
  );
  assert.deepEqual(
    history[0].sets.map((x) => x.index),
    [0, 1],
  );
  assert.equal(index.rows.length, 3);
  assert.equal(index.setsBySession.get("new")?.length, 2);
});
test("machine and range changes form distinct comparable histories; same-day sessions stay distinct", () => {
  const index = buildHistoryIndex([
    session("a", "2026-11-12"),
    session("b", "2026-11-12", { startedAt: "2026-11-12T12:00:00Z" }),
    set("x", "a"),
    set("y", "b", 0, { machine: "B", reps: 8, load: 25 }),
  ]);
  assert.equal(index.byComparison.size, 2);
  assert.notEqual(
    comparisonKey(exercise, "A"),
    comparisonKey({ ...exercise, min: 9 }, "A"),
  );
  assert.equal(dailyLoads(index.rows)[0].load, 25);
});
test("daily chart takes the actual maximum in date order", () => {
  assert.deepEqual(
    dailyLoads([
      { date: "2026-11-12", load: 10 },
      { date: "2026-11-10", load: 12 },
      { date: "2026-11-12", load: 15 },
    ]),
    [
      { date: "2026-11-10", load: 12 },
      { date: "2026-11-12", load: 15 },
    ],
  );
});
test("same-day comparable sessions sort by start time without merging their series", () => {
  const index = buildHistoryIndex([
    session("early", "2026-11-12"),
    session("late", "2026-11-12", { startedAt: "2026-11-12T12:00:00Z" }),
    set("first", "early"),
    set("second", "late", 0, { reps: 8 }),
  ]);
  const comparison = index.byComparison.get(comparisonKey(exercise, "A"))!;
  assert.deepEqual(
    comparison.map((group) => group.sessionId),
    ["late", "early"],
  );
  assert.deepEqual(
    comparison.map((group) => group.sets[0].reps),
    [8, 10],
  );
  assert.equal(
    index.byComparison.get(comparisonKey(exercise, "Other machine")),
    undefined,
  );
});
