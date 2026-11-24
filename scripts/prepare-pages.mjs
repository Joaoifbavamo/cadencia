import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Only hashed build files inside assets/ are eligible for pruning. Documents,
// PDFs, instructions and every other directory are deliberately outside it.
const generatedAsset =
  /(?:^|\/)[^/]+-[A-Za-z0-9_-]{8}\.(?:js|css|woff2?|ttf|otf|png|jpe?g|svg|webp|avif|gif)$/;
const manifestName = ".pages-assets.json";
function listFiles(directory, prefix = "") {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix + entry.name;
    if (entry.isSymbolicLink())
      throw Error("Links simbólicos não são permitidos no pacote: " + relative);
    return entry.isDirectory()
      ? listFiles(path.join(directory, entry.name), relative + "/")
      : [relative];
  });
}
function assetPaths(values) {
  if (!Array.isArray(values)) throw Error("Manifesto de assets inválido");
  return values.map((value) => {
    if (
      typeof value !== "string" ||
      !value.startsWith("assets/") ||
      value.includes("\\") ||
      value.split("/").some((part) => part === ".." || part === "." || !part)
    )
      throw Error("Caminho inválido no manifesto de assets");
    return value;
  });
}
function previousShellAssets(target) {
  const worker = path.join(target, "sw.js");
  if (!fs.existsSync(worker)) return [];
  // Bootstrap existing deployments from the explicit precache list, never
  // treating the accumulated directory as one enormous previous generation.
  return assetPaths(
    [
      ...fs
        .readFileSync(worker, "utf8")
        .matchAll(/["']\.\/(assets\/[^"']+)["']/g),
    ].map((match) => match[1]),
  );
}
const equal = (a, b) =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

export function preparePages({ source = "dist", target = "docs" } = {}) {
  source = path.resolve(source);
  target = path.resolve(target);
  if (
    source === target ||
    source.startsWith(target + path.sep) ||
    target.startsWith(source + path.sep)
  )
    throw Error("As pastas de origem e destino precisam ser separadas");
  for (const directory of [source, target]) {
    if (fs.existsSync(directory) && fs.lstatSync(directory).isSymbolicLink())
      throw Error("Links simbólicos não são permitidos nas pastas do pacote");
  }
  const files = listFiles(source);
  if (!files.includes("index.html") || !files.includes("sw.js"))
    throw Error("Build incompleto: index.html e sw.js são obrigatórios");
  // Inspect before mutation, rejecting symlinks even in an existing assets tree.
  const existingAssets = listFiles(target).filter((file) =>
    file.startsWith("assets/"),
  );
  const current = files.filter((file) => file.startsWith("assets/"));
  const manifestPath = path.join(target, manifestName);
  const old = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    : { current: previousShellAssets(target), previous: [] };
  const oldCurrent = assetPaths(old.current);
  const oldPrevious = assetPaths(old.previous);
  // Repeating the same preparation must not discard the retained generation.
  const previous = equal(current, oldCurrent) ? oldPrevious : oldCurrent;
  const retained = new Set([...current, ...previous]);
  for (const file of files) {
    const destination = path.join(target, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(source, file), destination);
  }
  const removed = existingAssets.filter(
    (file) => generatedAsset.test(file) && !retained.has(file),
  );
  for (const file of removed) fs.unlinkSync(path.join(target, file));
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ current, previous }, null, 2) + "\n",
  );
  fs.writeFileSync(path.join(target, ".nojekyll"), "");
  return { current, previous, removed };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = preparePages();
  console.log(
    `Site estático preparado em docs/: ${result.current.length} assets atuais, ${result.previous.length} da geração anterior; ${result.removed.length} antigos removidos.`,
  );
}
