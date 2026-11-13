import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalStore } from "../src/storage.ts";
import { demoPlan } from "../src/demo.ts";

const backup = (documents: any[]) => ({
  format: "cadencia",
  version: 1,
  documents,
});
const activity = () => ({
  date: "2026-11-13",
  name: "Caminhada",
  minutes: 20,
  notes: "",
});
const profile = {
  barWeight: 20,
  increment: 2.5,
  timezone: "America/Sao_Paulo",
};
const session = (id: string) => ({
  id,
  planId: demoPlan.id,
  workout: structuredClone(demoPlan.workouts[0]),
  actualDate: "2026-11-13",
  plannedDate: "2026-11-13",
  startedAt: "2026-11-13T12:00:00Z",
  skipped: {},
});
const withStore = async (fn: (store: LocalStore) => Promise<void>) => {
  const store = await new LocalStore(crypto.randomUUID()).open();
  try {
    await fn(store);
  } finally {
    store.close();
  }
};

test("mutate and batch reject kind changes without altering any records", () =>
  withStore(async (s) => {
    const id = crypto.randomUUID();
    await s.mutate(id, "plan", demoPlan);
    const before = structuredClone(s.docs);
    await assert.rejects(s.mutate(id, "profile", profile), /tipo/i);
    await assert.rejects(
      s.batch([
        { id: crypto.randomUUID(), kind: "activity", payload: activity() },
        { id, kind: "profile", payload: profile },
      ]),
      /tipo/i,
    );
    assert.deepEqual(s.docs, before);
  }));

test("oversized cleanup fails before any local tombstones are written", () =>
  withStore(async (s) => {
    await assert.rejects(
      s.batch(
        Array.from({ length: 10001 }, () => ({
          id: crypto.randomUUID(),
          kind: "activity" as const,
          payload: activity(),
          deleted: true,
        })),
      ),
      /10.000|10000/,
    );
    assert.equal(s.docs.length, 0);
  }));

test("import preflights all kind collisions and preserves existing data", () =>
  withStore(async (s) => {
    const id = crypto.randomUUID();
    await s.mutate(id, "plan", demoPlan);
    const before = structuredClone(s.docs);
    await assert.rejects(
      s.importDocuments(
        backup([
          { id: crypto.randomUUID(), kind: "activity", payload: activity() },
          { id, kind: "profile", payload: profile },
        ]),
      ),
      /tipo/i,
    );
    assert.deepEqual(s.docs, before);
  }));

test("import rejects mismatched session IDs and orphan set parents atomically", () =>
  withStore(async (s) => {
    const id = crypto.randomUUID();
    await assert.rejects(
      s.importDocuments(
        backup([
          { id: crypto.randomUUID(), kind: "activity", payload: activity() },
          { id, kind: "session", payload: session(crypto.randomUUID()) },
        ]),
      ),
      /identidade|identificador/i,
    );
    await assert.rejects(
      s.importDocuments(
        backup([
          {
            id: crypto.randomUUID(),
            kind: "set",
            payload: {
              sessionId: id,
              exerciseId: "e",
              index: 0,
              load: 20,
              reps: 8,
              rir: null,
              machine: "",
            },
          },
        ]),
      ),
      /sessão/i,
    );
    assert.equal(s.docs.length, 0);
  }));

test("atomic import supports series before their session and retains archive metadata", () =>
  withStore(async (s) => {
    const id = crypto.randomUUID(),
      p = { ...session(id), archivedAt: "2026-11-13T13:00:00Z" };
    await s.importDocuments(
      backup([
        {
          id: crypto.randomUUID(),
          kind: "set",
          payload: {
            sessionId: id,
            exerciseId: p.workout.exercises[0].id,
            index: 0,
            load: 20,
            reps: 8,
            rir: null,
            machine: "",
          },
        },
        { id, kind: "session", payload: p },
      ]),
    );
    assert.equal(s.docs.length, 2);
    assert.equal(
      s.docs.find((d) => d.id === id)?.payload.archivedAt,
      p.archivedAt,
    );
    assert.ok(s.docs.every((d) => d.dirty && !d.batchId));
  }));

test("import rejects duplicate logical series before writing its session", () =>
  withStore(async (s) => {
    const id = crypto.randomUUID(),
      p = session(id);
    const payload = {
      sessionId: id,
      exerciseId: p.workout.exercises[0].id,
      index: 0,
      load: 20,
      reps: 8,
      rir: null,
      machine: "",
    };
    await assert.rejects(
      s.importDocuments(
        backup([
          { id, kind: "session", payload: p },
          { id: crypto.randomUUID(), kind: "set", payload },
          { id: crypto.randomUUID(), kind: "set", payload },
        ]),
      ),
      /repete uma série/i,
    );
    assert.equal(s.docs.length, 0);
  }));

test("import cannot overwrite a pending cleanup and rolls back unrelated entries", () =>
  withStore(async (s) => {
    const id = crypto.randomUUID();
    await s.batch([
      { id, kind: "activity", payload: activity(), deleted: true },
    ]);
    const before = structuredClone(s.docs);
    await assert.rejects(
      s.importDocuments(
        backup([
          { id: crypto.randomUUID(), kind: "activity", payload: activity() },
          { id, kind: "activity", payload: activity() },
        ]),
      ),
      /limpeza pendente/i,
    );
    assert.deepEqual(s.docs, before);
  }));
