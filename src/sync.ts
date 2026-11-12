import type { Entity } from "./domain.ts";
import { uid } from "./domain.ts";
import { LocalStore } from "./storage.ts";
import { acknowledge, mergeRemote } from "./merge.ts";
import { supabase } from "./auth.ts";
const parameters = (d: Entity) => ({
  p_id: d.id,
  p_kind: d.kind,
  p_payload: d.payload,
  p_expected: d.version,
  p_mutation: d.mutationId,
  p_deleted: d.deleted,
});
export class SyncEngine {
  store: LocalStore;
  notify: () => void;
  running = false;
  stopped = false;
  error = "";
  cursor = 0;
  constructor(store: LocalStore, notify: () => void) {
    this.store = store;
    this.notify = notify;
  }
  async run() {
    if (
      this.running ||
      this.stopped ||
      !navigator.onLine ||
      this.store.account === "demo"
    )
      return;
    this.running = true;
    this.error = "";
    this.notify();
    try {
      const pending = [...this.store.docs].filter(
        (d) => d.dirty && !d.conflict,
      );
      const handled = new Set<string>();
      for (const sent of pending) {
        if (this.stopped) return;
        if (sent.batchId) {
          if (handled.has(sent.batchId)) continue;
          handled.add(sent.batchId);
          const batch = this.store.docs.filter(
            (d) => d.batchId === sent.batchId && d.dirty,
          );
          if (batch.some((d) => d.conflict)) continue;
          const { data, error } = await supabase.rpc("commit_batch", {
            p_changes: batch.map(parameters),
          });
          if (error) {
            await this.pull();
            throw error;
          }
          if (this.stopped) return;
          await this.store.ackMany(batch, data as Entity[]);
        } else {
          const { data, error } = await supabase.rpc(
            "commit_document",
            parameters(sent),
          );
          if (error) throw error;
          if (this.stopped) return;
          const current = this.store.docs.find((d) => d.id === sent.id)!;
          if (data.ok) await this.store.ack(sent, data.document);
          else if (data.remote)
            await this.store.markConflict(sent.id, data.remote);
          else throw Error("O registro mudou. Exporte os dados e recarregue.");
        }
        this.notify();
      }
      await this.pull();
    } catch (e) {
      this.error =
        e instanceof Error
          ? e.message
          : typeof (e as any)?.message === "string"
            ? (e as any).message
            : "Não foi possível sincronizar. Tente novamente.";
    } finally {
      this.running = false;
      if (!this.stopped) this.notify();
    }
  }
  async pull() {
    let cursor = this.cursor;
    while (!this.stopped) {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", this.store.account)
        .gt("change_seq", cursor)
        .order("change_seq")
        .limit(250);
      if (error) throw error;
      if (this.stopped || !data.length) break;
      await this.store.merge(data as Entity[]);
      cursor = Number(data[data.length - 1].change_seq);
      this.cursor = cursor;
      this.notify();
      if (data.length < 250) break;
    }
  }
  async resolve(id: string, local: boolean) {
    const current = this.store.docs.find((d) => d.id === id)!;
    const remote = current.conflict!;
    if (current.batchId) {
      if (local)
        throw Error(
          "Limpeza em conflito: baixe as versões e use a conta para cancelar a limpeza; depois refaça a prévia.",
        );
      const batch = this.store.docs.filter(
        (d) => d.batchId === current.batchId,
      );
      const remotes: Entity[] = [];
      for (let i = 0; i < batch.length; i += 100) {
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("user_id", this.store.account)
          .in(
            "id",
            batch.slice(i, i + 100).map((d) => d.id),
          );
        if (error) throw error;
        remotes.push(...(data as Entity[]));
      }
      await this.store.putMany(
        batch.map((d) => {
          const r = remotes.find((x) => x.id === d.id);
          return r
            ? { ...r, dirty: false, localSeq: d.localSeq, mutationId: uid() }
            : {
                ...d,
                dirty: false,
                deleted: true,
                conflict: undefined,
                batchId: undefined,
              };
        }),
      );
    } else
      await this.store.put(
        local
          ? {
              ...current,
              version: remote.version,
              change_seq: remote.change_seq,
              conflict: undefined,
              mutationId: uid(),
              dirty: true,
            }
          : {
              ...remote,
              dirty: false,
              localSeq: current.localSeq,
              mutationId: uid(),
            },
      );
    this.notify();
    void this.run();
  }
}
