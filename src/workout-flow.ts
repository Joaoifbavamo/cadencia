import {
  firstPendingExerciseIndex,
  visible,
  type Entity,
  type Session,
} from "./domain.ts";
export type Phase =
  | "warmup"
  | "work"
  | "rest"
  | "overview"
  | "records"
  | "review";
export type Flow = {
  phase: Phase;
  exerciseId: string;
  warmed: string[];
  warmIndex: number;
  restReturn: "warmup" | "work" | "next";
  restLabel: string;
  restSeconds: number;
  lastIndex: number;
  targets: Record<string, string>;
};
export function prepared(
  session: Session,
  docs: Entity[],
  warmed: string[],
  id: string,
) {
  const remote = (session as Session & { warmupDone?: unknown }).warmupDone;
  return (
    warmed.includes(id) ||
    (Array.isArray(remote) && remote.includes(id)) ||
    visible(docs, "set").some(
      (d) => d.payload.sessionId === session.id && d.payload.exerciseId === id,
    )
  );
}
export function initialFlow(session: Session, docs: Entity[]): Flow {
  const e =
    session.workout.exercises[firstPendingExerciseIndex(session, docs)] ??
    session.workout.exercises[0];
  return {
    phase: session.finishedAt
      ? "review"
      : e?.warm !== "none" && !prepared(session, docs, [], e?.id)
        ? "warmup"
        : "work",
    exerciseId: e?.id ?? "",
    warmed: [],
    warmIndex: 0,
    restReturn: "work",
    restLabel: "",
    restSeconds: 0,
    lastIndex: 0,
    targets: {},
  };
}
export function flowAfterRest(f: Flow, session: Session, docs: Entity[]): Flow {
  if (f.restReturn !== "next") return { ...f, phase: f.restReturn };
  const index = session.workout.exercises.findIndex(
    (e) => e.id === f.exerciseId,
  );
  const next = session.workout.exercises
    .slice(index + 1)
    .find(
      (e) =>
        !session.skipped[e.id] &&
        visible(docs, "set").filter(
          (d) =>
            d.payload.sessionId === session.id && d.payload.exerciseId === e.id,
        ).length < e.sets,
    );
  if (!next) return { ...f, phase: "review" };
  return {
    ...f,
    exerciseId: next.id,
    warmIndex: 0,
    phase:
      next.warm !== "none" && !prepared(session, docs, f.warmed, next.id)
        ? "warmup"
        : "work",
  };
}
export function loadFlow(
  raw: string | null,
  session: Session,
  docs: Entity[],
): Flow {
  const fallback = initialFlow(session, docs);
  if (session.finishedAt) return fallback;
  try {
    const f = JSON.parse(raw ?? "null");
    if (
      !f ||
      !session.workout.exercises.some((e) => e.id === f.exerciseId) ||
      !["warmup", "work", "rest", "overview", "records", "review"].includes(
        f.phase,
      )
    )
      return fallback;
    return {
      ...fallback,
      ...f,
      warmed: Array.isArray(f.warmed)
        ? f.warmed.filter((s: unknown) => typeof s === "string")
        : [],
      targets: f.targets && typeof f.targets === "object" && !Array.isArray(f.targets)
        ? Object.fromEntries(Object.entries(f.targets).filter(([,v])=>typeof v === "string")) : {},
      warmIndex: Number.isInteger(f.warmIndex) ? Math.max(0, f.warmIndex) : 0,
      restReturn: ["warmup", "work", "next"].includes(f.restReturn) ? f.restReturn : "work",
      restLabel: typeof f.restLabel === "string" ? f.restLabel : "",
      restSeconds: Number.isFinite(f.restSeconds) && f.restSeconds >= 0 ? f.restSeconds : 0,
      lastIndex: Number.isInteger(f.lastIndex) && f.lastIndex >= 0 ? f.lastIndex : 0,
    };
  } catch {
    return fallback;
  }
}
