import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalStore } from "../src/storage.ts";
import { setIdentity } from "../src/domain.ts";
test("edição em voo permanece depois de ACK real no IndexedDB", async () => {
  const s = await new LocalStore(crypto.randomUUID()).open();
  await s.mutate("a", "set", { load: 20 });
  const sent = structuredClone(s.docs[0]);
  const editing = s.mutate("a", "set", { load: 24 });
  const ack = s.ack(sent, { ...sent, version: 1, payload: { load: 20 } });
  await Promise.all([editing, ack]);
  assert.equal(s.docs[0].payload.load, 24);
  assert.equal(s.docs[0].dirty, true);
  s.close();
});
test("dois stores da mesma conta observam edição anterior antes de escrever", async () => {
  const id = crypto.randomUUID();
  const a = await new LocalStore(id).open(),
    b = await new LocalStore(id).open();
  await a.mutate("x", "plan", { name: "A" });
  await b.mutate("x", "plan", { name: "B" });
  assert.equal(b.docs[0].localSeq, 2);
  await assert.rejects(() =>
    b.mutate("x", "plan", { name: "C" }, false, JSON.stringify({ name: "A" })),
  );
  a.close();
  b.close();
});
test("não permite segunda limpeza nem mover resumo de lote pendente", async () => {
  const s = await new LocalStore(crypto.randomUUID()).open();
  await s.batch([
    {
      id: "summary",
      kind: "summary",
      payload: { month: "2025-01", sessions: 1 },
    },
  ]);
  await assert.rejects(() =>
    s.batch([
      {
        id: "summary",
        kind: "summary",
        payload: { month: "2025-01", sessions: 2 },
      },
    ]),
  );
  s.close();
});
test("a mesma série recebe a mesma identidade nos dois aparelhos", async () => {
  assert.equal(await setIdentity("s", "e", 0), await setIdentity("s", "e", 0));
  assert.notEqual(
    await setIdentity("s", "e", 0),
    await setIdentity("s", "e", 1),
  );
});
