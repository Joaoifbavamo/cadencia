import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readEditorDraft,
  writeEditorDraft,
  clearEditorDraft,
} from "../src/editor-draft.ts";
import { parseRoute, routeHash } from "../src/router.ts";
const plan = { id: "plan", name: "Rascunho", workouts: [] };
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
}
test("rascunho sobrevive nova leitura e fica isolado por conta", () => {
  const s = storage();
  writeEditorDraft("a", plan, null, s);
  assert.deepEqual(readEditorDraft("a", s)?.plan, plan);
  assert.equal(readEditorDraft("b", s), null);
  writeEditorDraft("b", { ...plan, name: "B" }, null, s);
  clearEditorDraft("a", s);
  assert.equal(readEditorDraft("a", s), null);
  assert.equal(readEditorDraft("b", s)?.plan.name, "B");
});
test("rascunho guarda base de conflito e aceita edição ainda inválida", () => {
  const s = storage();
  writeEditorDraft("a", { ...plan, name: "" }, '{"previous":true}', s);
  assert.equal(readEditorDraft("a", s)?.base, '{"previous":true}');
  assert.equal(readEditorDraft("a", s)?.plan.name, "");
  s.setItem(
    "cadencia-editor-draft-a",
    '{"version":1,"plan":{"workouts":null}}',
  );
  assert.equal(readEditorDraft("a", s), null);
});
test("todas as áreas e treino abrem por URL; recuperação permanece reservada", () => {
  for (const tab of [
    "Hoje",
    "Agenda",
    "Evolução",
    "Meu treino",
    "Instalar",
    "Ajustes",
  ])
    assert.deepEqual(parseRoute(routeHash({ tab, sessionId: null })), {
      tab,
      sessionId: null,
    });
  assert.deepEqual(parseRoute("#/treino/session%20one"), {
    tab: "Hoje",
    sessionId: "session one",
  });
  assert.equal(parseRoute("#access_token=x&type=recovery"), null);
  assert.equal(parseRoute("#/treino/%ZZ"), null);
});
