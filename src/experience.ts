import {
  isUuid,
  uid,
  validateImport,
  type Entity,
  type Plan,
  type Workout,
} from "./domain.ts";
import { shiftDate } from "./training-insights.ts";

export const workoutSets = (workout: Workout) =>
  workout.exercises.reduce((n, e) => n + e.sets, 0);
export function planExport(plan: Plan) {
  if (
    !plan.name.trim() ||
    plan.workouts.some(
      (w) => !w.name.trim() || w.exercises.some((e) => !e.name.trim()),
    )
  )
    throw Error("Revise os nomes da ficha.");
  const id = isUuid(plan.id) ? plan.id : uid();
  return validateImport({
    format: "cadencia",
    version: 1,
    documents: [{ id, kind: "plan", payload: { ...plan, id } }],
  });
}
export function monthlyTrainingCount(docs: Entity[], month: string) {
  const detailed = docs.filter(
    (d) =>
      d.kind === "session" &&
      !d.deleted &&
      !d.payload.archivedAt &&
      d.payload.finishedAt &&
      d.payload.actualDate.startsWith(month),
  ).length;
  const summarized = docs
    .filter(
      (d) => d.kind === "summary" && !d.deleted && d.payload.month === month,
    )
    .reduce((n, d) => n + Math.max(0, Number(d.payload.sessions) || 0), 0);
  return { detailed, summarized, total: detailed + summarized };
}
export function nextWorkout(plan: Plan | undefined, after: string) {
  if (!plan) return undefined;
  for (let offset = 1; offset <= 7; offset++) {
    const date = shiftDate(after, offset);
    const day = new Date(date + "T12:00:00Z").getUTCDay();
    const workout = plan.workouts.find(
      (w) => w.day === day && w.exercises.length,
    );
    if (workout) return { workout, date };
  }
}
export function adjustLoad(raw: string, increment: number, direction: -1 | 1) {
  const load = raw.trim() === "" ? 0 : Number(raw.replace(",", "."));
  if (
    !Number.isFinite(load) ||
    load < 0 ||
    !Number.isFinite(increment) ||
    increment <= 0
  )
    return raw;
  return String(
    Math.min(
      2000,
      Math.max(0, Math.round((load + increment * direction) * 1000) / 1000),
    ),
  );
}
export function normalizeSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}
