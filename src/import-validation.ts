import { validateImport, type Entity } from "./domain.ts";

export function preflightImport(input: unknown, existing: Entity[]) {
  const { documents } = validateImport(input);
  const combined = new Map(existing.map((d) => [d.id, d]));
  for (const d of documents) {
    const old = combined.get(d.id);
    if (old && old.kind !== d.kind)
      throw Error(
        "O backup tenta alterar o tipo de um registro existente. Nenhum dado foi importado.",
      );
    if (old?.batchId && old.dirty)
      throw Error(
        "Sincronize ou resolva a limpeza pendente antes de importar estes registros.",
      );
    if ((d.kind === "session" || d.kind === "plan") && d.payload.id !== d.id)
      throw Error(
        "O identificador do registro difere da identidade no conteúdo. Nenhum dado foi importado.",
      );
    combined.set(d.id, { ...d, deleted: false } as Entity);
  }
  for (const d of documents) {
    if (d.kind !== "set") continue;
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
  return documents;
}
