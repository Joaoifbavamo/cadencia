import test from "node:test";
import assert from "node:assert/strict";
import { initialFlow, flowAfterRest, loadFlow } from "../src/workout-flow.ts";
import { demoPlan } from "../src/demo.ts";
const session = {
  id: "s",
  planId: demoPlan.id,
  workout: demoPlan.workouts[0],
  actualDate: "2026-11-13",
  plannedDate: "2026-11-13",
  startedAt: new Date().toISOString(),
  skipped: {},
} as any;
test("começa no aquecimento e não mistura com série válida", () => {
  assert.equal(initialFlow(session, []).phase, "warmup");
  const s = structuredClone(session);
  s.workout.exercises[0].warm = "none";
  assert.equal(initialFlow(s, []).phase, "work");
});
test("descanso de aquecimento volta à preparação e descanso final avança exercício", () => {
  const f = initialFlow(session, []);
  assert.equal(
    flowAfterRest({ ...f, restReturn: "warmup" }, session, []).phase,
    "warmup",
  );
  const sets = Array.from({ length: 3 }, (_, index) => ({
    id: "x" + index,
    kind: "set",
    deleted: false,
    payload: { sessionId: "s", exerciseId: "demo-bench", index },
  })) as any;
  const n = flowAfterRest({ ...f, restReturn: "next" }, session, sets);
  assert.equal(n.exerciseId, "demo-row");
  assert.equal(n.phase, "warmup");
});
test("cache inválido não injeta objetos em campos de carga nem fase inválida após descanso", () => {
  const f = initialFlow(session, []);
  const restored = loadFlow(
    JSON.stringify({
      ...f,
      phase: "rest",
      restReturn: "unknown",
      restSeconds: "bad",
      targets: { [f.exerciseId]: {}, safe: "20" },
      warmed: [42, "valid"],
    }),
    session,
    [],
  );
  assert.equal(restored.targets[f.exerciseId], undefined);
  assert.equal(restored.targets.safe, "20");
  assert.equal(restored.restReturn, "work");
  assert.equal(restored.restSeconds, 0);
  assert.equal(flowAfterRest(restored, session, []).phase, "work");
});
