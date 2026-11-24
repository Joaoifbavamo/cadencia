import { test } from "node:test";
import assert from "node:assert/strict";
import { demoPlan } from "../src/demo.ts";
import {
  validPayload,
  snapshotSession,
  payloadWithinLimit,
} from "../src/domain.ts";
import { writeEditorDraft, readEditorDraft } from "../src/editor-draft.ts";
import { sortHistoryRows, seriesCsv } from "../src/training-insights.ts";
import { buildHistoryIndex } from "../src/history-index.ts";

test("bridge drafts preserve deliberately incomplete editor fields", () => {
  const plan = structuredClone(demoPlan);
  plan.workouts[0].exercises[0].warm = "bridge";
  plan.workouts[0].exercises[0].name = "";
  plan.workouts[0].exercises[0].sets = 0;
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
  writeEditorDraft("test", plan, null, storage);
  assert.deepEqual(readEditorDraft("test", storage)?.plan, plan);
});

test("duplicate workout/exercise identities fail in plans and session snapshots", () => {
  const plan = structuredClone(demoPlan);
  plan.workouts[0].exercises.push(
    structuredClone(plan.workouts[0].exercises[0]),
  );
  assert.equal(validPayload("plan", plan), false);
  assert.equal(
    validPayload(
      "session",
      snapshotSession(plan, plan.workouts[0], "2026-11-23", "2026-11-23"),
    ),
    false,
  );
  const workouts = structuredClone(demoPlan);
  workouts.workouts.push(structuredClone(workouts.workouts[0]));
  assert.equal(validPayload("plan", workouts), false);
  const reused = structuredClone(demoPlan);
  reused.workouts.push({
    ...structuredClone(reused.workouts[0]),
    id: "another-workout",
    day: 3,
  });
  assert.equal(validPayload("plan", reused), true);
});

test("summary provenance validates unique bounded IDs and cannot exceed aggregate sessions", () => {
  const summary = {
    month: "2026-11",
    sessions: 3,
    removedSessionIds: ["one", "two"],
  };
  assert.equal(validPayload("summary", summary), true);
  assert.equal(
    validPayload("summary", { ...summary, removedSessionIds: ["one", "one"] }),
    false,
  );
  assert.equal(validPayload("summary", { ...summary, sessions: 1 }), false);
  assert.equal(
    validPayload("summary", { ...summary, month: "2026-13" }),
    false,
  );
  assert.equal(payloadWithinLimit({ notes: "é".repeat(500000) }), false);
});

test("history groups session sets and sorts actual instants across timezone offsets for table and CSV", () => {
  const exercise = demoPlan.workouts[0].exercises[0];
  const make = (id: string, startedAt: string) => ({
    id,
    planId: demoPlan.id,
    workout: demoPlan.workouts[0],
    actualDate: "2026-11-23",
    plannedDate: "2026-11-23",
    startedAt,
    skipped: {},
  });
  const sessions = new Map([
    ["late", make("late", "2026-11-23T09:00:00-03:00")],
    ["early", make("early", "2026-11-23T11:00:00Z")],
  ]);
  const rows = ["late", "early"].flatMap((sessionId) =>
    [1, 0].map((index) => ({
      id: `${sessionId}${index}`,
      sessionId,
      date: "2026-11-23",
      exercise,
      key: "key",
      machine: "",
      index,
      load: 20,
      reps: 10,
      rir: null,
    })),
  );
  const ascending = sortHistoryRows(rows, sessions);
  assert.deepEqual(
    ascending.map((r) => r.id),
    ["early0", "early1", "late0", "late1"],
  );
  assert.deepEqual(
    sortHistoryRows(rows, sessions, true).map((r) => r.id),
    ["late0", "late1", "early0", "early1"],
  );
  assert.ok(
    seriesCsv(ascending).indexOf('"early"') <
      seriesCsv(ascending).indexOf('"late"'),
  );
});
