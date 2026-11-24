import type { Entity, Exercise, Session } from "./domain.ts";
import {
  buildHistoryIndex,
  comparisonKey,
  type HistoryRow,
} from "./history-index.ts";

/** Date keys are calendar dates, never converted through the device's local zone. */
export function shiftDate(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function weekStart(date: string) {
  const day = new Date(date + "T12:00:00Z").getUTCDay();
  return shiftDate(date, -((day + 6) % 7));
}
export function previousPerformance(
  docs: Entity[],
  exercise: Exercise,
  current: Session,
) {
  const groups =
    buildHistoryIndex(docs).byComparison.get(comparisonKey(exercise)) ?? [];
  const before = groups.filter(
    (g) =>
      g.sessionId !== current.id &&
      g.session.finishedAt &&
      Date.parse(g.session.finishedAt) < Date.parse(current.startedAt) &&
      g.session.actualDate <= current.actualDate,
  );
  const end = weekStart(current.actualDate),
    start = shiftDate(end, -7);
  const priorWeek = before.filter(
    (g) => g.session.actualDate >= start && g.session.actualDate < end,
  );
  const pool = priorWeek.length ? priorWeek : before;
  // Prefer the same workout when a movement also occurs on another training day.
  const group =
    (priorWeek.length
      ? pool.find((g) => g.session.workout.id === current.workout.id)
      : undefined) ?? pool[0];
  return group
    ? {
        ...group,
        source: priorWeek.length
          ? ("previous-week" as const)
          : ("latest" as const),
      }
    : undefined;
}
export type Metric = "load" | "reps" | "volume";
export function sortHistoryRows(
  rows: HistoryRow[],
  sessions: Map<string, Session>,
  descending = false,
) {
  const direction = descending ? -1 : 1;
  return [...rows].sort(
    (a, b) =>
      direction *
        (a.date.localeCompare(b.date) ||
          (Date.parse(sessions.get(a.sessionId)?.startedAt ?? "") || 0) -
            (Date.parse(sessions.get(b.sessionId)?.startedAt ?? "") || 0) ||
          a.sessionId.localeCompare(b.sessionId)) || a.index - b.index,
  );
}
export function exercisePoints(rows: HistoryRow[], metric: Metric) {
  const days = new Map<string, HistoryRow[]>();
  for (const row of rows) {
    const list = days.get(row.date) ?? [];
    list.push(row);
    days.set(row.date, list);
  }
  return [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sets]) => ({
      date,
      value:
        metric === "load"
          ? Math.max(...sets.map((s) => s.load))
          : metric === "reps"
            ? sets.reduce((n, s) => n + s.reps, 0)
            : sets.reduce((n, s) => n + s.load * s.reps, 0),
    }));
}
export function trainingSummary(
  docs: Entity[],
  from: string,
  through: string,
  index = buildHistoryIndex(docs),
) {
  const sessions = [...index.sessions.entries()].filter(
    ([, s]) => s.finishedAt && s.actualDate >= from && s.actualDate <= through,
  );
  const ids = new Set(sessions.map(([id]) => id));
  const sets = index.rows.filter((r) => ids.has(r.sessionId));
  const minutes = docs
    .filter(
      (d) =>
        d.kind === "activity" &&
        !d.deleted &&
        d.payload.date >= from &&
        d.payload.date <= through,
    )
    .reduce((n, d) => n + (Number(d.payload.minutes) || 0), 0);
  const start = shiftDate(weekStart(through), -49);
  const weeks = Array.from({ length: 8 }, (_, i) => ({
    date: shiftDate(start, i * 7),
    value: 0,
  }));
  for (const [, s] of sessions) {
    const w = weeks.find((w) => w.date === weekStart(s.actualDate));
    if (w) w.value++;
  }
  return {
    workouts: sessions.length,
    days: new Set(sessions.map(([, s]) => s.actualDate)).size,
    sets: sets.length,
    minutes,
    weeks,
    completedIds: ids,
  };
}
export function seriesCsv(rows: HistoryRow[]) {
  const cell = (v: unknown) => {
    let text = String(v ?? "");
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      [
        "Data",
        "Exercício",
        "Unidade",
        "Aparelho",
        "Série",
        "Carga kg",
        "Repetições",
        "RIR",
        "Sessão",
      ],
      ...rows.map((r) => [
        r.date,
        r.exercise.name,
        r.exercise.unit,
        r.machine,
        r.index + 1,
        r.load,
        r.reps,
        r.rir,
        r.sessionId,
      ]),
    ]
      .map((row) => row.map(cell).join(";"))
      .join("\r\n")
  );
}
