import { uid, type Entity, type Kind } from "./domain.ts";
import { editEntity } from "./merge.ts";
export class LocalStore {
  private db: IDBDatabase | null = null;
  docs: Entity[] = [];
  readonly account: string;
  constructor(account: string) {
    this.account = account;
  }
  async open() {
    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("cadencia-" + this.account, 1);
      r.onupgradeneeded = () =>
        r.result.createObjectStore("docs", { keyPath: "id" });
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    this.docs = await new Promise((resolve, reject) => {
      const r = this.db!.transaction("docs").objectStore("docs").getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return this;
  }
  async put(entity: Entity) {
    await this.putMany([entity]);
    return entity;
  }
  async putMany(entities: Entity[]) {
    if (!this.db) throw Error("Armazenamento ainda não está pronto.");
    await new Promise<void>((resolve, reject) => {
      const t = this.db!.transaction("docs", "readwrite");
      for (const e of entities) t.objectStore("docs").put(e);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
    for (const e of entities) {
      const i = this.docs.findIndex((d) => d.id === e.id);
      if (i < 0) this.docs.push(e);
      else this.docs[i] = e;
    }
  }
  async mutate(id: string, kind: Kind, payload: any, deleted = false) {
    const old = this.docs.find((d) => d.id === id);
    const e = old
      ? editEntity(old, payload, deleted)
      : {
          id,
          kind,
          payload,
          version: 0,
          change_seq: 0,
          deleted,
          dirty: true,
          localSeq: 1,
          mutationId: uid(),
        };
    return this.put(e);
  }
  async batch(
    changes: { id: string; kind: Kind; payload: any; deleted?: boolean }[],
  ) {
    const batchId = uid();
    const entities = changes.map((d) => {
      const old = this.docs.find((e) => e.id === d.id);
      return {
        ...(old
          ? editEntity(old, d.payload, !!d.deleted)
          : {
              ...d,
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
    await this.putMany(entities);
  }
  close() {
    this.db?.close();
    this.db = null;
    this.docs = [];
  }
}
