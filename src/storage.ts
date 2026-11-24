import { uid, assertPayloadSize, type Entity, type Kind } from "./domain.ts";
import { editEntity, acknowledge, mergeRemote } from "./merge.ts";
import { preflightImport } from "./import-validation.ts";
import {
  planCleanup,
  cleanupStep,
  restoreCleanup,
  type CleanupJob,
} from "./cleanup.ts";
type Change = { id: string; kind: Kind; payload: any; deleted?: boolean };
function sameRevisions(cached: Entity[], loaded: Entity[]) {
  if (cached.length !== loaded.length) return false;
  const byId = new Map(cached.map((d) => [d.id, d]));
  return loaded.every((d) => {
    const old = byId.get(d.id);
    return (
      old &&
      old.kind === d.kind &&
      old.version === d.version &&
      old.change_seq === d.change_seq &&
      old.localSeq === d.localSeq &&
      old.mutationId === d.mutationId &&
      old.deleted === d.deleted &&
      old.dirty === d.dirty &&
      old.batchId === d.batchId &&
      old.conflict?.version === d.conflict?.version &&
      old.conflict?.change_seq === d.conflict?.change_seq &&
      old.conflict?.mutationId === d.conflict?.mutationId
    );
  });
}
export class LocalStore {
  private db: IDBDatabase | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private channel: BroadcastChannel | null = null;
  private docsRevision: number | null = null;
  docs: Entity[] = [];
  cleanupJob: CleanupJob | null = null;
  readonly account: string;
  onChange: () => void = () => {};
  constructor(account: string) {
    this.account = account;
  }
  async open() {
    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("cadencia-" + this.account, 2);
      let blocked = false;
      r.onblocked = () => {
        blocked = true;
        reject(
          Error(
            "Feche outras abas do Cadência e toque em Tentar novamente para atualizar seus registros com segurança.",
          ),
        );
      };
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains("docs"))
          r.result.createObjectStore("docs", { keyPath: "id" });
        if (!r.result.objectStoreNames.contains("local"))
          r.result.createObjectStore("local");
      };
      r.onsuccess = () => {
        if (blocked) {
          r.result.close();
          return;
        }
        r.result.onversionchange = () => r.result.close();
        resolve(r.result);
      };
      r.onerror = () => reject(r.error);
    });
    await this.atomic(() => [], false);
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel("cadencia-" + this.account);
      this.channel.onmessage = () =>
        void this.atomic(() => [], false).then(() => this.onChange());
    }
    return this;
  }
  private atomic(
    transform: (docs: Entity[]) => Entity[],
    broadcast = true,
  ): Promise<Entity[]> {
    return this.transact((docs) => ({ changes: transform(docs) }), broadcast);
  }
  private transact(
    transform: (
      docs: Entity[],
      job: CleanupJob | null,
    ) => { changes: Entity[]; job?: CleanupJob },
    broadcast = true,
  ): Promise<Entity[]> {
    const task = async () => {
      if (!this.db) throw Error("Armazenamento indisponível.");
      let revision = 0;
      const result = await new Promise<Entity[]>((resolve, reject) => {
        const t = this.db!.transaction(["docs", "local"], "readwrite");
        const object = t.objectStore("docs");
        const read = object.getAll();
        const local = t.objectStore("local");
        const jobRead = local.get("cleanup");
        const revisionRead = local.get("docsRevision");
        let nextJob: CleanupJob | null = null;
        let result: Entity[] = [];
        let reason: unknown;
        revisionRead.onsuccess = () => {
          try {
            const all = read.result as Entity[];
            const update = transform(all, jobRead.result ?? null);
            const changed = update.changes;
            revision = revisionRead.result ?? 0;
            if (changed.some((e) => e !== all.find((d) => d.id === e.id))) {
              revision++;
              local.put(revision, "docsRevision");
            }
            nextJob = update.job ?? jobRead.result ?? null;
            if (update.job) local.put(update.job, "cleanup");
            for (const e of changed) {
              if (!e.deleted) assertPayloadSize(e.payload);
              object.put(e);
              const i = all.findIndex((d) => d.id === e.id);
              if (i < 0) all.push(e);
              else all[i] = e;
            }
            result = all;
          } catch (e) {
            reason = e;
            t.abort();
          }
        };
        t.oncomplete = () => {
          this.cleanupJob = nextJob;
          resolve(result);
        };
        t.onerror = () => reject(reason || t.error);
        t.onabort = () => reject(reason || t.error);
      });
      // Status-only sync notifications must not invalidate history indexes.
      if (this.docsRevision !== revision || !sameRevisions(this.docs, result))
        this.docs = result;
      this.docsRevision = revision;
      if (broadcast) this.channel?.postMessage("changed");
      this.onChange();
      return result;
    };
    const next = this.queue.then(task);
    this.queue = next.catch(() => {});
    return next;
  }
  async createCleanup(before: string, summaries: boolean) {
    await this.transact((docs, job) => {
      if (job && !["complete", "cancelled"].includes(job.status))
        throw Error("Continue ou cancele a limpeza anterior.");
      return { changes: [], job: planCleanup(docs, before, summaries) };
    });
  }
  async advanceCleanup(online: boolean) {
    await this.transact((docs, job) =>
      job ? cleanupStep(docs, job, online) : { changes: [] },
    );
  }
  async cancelCleanup() {
    await this.transact((_docs, job) =>
      job
        ? {
            changes: [],
            job: {
              ...job,
              status: "cancelled",
              message:
                "Restante cancelado. Lotes já registrados continuam aguardando confirmação. Recuperar detalhes já removidos exige um backup exportado antes da limpeza.",
            },
          }
        : { changes: [] },
    );
  }
  async recoverCleanup() {
    await this.transact((docs, job) => {
      if (!job) throw Error("Não há limpeza para restaurar.");
      return restoreCleanup(docs, job);
    });
  }
  async put(entity: Entity) {
    await this.atomic(() => [entity]);
    return entity;
  }
  async putMany(entities: Entity[]) {
    await this.atomic(() => entities);
  }
  async mutate(
    id: string,
    kind: Kind,
    payload: any,
    deleted = false,
    expectedPayload?: string | null,
  ) {
    let result!: Entity;
    await this.atomic((docs) => {
      const old = docs.find((d) => d.id === id);
      if (old && old.kind !== kind)
        throw Error("Não é possível alterar o tipo de um registro existente.");
      if (
        expectedPayload !== undefined &&
        (old ? JSON.stringify(old.payload) : null) !== expectedPayload
      )
        throw Error(
          "A ficha mudou em outro lugar. Baixe seu rascunho e recarregue a ficha antes de salvar.",
        );
      if (old?.batchId && old.dirty)
        throw Error(
          "Aguarde sincronizar a limpeza antes de alterar este registro.",
        );
      result = old
        ? editEntity(old, deleted ? {} : payload, deleted)
        : {
            id,
            kind,
            payload: deleted ? {} : payload,
            version: 0,
            change_seq: 0,
            deleted,
            dirty: true,
            localSeq: 1,
            mutationId: uid(),
          };
      return [result];
    });
    return result;
  }
  async batch(changes: Change[]) {
    if (changes.length > 10000)
      throw Error(
        "A limpeza aceita até 10.000 registros por vez. Escolha uma data mais antiga para remover um período menor e tente novamente.",
      );
    await this.atomic((docs) => {
      if (docs.some((d) => d.batchId && d.dirty))
        throw Error(
          "Sincronize ou resolva a limpeza anterior antes de iniciar outra.",
        );
      const batchId = uid();
      return changes.map((d) => {
        const old = docs.find((e) => e.id === d.id);
        if (old && old.kind !== d.kind)
          throw Error(
            "Não é possível alterar o tipo de um registro existente.",
          );
        return {
          ...(old
            ? editEntity(old, d.deleted ? {} : d.payload, !!d.deleted)
            : {
                ...d,
                payload: d.deleted ? {} : d.payload,
                version: 0,
                change_seq: 0,
                dirty: true,
                localSeq: 1,
                deleted: !!d.deleted,
                mutationId: uid(),
              }),
          batchId,
        } as Entity;
      });
    });
  }
  async importDocuments(input: unknown) {
    await this.atomic((docs) => {
      const documents = preflightImport(input, docs);
      const singletonBatch = uid();
      if (
        documents.filter((d) => d.kind === "plan" || d.kind === "profile")
          .length > 500
      )
        throw Error(
          "Há fichas ou perfis demais para uma substituição segura. Nenhum dado foi importado.",
        );
      return documents.map((d) => {
        const old = docs.find((e) => e.id === d.id);
        const updated = old
          ? editEntity(old, d.payload, !!d.deleted)
          : {
              ...d,
              version: 0,
              change_seq: 0,
              deleted: !!d.deleted,
              dirty: true,
              localSeq: 1,
              mutationId: uid(),
            };
        return d.kind === "plan" || d.kind === "profile"
          ? { ...updated, batchId: singletonBatch }
          : { ...updated, batchId: undefined };
      });
    });
  }
  async ack(sent: Entity, remote: Entity) {
    await this.atomic((docs) => {
      const current = docs.find((d) => d.id === sent.id);
      return current ? [acknowledge(current, sent, remote)] : [];
    });
  }
  async ackMany(sent: Entity[], remotes: Entity[]) {
    await this.atomic((docs) =>
      remotes.flatMap((r) => {
        const current = docs.find((d) => d.id === r.id),
          captured = sent.find((d) => d.id === r.id);
        return current && captured ? [acknowledge(current, captured, r)] : [];
      }),
    );
  }
  async merge(remotes: Entity[]) {
    await this.atomic((docs) =>
      remotes.map((r) =>
        mergeRemote(
          docs.find((d) => d.id === r.id),
          r,
        ),
      ),
    );
  }
  async markConflict(id: string, remote: Entity) {
    await this.atomic((docs) => {
      const d = docs.find((d) => d.id === id);
      return d ? [{ ...d, conflict: remote }] : [];
    });
  }
  close() {
    this.channel?.close();
    this.db?.close();
    this.db = null;
    this.docsRevision = null;
    this.docs = [];
  }
}
