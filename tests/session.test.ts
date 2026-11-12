import { test } from "node:test";
import assert from "node:assert/strict";
import { latestSet, cleanupCandidates } from "../src/domain.ts";
const e: any = {
  id: "bench-heavy",
  name: "Supino",
  unit: "bar",
  min: 4,
  max: 6,
  machine: "",
};
const session = (id: string, date: string, finished = true) => ({
  id,
  kind: "session",
  payload: {
    actualDate: date,
    startedAt: date,
    finishedAt: finished ? date : undefined,
    workout: { exercises: [e] },
  },
});
const set = (sessionId: string, load: number, index = 0) => ({
  id: sessionId + index,
  kind: "set",
  payload: { sessionId, exerciseId: e.id, index, load, machine: "" },
});
test("referência separa faixa e usa primeira série", () => {
  const docs: any = [session("s", "2026-11-10"), set("s", 80), set("s", 85, 1)];
  assert.equal(latestSet(docs, e)?.load, 80);
  assert.equal(latestSet(docs, { ...e, min: 6, max: 8 }), undefined);
  assert.equal(latestSet(docs, { ...e, name: "Supino no Smith" }), undefined);
});
test("limpeza preserva última referência e rascunhos", () => {
  const docs: any = [
    session("old", "2025-01-01"),
    set("old", 60),
    session("new", "2026-01-01"),
    set("new", 80),
    session("draft", "2025-01-02", false),
  ];
  assert.deepEqual(
    cleanupCandidates(docs, "2026-10-01")
      .map((x) => x.id)
      .sort(),
    ["old", "old0"],
  );
});
