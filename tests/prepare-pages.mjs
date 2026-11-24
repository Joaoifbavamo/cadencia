import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { preparePages } from "../scripts/prepare-pages.mjs";

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "cadencia-pages-"));
const source = path.join(temporary, "dist");
const target = path.join(temporary, "docs");
const write = (relative, text = "preservar") => {
  const destination = path.join(temporary, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, text);
};
const exists = (relative) => fs.existsSync(path.join(target, relative));
const build = (generation) => {
  // Delete only files created by this fixture, never the actual build/docs.
  for (const name of fs.existsSync(path.join(source, "assets"))
    ? fs.readdirSync(path.join(source, "assets"))
    : [])
    fs.unlinkSync(path.join(source, "assets", name));
  write(
    "dist/index.html",
    `<script src='./assets/index-${generation}.js'></script>`,
  );
  write("dist/sw.js", `cache.addAll(["./assets/index-${generation}.js"]);`);
  write(`dist/assets/index-${generation}.js`, generation);
};
try {
  write("docs/sw.js", 'cache.addAll(["./assets/index-AAAAAAAA.js"]);');
  write("docs/assets/index-AAAAAAAA.js");
  write("docs/assets/index-STALE000.js");
  write("docs/assets/manual-12345678.pdf");
  write("docs/assets/custom.js");
  write("docs/superpowers/instructions.md");
  write("docs/report.pdf");
  write("outside/report.pdf");
  build("BBBBBBBB");
  const first = preparePages({ source, target });
  assert.deepEqual(first.previous, ["assets/index-AAAAAAAA.js"]);
  assert.deepEqual(first.removed, ["assets/index-STALE000.js"]);
  assert(exists("assets/index-AAAAAAAA.js"));
  assert(exists("assets/index-BBBBBBBB.js"));
  preparePages({ source, target });
  assert(
    exists("assets/index-AAAAAAAA.js"),
    "same build retains previous generation",
  );
  build("CCCCCCCC");
  preparePages({ source, target });
  assert(!exists("assets/index-AAAAAAAA.js"));
  assert(exists("assets/index-BBBBBBBB.js"));
  assert(exists("assets/index-CCCCCCCC.js"));
  for (const relative of [
    "assets/manual-12345678.pdf",
    "assets/custom.js",
    "superpowers/instructions.md",
    "report.pdf",
  ])
    assert.equal(
      fs.readFileSync(path.join(target, relative), "utf8"),
      "preservar",
    );
  assert.equal(
    fs.readFileSync(path.join(temporary, "outside/report.pdf"), "utf8"),
    "preservar",
  );
  assert(exists(".nojekyll"));
  write(
    "docs/.pages-assets.json",
    JSON.stringify({
      current: ["assets/../../outside/report.pdf"],
      previous: [],
    }),
  );
  assert.throws(() => preparePages({ source, target }), /Caminho inválido/);
  assert.throws(() => preparePages({ source, target: source }), /separadas/);
  console.log(
    "PASS preparação isolada: bootstrap pelo SW, duas gerações, repetição idempotente, remoção delimitada, PDFs/instruções preservados e caminhos inválidos rejeitados.",
  );
} finally {
  // mkdtemp returned this absolute, task-owned directory; no repository paths.
  assert(path.dirname(temporary) === path.resolve(os.tmpdir()));
  assert(path.basename(temporary).startsWith("cadencia-pages-"));
  fs.rmSync(temporary, { recursive: true, force: true });
}
