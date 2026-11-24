import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activityCategory,
  activityPayload,
  activitySummary,
} from "../src/activity.ts";
import { validPayload } from "../src/domain.ts";
const input = {
  date: "2026-11-17",
  category: "abs" as const,
  name: "Abdômen",
  minutes: "",
  notes: "",
  sets: [],
};
test("abdomen can be recorded without invented time or sets; legacy activities retain validation", () => {
  const payload = activityPayload(input);
  assert.equal(payload.minutes, 0);
  assert.equal(payload.abdominalSets, undefined);
  assert.equal(validPayload("activity", payload), true);
  assert.equal(
    validPayload("activity", { ...payload, category: undefined }),
    false,
  );
  assert.equal(
    validPayload("activity", { ...payload, category: "cardio" }),
    false,
  );
  assert.equal(
    validPayload("activity", {
      date: input.date,
      name: "Caminhada",
      minutes: 20,
      notes: "",
    }),
    true,
  );
  assert.match(activitySummary(payload), /sem duração/);
});
test("cardio requires actual positive time; changing category does not smuggle abdominal sets", () => {
  assert.throws(() => activityPayload({ ...input, category: "cardio" }));
  const payload = activityPayload({
    ...input,
    category: "cardio",
    name: "Bicicleta",
    minutes: "25,5",
    sets: [{ exercise: "x", reps: "12", load: "" }],
  });
  assert.equal(payload.minutes, 25.5);
  assert.equal(payload.abdominalSets, undefined);
  assert.match(activitySummary(payload), /25,5 min/);
});
test("added abdominal sets require reps, allow bodyweight, and survive export validation", () => {
  assert.throws(() =>
    activityPayload({
      ...input,
      sets: [{ exercise: "Crunch", reps: "", load: "" }],
    }),
  );
  const payload = activityPayload({
    ...input,
    sets: [
      { exercise: "Crunch", reps: "12", load: "10,5" },
      { exercise: "Reverso", reps: "15", load: "" },
    ],
  });
  assert.equal(payload.abdominalSets?.[1].load, 0);
  assert.equal(payload.abdominalSets?.[0].load, 10.5);
  assert.match(activitySummary(payload), /2 séries · 27 reps/);
  assert.equal(validPayload("activity", payload), true);
  assert.equal(
    validPayload("activity", {
      ...payload,
      abdominalSets: [{ exercise: "x", reps: 0, load: 0 }],
    }),
    false,
  );
  assert.equal(
    validPayload("activity", {
      ...payload,
      abdominalSets: Array(31).fill({ exercise: "x", reps: 1, load: 0 }),
    }),
    false,
  );
});
test("invalid dates/numbers are rejected and legacy names infer the right editing form", () => {
  assert.throws(() => activityPayload({ ...input, date: "2026-02-30" }));
  assert.throws(() => activityPayload({ ...input, minutes: "abc" }));
  assert.throws(() => activityPayload({ ...input, minutes: "-1" }));
  assert.equal(activityCategory({ name: "ABDÔMEN" }), "abs");
  assert.equal(activityCategory({ name: "Caminhada teste" }), "cardio");
  assert.equal(activityCategory({ name: "Alongamento" }), "other");
});
