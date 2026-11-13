import { cleanupCandidates, dateValid, uid, type Entity } from "./domain.ts";
import { editEntity } from "./merge.ts";

type Group = { records: { id: string; fingerprint: string }[] };
export type CleanupJob = {
  id: string;
  before: string;
  summaries: boolean;
  groups: Group[];
  cursor: number;
  total: number;
  processed: number;
  skipped: number;
  status: "ready" | "waiting" | "paused" | "complete" | "cancelled";
  message: string;
  recovery?: { originals: Entity[]; prepared: Entity[] };
};
const fingerprint = (d: Entity) =>
  JSON.stringify([d.kind, d.payload, d.version, d.mutationId, d.deleted]);

export function planCleanup(
  docs: Entity[],
  before: string,
  summaries: boolean,
): CleanupJob {
  if (!dateValid(before)) throw Error("Escolha uma data válida.");
  if (docs.some((d) => d.dirty || d.conflict))
    throw Error("Sincronize pendências e resolva conflitos antes da limpeza.");
  const candidates = cleanupCandidates(docs, before);
  const groups = new Map<string, Group>();
  for (const d of candidates) {
    const key = d.kind === "set" ? d.payload.sessionId : d.id;
    const group = groups.get(key) ?? { records: [] };
    group.records.push({ id: d.id, fingerprint: fingerprint(d) });
    groups.set(key, group);
  }
  if (
    [...groups.values()].some(
      (g) => g.records.length + (summaries ? 1 : 0) > 500,
    )
  )
    throw Error(
      "Uma sessão excede o limite seguro de 500 registros. Exporte o backup antes de gerenciar essa sessão.",
    );
  return {
    id: uid(),
    before,
    summaries,
    groups: [...groups.values()],
    cursor: 0,
    total: candidates.length,
    processed: 0,
    skipped: 0,
    status: candidates.length ? "ready" : "complete",
    message: "Prévia salva neste aparelho.",
  };
}

export function cleanupStep(
  docs: Entity[],
  previous: CleanupJob,
  online: boolean,
): { changes: Entity[]; job: CleanupJob } {
  const job = structuredClone(previous);
  const stop = (status: CleanupJob["status"], message: string) => ({
    changes: [],
    job: { ...job, status, message },
  });
  if (job.status === "complete" || job.status === "cancelled")
    return { changes: [], job };
  if (!online)
    return stop("paused", "Sem conexão. Nenhum novo lote foi preparado.");
  if (docs.some((d) => d.conflict))
    return stop("paused", "Resolva os conflitos para continuar.");
  if (docs.some((d) => d.dirty))
    return stop(
      "waiting",
      "Aguardando confirmação das pendências antes do próximo lote.",
    );
  const eligible = new Set(
    cleanupCandidates(docs, job.before).map((d) => d.id),
  );
  const byId = new Map(docs.map((d) => [d.id, d]));
  const selected: Entity[] = [];
  const monthly = new Map<string, number>();
  while (job.cursor < job.groups.length) {
    const group = job.groups[job.cursor];
    const records = group.records.map((r) => byId.get(r.id));
    const session = records.find((d) => d?.kind === "session");
    // A newly added set changes the session group, so skip it entirely.
    const sessionSets = session
      ? docs.filter(
          (d) =>
            !d.deleted &&
            d.kind === "set" &&
            d.payload.sessionId === session.id,
        )
      : [];
    const unchanged =
      records.every(
        (d, i) =>
          d &&
          eligible.has(d.id) &&
          fingerprint(d) === group.records[i].fingerprint,
      ) && sessionSets.every((d) => group.records.some((r) => r.id === d.id));
    if (!unchanged) {
      job.skipped += group.records.length;
      job.cursor++;
      continue;
    }
    const month = session?.payload.actualDate.slice(0, 7);
    const summaryCount =
      monthly.size + (job.summaries && month && !monthly.has(month) ? 1 : 0);
    if (selected.length + records.length + summaryCount > 500) break;
    selected.push(...(records as Entity[]));
    if (job.summaries && month)
      monthly.set(month, (monthly.get(month) ?? 0) + 1);
    job.processed += group.records.length;
    job.cursor++;
  }
  const batchId = uid();
  const changes = selected.map((d) => ({
    ...editEntity(d, {}, true),
    batchId,
  }));
  for (const [month, count] of monthly) {
    const old = docs.find(
      (d) => !d.deleted && d.kind === "summary" && d.payload.month === month,
    );
    const payload = { month, sessions: (old?.payload.sessions ?? 0) + count };
    changes.push(
      old
        ? { ...editEntity(old, payload, false), batchId }
        : {
            id: uid(),
            kind: "summary",
            payload,
            version: 0,
            change_seq: 0,
            deleted: false,
            dirty: true,
            localSeq: 1,
            mutationId: uid(),
            batchId,
          },
    );
  }
  job.status = changes.length ? "waiting" : "complete";
  if (changes.length)
    job.recovery = {
      originals: changes.flatMap((change) =>
        byId.has(change.id) ? [structuredClone(byId.get(change.id)!)] : [],
      ),
      prepared: structuredClone(changes),
    };
  job.message = changes.length
    ? "Lote registrado; aguardando confirmação. Depois, continue a limpeza."
    : "Limpeza concluída. Registros alterados desde a prévia foram preservados.";
  return { changes, job };
}

export function restoreCleanup(
  docs: Entity[],
  previous: CleanupJob,
): { changes: Entity[]; job: CleanupJob } {
  const recovery = previous.recovery;
  if (!recovery)
    throw Error(
      "Não há lote de limpeza disponível para restaurar neste aparelho.",
    );
  if (docs.some((d) => d.dirty || d.conflict))
    throw Error(
      "Sincronize as pendências e resolva conflitos antes de restaurar.",
    );
  const byId = new Map(docs.map((d) => [d.id, d]));
  for (const prepared of recovery.prepared) {
    const current = byId.get(prepared.id);
    if (
      !current ||
      current.version !== prepared.version + 1 ||
      current.mutationId !== prepared.mutationId ||
      current.deleted !== prepared.deleted ||
      JSON.stringify(current.payload) !== JSON.stringify(prepared.payload)
    )
      throw Error(
        "Um registro deste lote mudou. A restauração foi interrompida para preservar a versão atual; use seu backup anterior à limpeza.",
      );
  }
  const originals = new Map(recovery.originals.map((d) => [d.id, d])),
    batchId = uid();
  const changes = recovery.prepared.map((prepared) => {
    const current = byId.get(prepared.id)!,
      original = originals.get(prepared.id);
    return {
      ...editEntity(
        current,
        original?.payload ?? {},
        original?.deleted ?? true,
      ),
      batchId,
    };
  });
  return {
    changes,
    job: {
      ...previous,
      status: "cancelled",
      recovery: undefined,
      message:
        "Último lote restaurado neste aparelho; aguardando sincronização. O restante da limpeza foi cancelado.",
    },
  };
}
