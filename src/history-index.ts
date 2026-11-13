import type { Entity, Exercise, Session, SetLog } from "./domain.ts";

export const comparisonKey = (exercise: Exercise, machine = exercise.machine) =>
  JSON.stringify([
    exercise.id,
    exercise.name,
    exercise.unit,
    exercise.min,
    exercise.max,
    machine,
  ]);
export interface HistoryRow extends SetLog {
  id: string;
  date: string;
  exercise: Exercise;
  key: string;
}
export interface HistorySession {
  sessionId: string;
  session: Session;
  sets: HistoryRow[];
}
/** Join history once: no scan of all sessions for each set, or all sets for each date. */
export function buildHistoryIndex(docs: Entity[]) {
  const sessions = new Map<string, Session>();
  const exercises = new Map<string, Map<string, Exercise>>();
  const setsBySession = new Map<string, HistoryRow[]>();
  const byComparison = new Map<string, HistorySession[]>();
  const groups = new Map<string, Map<string, HistorySession>>();
  const rows: HistoryRow[] = [];
  for (const doc of docs) {
    if (doc.kind !== "session" || doc.deleted || doc.payload.archivedAt)
      continue;
    const session = doc.payload as Session;
    sessions.set(doc.id, session);
    exercises.set(
      doc.id,
      new Map(
        session.workout.exercises.map((exercise) => [exercise.id, exercise]),
      ),
    );
  }
  for (const doc of docs) {
    if (doc.kind !== "set" || doc.deleted) continue;
    const set = doc.payload as SetLog;
    const session = sessions.get(set.sessionId);
    const exercise = exercises.get(set.sessionId)?.get(set.exerciseId);
    if (!session || !exercise) continue;
    const key = comparisonKey(exercise, set.machine);
    const row = { ...set, id: doc.id, date: session.actualDate, exercise, key };
    rows.push(row);
    let sessionSets = setsBySession.get(set.sessionId);
    if (!sessionSets) setsBySession.set(set.sessionId, (sessionSets = []));
    sessionSets.push(row);
    let comparable = groups.get(key);
    if (!comparable) groups.set(key, (comparable = new Map()));
    let group = comparable.get(set.sessionId);
    if (!group)
      comparable.set(
        set.sessionId,
        (group = { sessionId: set.sessionId, session, sets: [] }),
      );
    group.sets.push(row);
  }
  for (const [key, groupsBySession] of groups) {
    const history = [...groupsBySession.values()];
    for (const group of history) group.sets.sort((a, b) => a.index - b.index);
    history.sort(
      (a, b) =>
        b.session.actualDate.localeCompare(a.session.actualDate) ||
        b.session.startedAt.localeCompare(a.session.startedAt) ||
        b.sessionId.localeCompare(a.sessionId),
    );
    byComparison.set(key, history);
  }
  return { sessions, setsBySession, rows, byComparison };
}
export function dailyLoads(rows: { date: string; load: number }[]) {
  const days = new Map<string, number>();
  for (const row of rows)
    days.set(row.date, Math.max(days.get(row.date) ?? -Infinity, row.load));
  return [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, load]) => ({ date, load }));
}
