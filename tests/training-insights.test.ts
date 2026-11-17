import { test } from "node:test";
import assert from "node:assert/strict";
import {
  previousPerformance,
  weekStart,
  shiftDate,
  trainingSummary,
  exercisePoints,
  seriesCsv,
} from "../src/training-insights.ts";
import { buildHistoryIndex } from "../src/history-index.ts";
import type { Entity, Exercise, Session } from "../src/domain.ts";
import { cleanupCandidates, warmup, validPayload } from "../src/domain.ts";
const e = {
  id: "e",
  name: "Supino",
  unit: "bar",
  min: 4,
  max: 6,
  machine: "",
} as Exercise;
const current = {
  id: "now",
  actualDate: "2026-01-05",
  startedAt: "2026-01-05T12:00:00Z",
  workout: { id: "upper", exercises: [e] },
} as Session;
function fixture(id: string, date: string, extra = {}, exercise = e): Entity[] {
  return [
    {
      id,
      kind: "session",
      payload: {
        ...current,
        id,
        actualDate: date,
        finishedAt: date + "T11:00:00Z",
        ...extra,
      },
    },
    {
      id: id + "-set",
      kind: "set",
      payload: {
        sessionId: id,
        exerciseId: exercise.id,
        load: 0,
        reps: 6,
        rir: null,
        machine: "",
        index: 0,
      },
    },
  ].map((d) => ({ ...d, deleted: false }) as Entity);
}
test("calendar weeks cross years and Sunday correctly", () => {
  assert.equal(weekStart("2026-01-04"), "2025-12-29");
  assert.equal(shiftDate("2026-01-01", -1), "2025-12-31");
});
test("timestamps compare instants across offsets; a later completion is not prior", () => {
  const docs = fixture("later", "2026-01-05", {
    finishedAt: "2026-01-05T11:00:00-03:00",
  });
  assert.equal(previousPerformance(docs, e, current), undefined);
});
test("cleanup keeps completed comparison when a newer paused session has sets", () => {
  const docs = [
    ...fixture("done", "2025-12-20"),
    ...fixture("paused", "2025-12-21", { finishedAt: undefined }),
  ];
  const removed = new Set(
    cleanupCandidates(docs, "2026-01-01").map((d) => d.id),
  );
  const remaining = docs.filter((d) => !removed.has(d.id));
  assert.equal(previousPerformance(remaining, e, current)?.sessionId, "done");
});
test("two warmup stages round without duplicates; malformed recovery is rejected", () => {
  assert.deepEqual(
    warmup(100, 20, 2.5, "bar", "bridge").map((s) => s.reps),
    [6, 3],
  );
  assert.equal(
    validPayload("plan", {
      id: "p",
      name: "P",
      workouts: [],
      recovery: [{ day: 8, name: "x", notes: "" }],
    }),
    false,
  );
});
test("previous week takes priority; excludes paused, future and current sessions", () => {
  const docs = [
    ...fixture("old", "2025-12-30"),
    ...fixture("recent", "2026-01-05"),
    ...fixture("paused", "2026-01-02", { finishedAt: undefined }),
    ...fixture("future", "2026-01-09"),
  ];
  assert.equal(previousPerformance(docs, e, current)?.sessionId, "old");
  assert.equal(previousPerformance(docs, e, current)?.source, "previous-week");
  assert.equal(
    previousPerformance(docs, { ...e, machine: "other" }, current),
    undefined,
  );
  assert.equal(previousPerformance(docs, { ...e, min: 8 }, current), undefined);
});
test("fallback is explicitly latest; deleted and archived histories stay hidden", () => {
  const docs = [
    ...fixture("old", "2025-12-20"),
    ...fixture("hidden", "2025-12-30", { archivedAt: "yes" }),
  ];
  assert.equal(previousPerformance(docs, e, current)?.source, "latest");
  assert.equal(previousPerformance(docs, e, current)?.sessionId, "old");
  docs[0].deleted = true;
  assert.equal(previousPerformance(docs, e, current), undefined);
});
test("summary counts completed sessions only, actual date, activities and zero-load repetitions", () => {
  const docs = [
    ...fixture("a", "2026-01-02"),
    ...fixture("b", "2026-01-03", { finishedAt: undefined }),
    {
      id: "cardio",
      kind: "activity",
      deleted: false,
      payload: { date: "2026-01-02", minutes: 25 },
    } as Entity,
  ];
  const summary = trainingSummary(docs, "2026-01-01", "2026-01-05");
  assert.equal(summary.workouts, 1);
  assert.equal(summary.sets, 1);
  assert.equal(summary.minutes, 25);
  const rows = buildHistoryIndex(docs).rows.filter((r) =>
    summary.completedIds.has(r.sessionId),
  );
  assert.equal(exercisePoints(rows, "load")[0].value, 0);
  assert.equal(exercisePoints(rows, "reps")[0].value, 6);
  assert.equal(exercisePoints(rows, "volume")[0].value, 0);
  assert.match(seriesCsv(rows), /"0";"6";""/);
});
