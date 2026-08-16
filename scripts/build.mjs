import { build } from "esbuild";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const source = path.join(packageRoot, "src");
const distribution = path.join(packageRoot, "dist");

await rm(distribution, { recursive: true, force: true });
await mkdir(distribution, { recursive: true });

const builds = [
  {
    entryPoints: [path.join(source, "index.js")],
    outfile: path.join(distribution, "border-bezier.module.js"),
    format: "esm"
  },
  {
    entryPoints: [path.join(source, "index.js")],
    outfile: path.join(distribution, "border-bezier.module.min.js"),
    format: "esm",
    minify: true
  },
  {
    entryPoints: [path.join(source, "global.js")],
    outfile: path.join(distribution, "border-bezier.js"),
    format: "iife"
  },
  {
    entryPoints: [path.join(source, "global.js")],
    outfile: path.join(distribution, "border-bezier.min.js"),
    format: "iife",
    minify: true
  },
  {
    entryPoints: [path.join(source, "styles.css")],
    outfile: path.join(distribution, "border-bezier.css")
  },
  {
    entryPoints: [path.join(source, "styles.css")],
    outfile: path.join(distribution, "border-bezier.min.css"),
    minify: true
  }
];

for (const configuration of builds) {
  await build({
    ...configuration,
    absWorkingDir: packageRoot,
    bundle: true,
    legalComments: "none",
    logLevel: "info",
    platform: "browser",
    target: ["es2020"]
  });
}

await copyFile(
  path.join(packageRoot, "types", "index.d.ts"),
  path.join(distribution, "index.d.ts")
);
