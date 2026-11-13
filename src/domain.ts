export type Unit = "bar" | "dumbbell" | "machine" | "body";
export type Warm = "main" | "secondary" | "none";
export interface Exercise {
  id: string;
  name: string;
  movement: string;
  sets: number;
  min: number;
  max: number;
  rir: number;
  rest: number;
  unit: Unit;
  warm: Warm;
  notes: string;
  alternative: string;
  machine: string;
}
export interface Workout {
  id: string;
  name: string;
  day: number;
  exercises: Exercise[];
}
export interface Plan {
  id: string;
  name: string;
  workouts: Workout[];
}
export interface Session {
  id: string;
  planId: string;
  workout: Workout;
  actualDate: string;
  plannedDate: string;
  startedAt: string;
  finishedAt?: string;
  archivedAt?: string;
  skipped: Record<string, string>;
}
export interface SetLog {
  sessionId: string;
  exerciseId: string;
  index: number;
  load: number;
  reps: number;
  rir: number | null;
  machine: string;
}
export interface Activity {
  date: string;
  name: string;
  minutes: number;
  notes: string;
}
export interface Profile {
  barWeight: number | null;
  increment: number;
  timezone: string;
  todayChoice?: { date: string; workoutId: string; plannedDate: string };
}
export type Kind =
  | "plan"
  | "session"
  | "set"
  | "activity"
  | "profile"
  | "summary";
export interface Entity {
  id: string;
  kind: Kind;
  payload: any;
  version: number;
  change_seq: number;
  deleted: boolean;
  dirty: boolean;
  mutationId: string;
  localSeq: number;
  conflict?: Entity;
  batchId?: string;
}
export const uid = () => crypto.randomUUID();
export const isUuid = (id: unknown) =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export async function setIdentity(
  sessionId: string,
  exerciseId: string,
  index: number,
) {
  const b = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode([sessionId, exerciseId, index].join("|")),
    ),
  );
  b[6] = (b[6] & 15) | 80;
  b[8] = (b[8] & 63) | 128;
  const s = Array.from(b.slice(0, 16), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
  return [
    s.slice(0, 8),
    s.slice(8, 12),
    s.slice(12, 16),
    s.slice(16, 20),
    s.slice(20),
  ].join("-");
}
export function numberInput(value: string): number | null {
  const s = value.trim().replace(",", ".");
  return /^(\d+(\.\d*)?|\.\d+)$/.test(s) && Number.isFinite(Number(s))
    ? Number(s)
    : null;
}
export function validateSet(load: string, reps: string, rir: string) {
  const l = numberInput(load),
    r = numberInput(reps),
    i = rir.trim() === "" ? null : numberInput(rir);
  if (l === null || l < 0 || l > 2000)
    throw Error("Informe uma carga válida entre 0 e 2.000 kg.");
  if (r === null || !Number.isInteger(r) || r < 1 || r > 200)
    throw Error("Informe de 1 a 200 repetições.");
  if (rir.trim() !== "" && (i === null || i < 0 || i > 10))
    throw Error("RIR deve ficar entre 0 e 10, ou em branco.");
  return { load: l, reps: r, rir: i };
}
export function warmup(
  load: number,
  bar: number | null,
  increment: number,
  unit: Unit,
  kind: Warm,
) {
  if (
    !Number.isFinite(load) ||
    load <= 0 ||
    increment <= 0 ||
    !Number.isFinite(increment) ||
    kind === "none" ||
    unit === "body" ||
    (unit === "bar" && (bar === null || bar <= 0 || load < bar))
  )
    return [];
  const minimum = unit === "bar" ? bar! : increment;
  const stages =
    kind === "main"
      ? [
          [0.45, 8],
          [0.7, 5],
          [0.875, 2],
        ]
      : [[0.5, 8]];
  const seen = new Set<number>();
  return stages.flatMap(([pct, reps]) => {
    const rounded =
      unit === "bar"
        ? minimum + Math.round((load * pct - minimum) / increment) * increment
        : Math.round((load * pct) / increment) * increment;
    const n = +Math.min(load, Math.max(minimum, rounded)).toFixed(3);
    if (seen.has(n)) return [];
    seen.add(n);
    return [{ load: n, reps, rest: kind === "main" ? 60 : 45 }];
  });
}
export function todayKey(date = new Date(), timezone = "America/Sao_Paulo") {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((t) => p.find((x) => x.type === t)!.value)
    .join("-");
}
export const dateValid = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(s + "T12:00:00Z")) &&
  new Date(s + "T12:00:00Z").toISOString().slice(0, 10) === s;
export const weekday = (s: string) => new Date(s + "T12:00:00Z").getUTCDay();
export const plannedWorkout = (plan: Plan | undefined, date: string) =>
  plan?.workouts.find((w) => w.day === weekday(date));
export function snapshotSession(
  plan: Plan,
  workout: Workout,
  actualDate: string,
  plannedDate: string,
): Session {
  if (!dateValid(actualDate) || !dateValid(plannedDate))
    throw Error("Data inválida.");
  return {
    id: uid(),
    planId: plan.id,
    workout: structuredClone(workout),
    actualDate,
    plannedDate,
    startedAt: new Date().toISOString(),
    skipped: {},
  };
}
export const unitLabel = (u: Unit) =>
  ({
    bar: "kg · total com barra",
    dumbbell: "kg · por halter",
    machine: "kg · indicados no aparelho",
    body: "kg · carga adicional",
  })[u];
export function isExercise(x: any): x is Exercise {
  return (
    x &&
    typeof x.id === "string" &&
    typeof x.name === "string" &&
    x.name.length > 0 &&
    typeof x.movement === "string" &&
    Number.isInteger(x.sets) &&
    x.sets >= 1 &&
    x.sets <= 10 &&
    Number.isInteger(x.min) &&
    x.min >= 1 &&
    Number.isInteger(x.max) &&
    x.max >= x.min &&
    x.max <= 200 &&
    typeof x.rir === "number" &&
    Number.isFinite(x.rir) &&
    x.rir >= 0 &&
    x.rir <= 10 &&
    typeof x.rest === "number" &&
    Number.isFinite(x.rest) &&
    x.rest >= 15 &&
    x.rest <= 600 &&
    ["bar", "dumbbell", "machine", "body"].includes(x.unit) &&
    ["main", "secondary", "none"].includes(x.warm) &&
    ["notes", "alternative", "machine"].every((k) => typeof x[k] === "string")
  );
}
export function validPayload(kind: Kind, p: any): boolean {
  if (!p || typeof p !== "object") return false;
  try {
    switch (kind) {
      case "plan":
        return (
          typeof p.id === "string" &&
          typeof p.name === "string" &&
          Array.isArray(p.workouts) &&
          p.workouts.length <= 14 &&
          p.workouts.every(
            (w: any) =>
              typeof w.id === "string" &&
              typeof w.name === "string" &&
              Number.isInteger(w.day) &&
              w.day >= 0 &&
              w.day <= 6 &&
              Array.isArray(w.exercises) &&
              w.exercises.length <= 30 &&
              w.exercises.every(isExercise),
          )
        );
      case "set":
        if (
          typeof p.load !== "number" ||
          typeof p.reps !== "number" ||
          (p.rir !== null && typeof p.rir !== "number")
        )
          return false;
        try {
          validateSet(
            String(p.load),
            String(p.reps),
            p.rir === null ? "" : String(p.rir),
          );
          return (
            typeof p.sessionId === "string" &&
            typeof p.exerciseId === "string" &&
            Number.isInteger(p.index) &&
            p.index >= 0 &&
            p.index < 10 &&
            typeof p.machine === "string"
          );
        } catch {
          return false;
        }
      case "session":
        return (
          typeof p.id === "string" &&
          typeof p.planId === "string" &&
          dateValid(p.actualDate) &&
          dateValid(p.plannedDate) &&
          typeof p.startedAt === "string" &&
          Number.isFinite(Date.parse(p.startedAt)) &&
          (!p.finishedAt || Number.isFinite(Date.parse(p.finishedAt))) &&
          p.skipped &&
          typeof p.skipped === "object" &&
          !Array.isArray(p.skipped) &&
          Object.values(p.skipped).every((v) => typeof v === "string") &&
          (p.archivedAt === undefined ||
            (typeof p.archivedAt === "string" &&
              Number.isFinite(Date.parse(p.archivedAt)))) &&
          validPayload("plan", {
            id: p.planId,
            name: "snapshot",
            workouts: [p.workout],
          })
        );
      case "activity":
        return (
          dateValid(p.date) &&
          typeof p.name === "string" &&
          p.name.length > 0 &&
          typeof p.minutes === "number" &&
          Number.isFinite(p.minutes) &&
          p.minutes >= 1 &&
          p.minutes <= 1440 &&
          typeof p.notes === "string"
        );
      case "profile":
        return (
          (p.todayChoice === undefined ||
            (dateValid(p.todayChoice.date) &&
              dateValid(p.todayChoice.plannedDate) &&
              typeof p.todayChoice.workoutId === "string" &&
              p.todayChoice.workoutId.length > 0 &&
              p.todayChoice.workoutId.length <= 200)) &&
          (p.barWeight === null ||
            (typeof p.barWeight === "number" &&
              Number.isFinite(p.barWeight) &&
              p.barWeight > 0 &&
              p.barWeight <= 100)) &&
          typeof p.increment === "number" &&
          Number.isFinite(p.increment) &&
          p.increment > 0 &&
          p.increment <= 100 &&
          typeof p.timezone === "string" &&
          (() => {
            try {
              new Intl.DateTimeFormat("pt-BR", { timeZone: p.timezone });
              return true;
            } catch {
              return false;
            }
          })()
        );
      case "summary":
        return (
          typeof p.month === "string" &&
          Number.isInteger(p.sessions) &&
          p.sessions >= 0
        );
      default:
        return false;
    }
  } catch {
    return false;
  }
}
export function validateImport(input: any): {
  format: string;
  version: number;
  documents: Pick<Entity, "id" | "kind" | "payload">[];
} {
  if (
    input?.format !== "cadencia" ||
    input.version !== 1 ||
    !Array.isArray(input.documents) ||
    input.documents.length > 100000
  )
    throw Error("Arquivo Cadência inválido.");
  const ids = new Set<string>();
  for (const d of input.documents) {
    if (
      !isUuid(d.id) ||
      d.id.length > 100 ||
      ids.has(d.id) ||
      !validPayload(d.kind, d.payload)
    )
      throw Error("O arquivo contém dados inválidos ou repetidos.");
    ids.add(d.id);
  }
  return input;
}
export function visible(docs: Entity[], kind: Kind) {
  const found = docs.filter((d) => d.kind === kind && !d.deleted);
  if (kind === "session") return found.filter((d) => !d.payload.archivedAt);
  if (kind === "set") {
    const archived = new Set(
      docs
        .filter((d) => d.kind === "session" && d.payload?.archivedAt)
        .map((d) => d.id),
    );
    return found.filter((d) => !archived.has(d.payload.sessionId));
  }
  return found;
}
export function archivePausedSession(
  session: Session,
  at = new Date().toISOString(),
): Session {
  if (session.finishedAt)
    throw Error("Somente treinos pausados podem ser retirados.");
  if (!Number.isFinite(Date.parse(at)))
    throw Error("Data de retirada inválida.");
  return { ...session, archivedAt: at };
}
export function restoreArchivedSession(session: Session): Session {
  const { archivedAt, ...rest } = session;
  return rest;
}
export function latestSet(
  docs: Entity[],
  exercise: Exercise,
  excludeSession?: string,
): SetLog | undefined {
  const sessions = visible(docs, "session")
    .filter((d) => d.id !== excludeSession)
    .sort(
      (a, b) =>
        b.payload.actualDate.localeCompare(a.payload.actualDate) ||
        b.payload.startedAt.localeCompare(a.payload.startedAt),
    );
  for (const s of sessions) {
    const e: Exercise | undefined = s.payload.workout.exercises.find(
      (x: Exercise) =>
        x.id === exercise.id &&
        x.unit === exercise.unit &&
        x.min === exercise.min &&
        x.max === exercise.max &&
        x.name === exercise.name,
    );
    if (!e) continue;
    const set = visible(docs, "set").find(
      (d) =>
        d.payload.sessionId === s.id &&
        d.payload.exerciseId === e.id &&
        d.payload.index === 0 &&
        d.payload.machine === exercise.machine,
    );
    if (set) return set.payload;
  }
}
export function cleanupCandidates(docs: Entity[], before: string) {
  const sessions = visible(docs, "session");
  const latest = new Set<string>();
  const references = new Set<string>();
  for (const s of [...sessions].sort((a, b) =>
    b.payload.actualDate.localeCompare(a.payload.actualDate),
  )) {
    for (const e of s.payload.workout.exercises as Exercise[]) {
      const key = [e.id, e.name, e.unit, e.min, e.max, e.machine].join("|");
      if (
        !references.has(key) &&
        visible(docs, "set").some(
          (d) =>
            d.payload.sessionId === s.id &&
            d.payload.exerciseId === e.id &&
            d.payload.index === 0,
        )
      ) {
        references.add(key);
        latest.add(s.id);
      }
    }
  }
  const ids = new Set(
    sessions
      .filter(
        (s) =>
          s.payload.finishedAt &&
          s.payload.actualDate < before &&
          !latest.has(s.id),
      )
      .map((s) => s.id),
  );
  return docs.filter(
    (d) =>
      !d.deleted &&
      ((d.kind === "session" && ids.has(d.id)) ||
        (d.kind === "set" && ids.has(d.payload.sessionId)) ||
        (d.kind === "activity" && d.payload.date < before)),
  );
}

export function findResumableSession(
  docs: Entity[],
  workoutId: string,
  date: string,
) {
  return visible(docs, "session").find(
    (d) =>
      !d.payload.finishedAt &&
      d.payload.actualDate === date &&
      d.payload.workout.id === workoutId,
  );
}
export function firstPendingExerciseIndex(session: Session, docs: Entity[]) {
  if (session.finishedAt) return 0;
  const sets = visible(docs, "set").filter(
    (d) => d.payload.sessionId === session.id,
  );
  const index = session.workout.exercises.findIndex(
    (e) =>
      !session.skipped[e.id] &&
      sets.filter((s) => s.payload.exerciseId === e.id).length < e.sets,
  );
  return index < 0 ? Math.max(0, session.workout.exercises.length - 1) : index;
}
