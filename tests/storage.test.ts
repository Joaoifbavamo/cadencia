import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalStore } from "../src/storage.ts";
test("fila persiste após reabrir e isola contas", async () => {
  const a = await new LocalStore("a").open();
  await a.mutate("set", "set", { load: 30 });
  a.close();
  const reopened = await new LocalStore("a").open();
  assert.equal(reopened.docs[0].dirty, true);
  assert.equal(reopened.docs[0].payload.load, 30);
  const b = await new LocalStore("b").open();
  assert.equal(b.docs.length, 0);
  reopened.close();
  b.close();
});
