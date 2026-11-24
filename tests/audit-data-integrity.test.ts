import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalStore } from "../src/storage.ts";
import { demoPlan } from "../src/demo.ts";
import type { Entity } from "../src/domain.ts";

const backup = (documents: any[]) => ({
  format: "cadencia",
  version: 1,
  documents,
});
const entity = (
  kind: Entity["kind"],
  payload: any,
  id = crypto.randomUUID(),
): Entity => ({
  id,
  kind,
  payload,
  version: 1,
  change_seq: 1,
  deleted: false,
  dirty: false,
  mutationId: crypto.randomUUID(),
  localSeq: 0,
});
const session = () => {
  const id = crypto.randomUUID();
  return entity(
    "session",
    {
      id,
      planId: demoPlan.id,
      workout: { ...structuredClone(demoPlan.workouts[0]), exercises: [] },
      actualDate: "2020-01-01",
      plannedDate: "2020-01-01",
      startedAt: "2020-01-01T12:00:00Z",
      finishedAt: "2020-01-01T13:00:00Z",
      skipped: {},
    },
    id,
  );
};
const ackPending = async (store: LocalStore) => {
  const pending = store.docs.filter((d) => d.dirty);
  await store.ackMany(
    pending,
    pending.map((d) => ({
      ...d,
      version: d.version + 1,
      change_seq: d.change_seq + 1,
    })),
  );
};
const withStore = async (fn: (s: LocalStore) => Promise<void>) => {
  const s = await new LocalStore(crypto.randomUUID()).open();
  try {
    await fn(s);
  } finally {
    s.close();
  }
};

test("oversized writes roll back a whole transaction including valid siblings", () =>
  withStore(async (s) => {
    await s.put(entity("activity", { minutes: 10 }));
    const before = structuredClone(s.docs);
    await assert.rejects(
      s.putMany([
        entity("activity", { minutes: 20 }),
        entity("activity", { notes: "ç".repeat(600000) }),
      ]),
      /grande|limite|900|tamanho/i,
    );
    assert.deepEqual(s.docs, before);
    const reopened = await new LocalStore(s.account).open();
    try {
      assert.deepEqual(reopened.docs, before);
    } finally {
      reopened.close();
    }
  }));

test("backup-only entity metadata cannot inject a deletion or conflict", () =>
  withStore(async (s) => {
    const source = entity("activity", {
      date: "2020-01-01",
      name: "Walk",
      notes: "",
      minutes: 10,
    });
    await s.importDocuments(
      backup([{ ...source, deleted: true, conflict: source }]),
    );
    assert.equal(s.docs[0].deleted, false);
    assert.equal(s.docs[0].conflict, undefined);
  }));

for (const deleted of [false, true])
  for (const batch of [false, true]) {
    test(`late ${batch ? "batch" : "single"} receipt preserves pulled v3${deleted ? " tombstone" : ""} across tabs`, async () => {
      const account = crypto.randomUUID();
      const a = await new LocalStore(account).open(),
        b = await new LocalStore(account).open();
      try {
        const base = entity("activity", {
          date: "2020-01-01",
          name: "Walk",
          notes: "",
          minutes: 10,
        });
        await a.put(base);
        const sent = await a.mutate(base.id, "activity", {
          ...base.payload,
          minutes: 20,
        });
        const receipt = { ...sent, version: 2, change_seq: 2 };
        await a.ack(sent, receipt);
        const newer = {
          ...receipt,
          payload: deleted ? {} : { ...base.payload, minutes: 30 },
          version: 3,
          change_seq: 3,
          deleted,
        };
        await a.merge([newer]);
        if (batch) await b.ackMany([sent], [receipt]);
        else await b.ack(sent, receipt);
        const current = b.docs.find((d) => d.id === base.id)!;
        assert.equal(current.version, 3);
        assert.equal(current.change_seq, 3);
        assert.equal(current.deleted, deleted);
        assert.deepEqual(current.payload, newer.payload);
        assert.equal(current.dirty, false);
      } finally {
        a.close();
        b.close();
      }
    });
  }
test("receipt requires mutation identity as well as local sequence", () =>
  withStore(async (s) => {
    const base = entity("activity", {});
    const sent = { ...base, dirty: true, localSeq: 1 };
    const current = {
      ...sent,
      mutationId: crypto.randomUUID(),
      payload: { edited: true },
    };
    await s.put(current);
    await s.ack(sent, { ...sent, version: 2, change_seq: 2 });
    assert.equal(s.docs[0].dirty, true);
    assert.equal(s.docs[0].mutationId, current.mutationId);
    assert.deepEqual(s.docs[0].payload, current.payload);
  }));
test("receipt cannot regress change sequence or erase an edit during flight", () =>
  withStore(async (s) => {
    const base = entity("activity", {});
    await s.put(base);
    const sent = await s.mutate(base.id, "activity", { minutes: 20 });
    const edited = await s.mutate(base.id, "activity", { minutes: 30 });
    await s.ack(sent, { ...sent, version: 2, change_seq: 2 });
    assert.equal(s.docs[0].version, 2);
    assert.equal(s.docs[0].dirty, true);
    assert.equal(s.docs[0].mutationId, edited.mutationId);
    await s.ack(edited, { ...edited, version: 3, change_seq: 1 });
    assert.equal(s.docs[0].version, 2);
    assert.equal(s.docs[0].payload.minutes, 30);
  }));

test("an empty or stale pull keeps the docs reference while another tab's write replaces it", () =>
  withStore(async (s) => {
    const original = entity("activity", { minutes: 10 });
    await s.put(original);
    const before = s.docs;
    await s.merge([]);
    assert.equal(s.docs, before);
    await s.merge([original]);
    assert.equal(s.docs, before);
    const other = await new LocalStore(s.account).open();
    try {
      await other.mutate(original.id, "activity", { minutes: 20 });
      await s.merge([]);
      assert.notEqual(s.docs, before);
      assert.equal(s.docs[0].payload.minutes, 20);
    } finally {
      other.close();
    }
  }));

test("the receipt clears a matching in-flight pull conflict but preserves a newer remote conflict", () =>
  withStore(async (s) => {
    const original = entity("activity", { minutes: 10 });
    await s.put(original);
    const sent = await s.mutate(original.id, "activity", { minutes: 20 });
    const receipt = { ...sent, version: 2, change_seq: 2 };
    await s.merge([receipt]);
    assert.ok(s.docs[0].conflict);
    await s.ack(sent, receipt);
    assert.equal(s.docs[0].dirty, false);
    assert.equal(s.docs[0].conflict, undefined);
    const next = await s.mutate(original.id, "activity", { minutes: 30 });
    await s.merge([
      { ...next, version: 4, change_seq: 4, deleted: true, payload: {} },
    ]);
    await s.ack(next, { ...next, version: 3, change_seq: 3 });
    assert.equal(s.docs[0].dirty, true);
    assert.equal(s.docs[0].conflict?.version, 4);
    assert.equal(s.docs[0].conflict?.deleted, true);
  }));

test("import activates the replacement singleton, preserves settings and immutable sessions after reopen", () =>
  withStore(async (s) => {
    const id = crypto.randomUUID(),
      original = { ...structuredClone(demoPlan), id, name: "A" };
    const prior = session(),
      settings = entity("profile", {
        barWeight: 20,
        increment: 2.5,
        timezone: "America/Sao_Paulo",
      });
    await s.putMany([entity("plan", original, id), prior, settings]);
    const incomingId = crypto.randomUUID();
    const replacement = {
      ...structuredClone(demoPlan),
      id: incomingId,
      name: "B",
    };
    const importedSession = session();
    importedSession.payload.planId = incomingId;
    await s.importDocuments(
      backup([
        { id: incomingId, kind: "plan", payload: replacement },
        importedSession,
      ]),
    );
    const reopened = await new LocalStore(s.account).open();
    try {
      const plans = reopened.docs.filter(
        (d) => d.kind === "plan" && !d.deleted,
      );
      assert.equal(plans.length, 1);
      assert.equal(plans[0].payload.name, "B");
      assert.equal(plans[0].id, id);
      assert.equal(plans[0].payload.id, id);
      assert.deepEqual(
        reopened.docs.find((d) => d.id === prior.id),
        prior,
      );
      assert.deepEqual(
        reopened.docs.find((d) => d.id === settings.id),
        settings,
      );
      assert.equal(replacement.id, incomingId);
      assert.deepEqual(
        reopened.docs.find((d) => d.id === importedSession.id)?.payload,
        importedSession.payload,
      );
    } finally {
      reopened.close();
    }
  }));
test("import replaces a profile, retires duplicate active singletons and rejects ambiguous backup atomically", () =>
  withStore(async (s) => {
    const payload = {
      barWeight: 20,
      increment: 2.5,
      timezone: "America/Sao_Paulo",
    };
    const one = entity("profile", payload),
      two = entity("profile", payload);
    await s.putMany([one, two]);
    await s.importDocuments(
      backup([
        {
          id: crypto.randomUUID(),
          kind: "profile",
          payload: { ...payload, increment: 5 },
        },
      ]),
    );
    const active = s.docs.filter((d) => d.kind === "profile" && !d.deleted);
    assert.equal(active.length, 1);
    assert.equal(active[0].payload.increment, 5);
    assert.equal(new Set(s.docs.map((d) => d.batchId)).size, 1);
    const before = structuredClone(s.docs);
    await assert.rejects(
      s.importDocuments(
        backup([
          { id: crypto.randomUUID(), kind: "profile", payload },
          { id: crypto.randomUUID(), kind: "profile", payload },
        ]),
      ),
      /várias fichas|único perfil/,
    );
    assert.deepEqual(s.docs, before);
  }));

test("cleanup and partial/full restore reconcile tracked identities exactly once through repeated exports", () =>
  withStore(async (s) => {
    const originals = [session(), session(), session()];
    await s.putMany(originals);
    await s.createCleanup("2021-01-01", true);
    await s.advanceCleanup(true);
    await ackPending(s);
    const summary = () => s.docs.find((d) => d.kind === "summary")!;
    assert.equal(summary().payload.removedSessionIds.length, 3);
    await s.importDocuments(backup([originals[0]]));
    assert.equal(summary().payload.sessions, 2);
    assert.equal(
      summary().payload.removedSessionIds.includes(originals[0].id),
      false,
    );
    await ackPending(s);
    const exported = backup(
      s.docs
        .filter((d) => !d.deleted)
        .map(({ id, kind, payload }) => ({ id, kind, payload })),
    );
    await s.importDocuments(exported);
    assert.equal(summary().payload.sessions, 2);
    await ackPending(s);
    await s.importDocuments(backup(originals));
    assert.equal(summary().payload.sessions, 0);
    assert.equal(
      s.docs.filter((d) => d.kind === "session" && !d.deleted).length,
      3,
    );
    assert.deepEqual(summary().payload.removedSessionIds, []);
  }));
test("restoring known IDs preserves legacy aggregates but uncertain legacy restores abort the entire import", () =>
  withStore(async (s) => {
    const restored = session(),
      unknown = session();
    const summary = entity("summary", {
      month: "2020-01",
      sessions: 4,
      removedSessionIds: [restored.id],
    });
    await s.putMany([
      { ...restored, deleted: true, payload: {} },
      { ...unknown, deleted: true, payload: {} },
      summary,
    ]);
    await s.importDocuments(backup([restored]));
    assert.equal(s.docs.find((d) => d.id === summary.id)?.payload.sessions, 3);
    await ackPending(s);
    const before = structuredClone(s.docs);
    await assert.rejects(
      s.importDocuments(backup([unknown])),
      /resumo antigo|restaure/i,
    );
    assert.deepEqual(s.docs, before);
  }));
test("summary import merges tracked provenance across IDs and does not overwrite a newer partial summary", () =>
  withStore(async (s) => {
    const a = session(),
      b = session();
    const existing = entity("summary", {
      month: "2020-01",
      sessions: 2,
      removedSessionIds: [a.id, b.id],
    });
    await s.putMany([
      existing,
      { ...a, deleted: true, payload: {} },
      { ...b, deleted: true, payload: {} },
    ]);
    await s.importDocuments(
      backup([
        a,
        entity("summary", {
          month: "2020-01",
          sessions: 1,
          removedSessionIds: [a.id],
        }),
      ]),
    );
    const summaries = s.docs.filter((d) => d.kind === "summary" && !d.deleted);
    assert.equal(summaries.length, 1);
    assert.equal(summaries[0].payload.sessions, 1);
    assert.deepEqual(summaries[0].payload.removedSessionIds, [b.id]);
  }));
test("a legacy summary restored into a fresh store with overlapping sessions is rejected", () =>
  withStore(async (s) => {
    await assert.rejects(
      s.importDocuments(
        backup([
          session(),
          entity("summary", { month: "2020-01", sessions: 1 }),
        ]),
      ),
      /resumo antigo/,
    );
    assert.equal(s.docs.length, 0);
  }));

test("old tabs without revision counter remain visible while no-op pulls keep references", () => withStore(async s => {
  const original = entity("activity", {date:"2026-11-23",name:"Cardio",minutes:10,notes:""});
  await s.putMany([original]);
  const before = s.docs;
  await s.merge([]); assert.equal(s.docs,before);
  const db = (s as any).db as IDBDatabase;
  await new Promise<void>((resolve,reject) => { const tx=db.transaction("docs","readwrite"); tx.objectStore("docs").put({...original,payload:{...original.payload,minutes:20},localSeq:1,mutationId:crypto.randomUUID(),dirty:true});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error); });
  await s.merge([]); assert.equal(s.docs[0].payload.minutes,20);assert.notEqual(s.docs,before);
}));
