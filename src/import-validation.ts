import { validateImport, type Entity } from "./domain.ts";
type ImportDocument = Pick<Entity, "id" | "kind" | "payload"> & {
  deleted?: boolean;
};

export function preflightImport(input: unknown, existing: Entity[]) {
  const validated = validateImport(input);
  const existingById = new Map(existing.map((d) => [d.id, d]));
  const documents: ImportDocument[] = validated.documents.map(
    ({ id, kind, payload }) => ({
      id,
      kind,
      payload: structuredClone(payload),
    }),
  );
  // Check source identities before canonicalizing singletons. Otherwise a
  // malicious source collision could disappear during the rewrite.
  for (const d of documents) {
    const old = existingById.get(d.id);
    if (old && old.kind !== d.kind)
      throw Error(
        "O backup tenta alterar o tipo de um registro existente. Nenhum dado foi importado.",
      );
    if ((old?.batchId && old.dirty) || old?.conflict)
      throw Error(
        "Sincronize ou resolva a limpeza pendente antes de importar estes registros.",
      );
    if (
      old &&
      old.kind === "summary" &&
      !old.deleted &&
      old.payload.month !== d.payload.month
    )
      throw Error(
        "O backup tenta mudar o mês de um resumo existente. Nenhum dado foi importado.",
      );
    if ((d.kind === "session" || d.kind === "plan") && d.payload.id !== d.id)
      throw Error(
        "O identificador do registro difere da identidade no conteúdo. Nenhum dado foi importado.",
      );
  }
  for (const kind of ["plan", "profile"] as const) {
    const incoming = documents.filter((d) => d.kind === kind);
    if (incoming.length > 1)
      throw Error(
        "O backup contém várias fichas ou perfis ativos. Escolha um backup com uma única ficha e um único perfil. Nenhum dado foi importado.",
      );
    if (!incoming.length) continue;
    const active = existing
      .filter((d) => d.kind === kind && !d.deleted)
      .sort((a, b) => a.id.localeCompare(b.id));
    const canonical = active[0];
    if (canonical) {
      const source = incoming[0];
      source.id = canonical.id;
      if (kind === "plan") source.payload.id = canonical.id;
      // Sessions intentionally keep their immutable workout and planId snapshot.
      documents.push(
        ...active
          .slice(1)
          .map((d) => ({ id: d.id, kind, payload: {}, deleted: true })),
      );
    }
  }
  const summaryMonths = new Set<string>();
  for (const incoming of documents.filter((d) => d.kind === "summary")) {
    const month = incoming.payload.month;
    if (summaryMonths.has(month))
      throw Error(
        "O backup contém resumos repetidos do mesmo mês. Nenhum dado foi importado.",
      );
    summaryMonths.add(month);
    const current = existing.filter(
      (d) => d.kind === "summary" && !d.deleted && d.payload.month === month,
    );
    if (current.length > 1)
      throw Error(
        "Este mês contém vários resumos antigos. A importação foi interrompida para preservar suas contagens.",
      );
    if (!current.length) continue;
    const old = current[0];
    const oldIds: string[] = old.payload.removedSessionIds ?? [];
    const incomingIds: string[] = incoming.payload.removedSessionIds ?? [];
    const oldLegacy = old.payload.sessions - oldIds.length;
    const incomingLegacy = incoming.payload.sessions - incomingIds.length;
    if (incomingLegacy > 0 && incomingLegacy !== oldLegacy)
      throw Error(
        "Os resumos antigos deste mês têm contagens incompatíveis e não identificam os treinos. Restaure o lote de limpeza antes de importar. Nenhum dado foi importado.",
      );
    const ids = [...new Set([...oldIds, ...incomingIds])];
    incoming.id = old.id;
    incoming.payload = {
      ...incoming.payload,
      sessions: oldLegacy + ids.length,
      removedSessionIds: ids,
    };
  }
  const combined = new Map(existing.map((d) => [d.id, d]));
  for (const d of documents) {
    const old = combined.get(d.id);
    if (old && old.kind !== d.kind)
      throw Error(
        "O backup tenta alterar o tipo de um registro existente. Nenhum dado foi importado.",
      );
    if ((old?.batchId && old.dirty) || old?.conflict)
      throw Error(
        "Sincronize ou resolva a limpeza pendente antes de importar estes registros.",
      );
    if (
      !d.deleted &&
      (d.kind === "session" || d.kind === "plan") &&
      d.payload.id !== d.id
    )
      throw Error(
        "O identificador do registro difere da identidade no conteúdo. Nenhum dado foi importado.",
      );
    combined.set(d.id, { ...d, deleted: !!d.deleted } as Entity);
  }
  const importedIds = new Set(documents.map((d) => d.id));
  const importedSessions = new Set(
    documents.filter((d) => d.kind === "session").map((d) => d.id),
  );
  for (const d of combined.values()) {
    if (
      d.kind !== "set" ||
      d.deleted ||
      (!importedIds.has(d.id) && !importedSessions.has(d.payload.sessionId))
    )
      continue;
    const parent = combined.get(d.payload.sessionId);
    if (!parent || parent.deleted || parent.kind !== "session")
      throw Error(
        "O backup contém uma série sem sessão correspondente. Nenhum dado foi importado.",
      );
    const exercise = parent.payload.workout.exercises.find(
      (e: { id: string }) => e.id === d.payload.exerciseId,
    );
    if (!exercise || d.payload.index >= exercise.sets)
      throw Error(
        "O backup contém uma série sem exercício correspondente na sessão. Nenhum dado foi importado.",
      );
  }
  const identities = new Set<string>();
  for (const d of combined.values()) {
    if (d.kind !== "set" || d.deleted) continue;
    const identity = JSON.stringify([
      d.payload.sessionId,
      d.payload.exerciseId,
      d.payload.index,
    ]);
    if (identities.has(identity))
      throw Error(
        "O backup repete uma série com identificadores diferentes. Nenhum dado foi importado.",
      );
    identities.add(identity);
  }
  reconcileSummaries(documents, existing, combined);
  return documents;
}

function reconcileSummaries(
  documents: ImportDocument[],
  existing: Entity[],
  combined: Map<string, Entity>,
) {
  const live = [...combined.values()].filter(
    (d) => d.kind === "session" && !d.deleted,
  );
  const liveIds = new Set(live.map((d) => d.id));
  const existingById = new Map(existing.map((d) => [d.id, d]));
  const introduced = documents.filter(
    (d) =>
      d.kind === "session" &&
      (!existingById.has(d.id) || existingById.get(d.id)!.deleted),
  );
  // Reconcile every summary, including one restored by the same backup. The
  // residual count belongs to legacy data whose identities are unknowable.
  for (const summary of combined.values()) {
    if (summary.kind !== "summary" || summary.deleted) continue;
    const ids: string[] = summary.payload.removedSessionIds ?? [];
    const knownIds = new Set(ids);
    const legacy = summary.payload.sessions - ids.length;
    const importedSummary = documents.some((d) => d.id === summary.id);
    const priorSummary = existingById.get(summary.id);
    const knownExistingSummary =
      priorSummary && !priorSummary.deleted && priorSummary.kind === "summary";
    if (
      legacy > 0 &&
      (introduced.some(
        (d) =>
          d.payload.actualDate.slice(0, 7) === summary.payload.month &&
          !knownIds.has(d.id),
      ) ||
        (importedSummary &&
          !knownExistingSummary &&
          live.some(
            (d) =>
              d.payload.actualDate.slice(0, 7) === summary.payload.month &&
              !knownIds.has(d.id),
          )))
    )
      throw Error(
        "Este mês contém um resumo antigo sem identificação dos treinos removidos. Restaure o último lote pela opção de recuperação da limpeza antes de importar; não é seguro descontar apenas parte desse resumo. Nenhum dado foi importado.",
      );
    const remaining = ids.filter((id) => !liveIds.has(id));
    if (remaining.length === ids.length) continue;
    const old = existingById.get(summary.id);
    if ((old?.batchId && old.dirty) || old?.conflict)
      throw Error(
        "Sincronize ou resolva a limpeza pendente antes de importar estes registros.",
      );
    const change = {
      id: summary.id,
      kind: summary.kind,
      payload: {
        ...summary.payload,
        sessions: legacy + remaining.length,
        removedSessionIds: remaining,
      },
    };
    const i = documents.findIndex((d) => d.id === summary.id);
    if (i < 0) documents.push(change);
    else documents[i] = change;
  }
}
