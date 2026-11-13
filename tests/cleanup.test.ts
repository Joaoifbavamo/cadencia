import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalStore } from "../src/storage.ts";
import { singletonIdentity } from "../src/singleton.ts";
import { cleanupStep, planCleanup } from "../src/cleanup.ts";
import type { Entity } from "../src/domain.ts";

const entity = (id: string, kind: Entity["kind"], payload: any): Entity => ({
  id,
  kind,
  payload,
  version: 1,
  change_seq: 1,
  deleted: false,
  dirty: false,
  mutationId: id,
  localSeq: 0,
});
const history = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    entity(`s${i}`, "session", {
      actualDate: "2020-01-01",
      finishedAt: "2020-01-01",
      workout: { exercises: [] },
    }),
  );
test("cleanup persists bounded progress, waits for acknowledgements and cancels remaining work", async () => {
  const account = crypto.randomUUID();
  let store = await new LocalStore(account).open();
  await store.putMany(history(1100));
  await store.createCleanup("2021-01-01", true);
  await store.advanceCleanup(false);
  assert.equal(store.docs.filter((d) => d.deleted).length, 0);
  await store.advanceCleanup(true);
  const pending = store.docs.filter((d) => d.dirty);
  assert.equal(pending.length, 500);
  assert.equal(
    pending.filter((d) => d.kind === "summary")[0].payload.sessions,
    499,
  );
  await store.advanceCleanup(true);
  assert.equal(store.docs.filter((d) => d.dirty).length, 500);
  store.close();
  store = await new LocalStore(account).open();
  assert.equal(store.cleanupJob?.processed, 499);
  await store.cancelCleanup();
  assert.equal(store.cleanupJob?.status, "cancelled");
  assert.equal(store.docs.filter((d) => d.deleted).length, 499);
  store.close();
});
test("concurrent tabs claim one chunk, preserve whole sessions and newly changed data", async () => {
  const account = crypto.randomUUID(),
    a = await new LocalStore(account).open(),
    b = await new LocalStore(account).open();
  await a.putMany([...history(2), entity("set", "set", { sessionId: "s0" })]);
  await a.createCleanup("2021-01-01", true);
  await b.mutate("s1", "session", {
    actualDate: "2020-01-01",
    finishedAt: "2020",
    workout: { exercises: [] },
    notes: "new",
  });
  await a.advanceCleanup(true);
  assert.equal(a.docs.filter((d) => d.deleted).length, 0);
  const changed = b.docs.find((d) => d.id === "s1")!;
  await b.ack(changed, { ...changed, version: 2 });
  await Promise.all([a.advanceCleanup(true), b.advanceCleanup(true)]);
  await a.advanceCleanup(true);
  assert.equal(a.docs.find((d) => d.id === "s0")?.deleted, true);
  assert.equal(a.docs.find((d) => d.id === "set")?.deleted, true);
  assert.equal(a.docs.find((d) => d.id === "s1")?.deleted, false);
  assert.equal(a.docs.find((d) => d.kind === "summary")?.payload.sessions, 1);
  a.close();
  b.close();
});
test("new singleton identities agree across devices and are isolated per account", async () => {
  assert.equal(
    await singletonIdentity("a", "plan"),
    await singletonIdentity("a", "plan"),
  );
  assert.notEqual(
    await singletonIdentity("a", "plan"),
    await singletonIdentity("b", "plan"),
  );
  assert.notEqual(
    await singletonIdentity("a", "plan"),
    await singletonIdentity("a", "profile"),
  );
});
test("cleanup preserves drafts, latest references, new sets and unrelated records across restart", async () => {
  const store = await new LocalStore(crypto.randomUUID()).open();
  const exercise = {
    id: "ex",
    name: "Agachamento",
    unit: "bar",
    min: 8,
    max: 12,
    machine: "",
  };
  const docs = history(4);
  docs[0].payload.workout.exercises = [exercise];
  docs[1].payload.workout.exercises = [exercise];
  docs[1].payload.actualDate = "2020-02-01";
  delete docs[2].payload.finishedAt;
  await store.putMany([
    ...docs,
    entity("set0", "set", { sessionId: "s0", exerciseId: "ex", index: 0 }),
    entity("set1", "set", { sessionId: "s1", exerciseId: "ex", index: 0 }),
    entity("plan", "plan", {}),
  ]);
  await store.createCleanup("2021-01-01", false);
  // Another device adds a set after the preview; the entire session must survive.
  await store.put(
    entity("added", "set", { sessionId: "s0", exerciseId: "ex", index: 1 }),
  );
  await store.advanceCleanup(true);
  assert.equal(store.docs.find((d) => d.id === "s0")?.deleted, false);
  assert.equal(store.docs.find((d) => d.id === "s1")?.deleted, false);
  assert.equal(store.docs.find((d) => d.id === "s2")?.deleted, false);
  assert.equal(store.docs.find((d) => d.id === "s3")?.deleted, true);
  assert.equal(store.docs.find((d) => d.id === "plan")?.deleted, false);
  store.close();
});
test("summaries count exactly once after bounded chunks are acknowledged", async () => {
  const store = await new LocalStore(crypto.randomUUID()).open();
  await store.putMany(history(1100));
  await store.createCleanup("2021-01-01", true);
  for (let i = 0; i < 4; i++) {
    await store.advanceCleanup(true);
    const pending = store.docs.filter((d) => d.dirty);
    assert.ok(pending.length <= 500);
    await store.ackMany(
      pending,
      pending.map((d) => ({ ...d, version: d.version + 1 })),
    );
  }
  assert.equal(store.cleanupJob?.status, "complete");
  assert.equal(store.docs.filter((d) => d.kind === "summary").length, 1);
  assert.equal(
    store.docs.find((d) => d.kind === "summary")?.payload.sessions,
    1100,
  );
  assert.equal(
    store.docs.filter((d) => d.kind === "session" && d.deleted).length,
    1100,
  );
  store.close();
});
test("same singleton ID uses existing local compare-and-set to protect concurrent creation", async () => {
  const account = crypto.randomUUID(),
    a = await new LocalStore(account).open(),
    b = await new LocalStore(account).open();
  const id = await singletonIdentity(account, "profile");
  const result = await Promise.allSettled([
    a.mutate(id, "profile", { barWeight: 20 }, false, null),
    b.mutate(id, "profile", { barWeight: 15 }, false, null),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(result.filter((r) => r.status === "rejected").length, 1);
  a.close();
  b.close();
});
test("existing version-one database upgrades without rewriting private records", async () => {
  const account = crypto.randomUUID(),
    original = entity("legacy-profile", "profile", {
      barWeight: 20,
      increment: 2.5,
      timezone: "America/Sao_Paulo",
    });
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("cadencia-" + account, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("docs", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("docs", "readwrite");
    tx.objectStore("docs").put(original);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  const store = await new LocalStore(account).open();
  assert.deepEqual(store.docs, [original]);
  assert.equal(store.cleanupJob, null);
  store.close();
});
test("history over ten thousand records plans safely and prepares only a bounded chunk", () => {
  const docs = history(10001),
    plan = planCleanup(docs, "2021-01-01", true);
  const result = cleanupStep(docs, plan, true);
  assert.equal(plan.total, 10001);
  assert.equal(result.changes.length, 500);
  assert.equal(result.job.processed, 499);
  assert.equal(docs.filter((d) => d.deleted).length, 0);
});
test("last cleanup chunk restores details and monthly count only after acknowledgement", async () => {
  const store = await new LocalStore(crypto.randomUUID()).open();
  const originals = [
    ...history(2),
    entity("summary", "summary", { month: "2020-01", sessions: 3 }),
  ];
  await store.putMany(originals);
  await store.createCleanup("2021-01-01", true);
  await store.advanceCleanup(true);
  await assert.rejects(() => store.recoverCleanup(), /Sincronize/);
  const pending = store.docs.filter((d) => d.dirty);
  await store.ackMany(
    pending,
    pending.map((d) => ({ ...d, version: d.version + 1 })),
  );
  store.close();
  const reopened = await new LocalStore(store.account).open();
  await reopened.recoverCleanup();
  assert.equal(reopened.cleanupJob?.status, "cancelled");
  assert.equal(reopened.cleanupJob?.recovery, undefined);
  assert.equal(reopened.docs.find((d) => d.id === "s0")?.deleted, false);
  assert.equal(
    reopened.docs.find((d) => d.id === "summary")?.payload.sessions,
    3,
  );
  assert.equal(reopened.docs.filter((d) => d.dirty).length, 3);
  reopened.close();
});
test("recovery refuses to overwrite a remotely edited summary or detail", async () => {
  const store = await new LocalStore(crypto.randomUUID()).open();
  await store.putMany(history(2));
  await store.createCleanup("2021-01-01", true);
  await store.advanceCleanup(true);
  const pending = store.docs.filter((d) => d.dirty);
  await store.ackMany(
    pending,
    pending.map((d) => ({ ...d, version: d.version + 1 })),
  );
  const summary = store.docs.find((d) => d.kind === "summary")!;
  await store.put({
    ...summary,
    payload: { ...summary.payload, sessions: 99 },
    version: summary.version + 1,
  });
  await assert.rejects(() => store.recoverCleanup(), /mudou/);
  assert.equal(store.docs.find((d) => d.id === "s0")?.deleted, true);
  store.close();
});
test("blocked database upgrade gives an actionable error instead of endless loading", async () => {
  const account = crypto.randomUUID();
  const blocker = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("cadencia-" + account, 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("docs", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  const opening = new LocalStore(account).open();
  try {
    await assert.rejects(
      () =>
        Promise.race([
          opening,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(Error("Sem aviso de atualização bloqueada")),
              100,
            ),
          ),
        ]),
      /Feche.*abas/,
    );
  } finally {
    blocker.close();
    void opening.then(
      (s) => s.close(),
      () => {},
    );
  }
});
