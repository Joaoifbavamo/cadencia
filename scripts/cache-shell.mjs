import fs from "node:fs";
import path from "node:path";
const list = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? list(path.join(dir, e.name))
      : [
          path
            .join(dir, e.name)
            .replaceAll("\\", "/")
            .replace(/^dist\//, "./"),
        ],
  );
const assets = list("dist/assets");
const worker = fs.readFileSync("dist/sw.js", "utf8");
const version = assets.map((p) => path.basename(p)).join("-");
fs.writeFileSync(
  "dist/sw.js",
  worker
    .replace(
      'const CACHE = "cadencia-shell-v1";',
      "const CACHE = " + JSON.stringify("cadencia-shell-" + version) + ";",
    )
    .replace(
      "/* BUILD_ASSETS */",
      assets.map((p) => JSON.stringify(p)).join(","),
    ),
);
