import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adjustLoad,
  nextWorkout,
  normalizeSearch,
  workoutSets,
  monthlyTrainingCount,
  planExport,
} from "../src/experience.ts";
import {
  validateImport,
  type Plan,
  type Workout,
  type Entity,
} from "../src/domain.ts";
import { demoPlan } from "../src/demo.ts";
test("next scheduled workout crosses weeks, ignores empty days, and does not assume today was done", () => {
  const w = { day: 1, exercises: [{ sets: 3 }, { sets: 2 }] } as Workout;
  const p = { workouts: [w, { day: 6, exercises: [] }] } as Plan;
  assert.equal(nextWorkout(p, "2026-11-20")?.date, "2026-11-23");
  assert.equal(nextWorkout(p, "2026-11-23")?.date, "2026-11-30");
  assert.equal(nextWorkout(undefined, "2026-11-20"), undefined);
  assert.equal(workoutSets(w), 5);
});
test("quick load edits accept decimal comma, avoid negative or invalid numbers and rounding drift", () => {
  assert.equal(adjustLoad("22,5", 2.5, 1), "25");
  assert.equal(adjustLoad("0", 2.5, -1), "0");
  assert.equal(adjustLoad("0.1", 0.2, 1), "0.3");
  assert.equal(adjustLoad("abc", 2.5, 1), "abc");
  assert.equal(adjustLoad("20", NaN, 1), "20");
  assert.equal(normalizeSearch("TRÍCEPS"), "triceps");
});
test("month totals include cleanup summaries without paused, archived or deleted sessions", () => {
  const d = (kind: Entity["kind"], payload: unknown, deleted = false) =>
    ({ kind, payload, deleted }) as Entity;
  const result = monthlyTrainingCount(
    [
      d("session", { actualDate: "2026-11-02", finishedAt: "yes" }),
      d("session", { actualDate: "2026-11-03" }),
      d("session", {
        actualDate: "2026-11-04",
        finishedAt: "yes",
        archivedAt: "yes",
      }),
      d("summary", { month: "2026-11", sessions: 4 }),
      d("summary", { month: "2026-11", sessions: 7 }, true),
      d("summary", { month: "2026-10", sessions: 9 }),
    ],
    "2026-11",
  );
  assert.deepEqual(result, { detailed: 1, summarized: 4, total: 5 });
});
test("exported plan passes import validation without changing the editor; incomplete plan is rejected", () => {
  const p = structuredClone(demoPlan),
    snapshot = JSON.stringify(p);
  const exported = planExport(p);
  assert.doesNotThrow(() => validateImport(exported));
  assert.equal(exported.documents.length, 1);
  assert.equal(JSON.stringify(p), snapshot);
  p.workouts[0].exercises[0].name = "";
  assert.throws(() => planExport(p));
  p.workouts[0].exercises[0].name = "Supino";
  p.workouts[0].exercises[0].sets = 0;
  assert.throws(() => planExport(p));
});
