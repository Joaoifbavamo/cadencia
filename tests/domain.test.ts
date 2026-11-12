import { test } from "node:test";
import assert from "node:assert/strict";
import {
  numberInput,
  validateSet,
  warmup,
  todayKey,
  plannedWorkout,
  snapshotSession,
  validateImport,
} from "../src/domain.ts";
test("decimal pt-BR; vazio não vira zero", () => {
  assert.equal(numberInput("12,5"), 12.5);
  assert.equal(numberInput(""), null);
  assert.equal(numberInput("1a"), null);
});
test("série exige reps positivas; RIR opcional", () => {
  assert.equal(validateSet("30", "8", "").rir, null);
  assert.throws(() => validateSet("30", "0", ""));
  assert.throws(() => validateSet("-1", "8", ""));
  assert.throws(() => validateSet("30", "8", "11"));
});
test("aproximações respeitam barra e incremento sem duplicar", () => {
  assert.deepEqual(
    warmup(80, 20, 2.5, "bar", "main").map((x) => x.load),
    [35, 55, 70],
  );
  assert.deepEqual(
    warmup(20, 20, 2.5, "bar", "main").map((x) => x.load),
    [20],
  );
  assert.deepEqual(warmup(19, 20, 2.5, "bar", "main"), []);
  assert.deepEqual(warmup(80, null, 2.5, "bar", "main"), []);
  assert.deepEqual(warmup(20, null, 2, "dumbbell", "none"), []);
});
test("data em São Paulo não usa dia UTC", () => {
  assert.equal(todayKey(new Date("2026-11-12T01:00:00Z")), "2026-11-11");
});
test("agendamento e snapshot não mudam o passado", () => {
  const p: any = {
    id: "p",
    name: "Ficha",
    workouts: [{ id: "a", name: "Inferior A", day: 2, exercises: [] }],
  };
  assert.equal(plannedWorkout(p, "2026-11-10")?.id, "a");
  const s = snapshotSession(p, p.workouts[0], "2026-11-11", "2026-11-10");
  p.workouts[0].name = "Novo";
  assert.equal(s.workout.name, "Inferior A");
  assert.equal(s.actualDate, "2026-11-11");
  assert.equal(s.plannedDate, "2026-11-10");
});
test("importação recusa estrutura e valores arbitrários", () => {
  assert.throws(() => validateImport({ foo: 1 }));
  assert.throws(() =>
    validateImport({
      format: "cadencia",
      version: 1,
      documents: [{ id: "x", kind: "set", payload: { load: -20 } }],
    }),
  );
});
