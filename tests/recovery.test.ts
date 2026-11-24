import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Run the real component's handlers with isolated hooks and auth. No account,
// password, email or recovery token ever reaches a service in these tests.
function harness(auth: Record<string, (...args: any[]) => Promise<any>>) {
  const source = readFileSync(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );
  const component = source.slice(source.indexOf("function Recovery("));
  const compiled = ts.transpileModule(component, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const states: any[] = [];
  let cursor = 0;
  let done = 0;
  const replaced: any[] = [];
  const React = {
    createElement: (type: any, props: any, ...children: any[]) => ({
      type,
      props: props ?? {},
      children: children.flat(),
    }),
  };
  const Recovery = new Function(
    "useState",
    "React",
    "supabase",
    "history",
    "location",
    "FormData",
    "Mark",
    "Check",
    compiled + ";return Recovery;",
  )(
    (initial: any) => {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [
        states[index],
        (value: any) => {
          states[index] = value;
        },
      ];
    },
    React,
    { auth },
    { replaceState: (...args: any[]) => replaced.push(args) },
    { origin: "https://example.test", pathname: "/cadencia/" },
    class {
      fields: any;
      constructor(fields: any) {
        this.fields = fields;
      }
      get(key: string) {
        return this.fields[key];
      }
    },
    "mark",
    "check",
  );
  const render = () => {
    cursor = 0;
    return Recovery({
      onDone: () => {
        done++;
      },
    });
  };
  const nodes = (tree: any): any[] =>
    tree && typeof tree === "object"
      ? [tree, ...tree.children.flatMap(nodes)]
      : [];
  const button = (label: string) =>
    nodes(render()).find(
      (node) =>
        node.type === "button" && JSON.stringify(node.children).includes(label),
    );
  const submit = (fields: any) =>
    nodes(render())
      .find((node) => node.type === "form")
      .props.onSubmit({ preventDefault() {}, currentTarget: fields });
  return { render, button, submit, replaced, done: () => done };
}

test("Recovery blocks duplicate saves and catches a rejected expired-link request", async () => {
  let reject!: (reason: Error) => void;
  let calls = 0;
  const h = harness({
    updateUser: () => {
      calls++;
      return new Promise((_resolve, fail) => {
        reject = fail;
      });
    },
  });
  const pending = h.submit({ password: "mock-password" });
  assert.equal(h.button("Salvando").props.disabled, true);
  await h.submit({ password: "mock-password" });
  assert.equal(calls, 1);
  reject(Error("expired"));
  await pending;
  assert.match(JSON.stringify(h.render()), /Solicite um novo link/);
  assert.equal(h.button("Salvar nova senha").props.disabled, false);
});

test("Recovery can request a fresh link without changing the password", async () => {
  const requests: any[] = [];
  const h = harness({
    resetPasswordForEmail: async (...args) => {
      requests.push(args);
      return { error: null };
    },
    updateUser: async () => {
      throw Error("must not update");
    },
  });
  h.button("Solicitar novo link").props.onClick();
  await h.submit({ email: "mock@example.test" });
  assert.deepEqual(requests, [
    ["mock@example.test", { redirectTo: "https://example.test/cadencia/" }],
  ]);
  assert.match(
    JSON.stringify(h.render()),
    /Se o endereço tiver uma conta autorizada/,
  );
  assert.equal(h.done(), 0);
});

test("Recovery returns to login only after local sign-out and clears the recovery URL", async () => {
  const scopes: any[] = [];
  const h = harness({
    signOut: async (scope) => {
      scopes.push(scope);
      return { error: null };
    },
  });
  await h.button("Voltar para entrar").props.onClick();
  assert.deepEqual(scopes, [{ scope: "local" }]);
  assert.equal(h.done(), 1);
  assert.deepEqual(h.replaced, [[null, "", "/cadencia/"]]);
});

test("Recovery reports a failed link request and permits another attempt", async () => {
  let calls = 0;
  const h = harness({
    resetPasswordForEmail: async () => {
      calls++;
      throw Error("offline");
    },
  });
  h.button("Solicitar novo link").props.onClick();
  await h.submit({ email: "mock@example.test" });
  assert.match(
    JSON.stringify(h.render()),
    /Não foi possível solicitar a recuperação/,
  );
  assert.equal(h.button("Enviar novo link").props.disabled, false);
  await h.submit({ email: "mock@example.test" });
  assert.equal(calls, 2);
});

test("Recovery does not claim exit on sign-out failure, and can save a valid new password", async () => {
  const failed = harness({
    signOut: async () => ({ error: Error("offline") }),
  });
  await failed.button("Voltar para entrar").props.onClick();
  assert.equal(failed.done(), 0);
  assert.match(
    JSON.stringify(failed.render()),
    /Não foi possível voltar para entrar/,
  );
  assert.equal(failed.button("Voltar para entrar").props.disabled, false);
  const saved: any[] = [];
  const success = harness({
    updateUser: async (values) => {
      saved.push(values);
      return { error: null };
    },
  });
  await success.submit({ password: "mock-new-password" });
  assert.deepEqual(saved, [{ password: "mock-new-password" }]);
  assert.equal(success.done(), 1);
});
