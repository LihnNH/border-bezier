import { execFileSync } from "node:child_process";
import { access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const required = [
  "dist/border-bezier.js",
  "dist/border-bezier.min.js",
  "dist/border-bezier.module.js",
  "dist/border-bezier.module.min.js",
  "dist/border-bezier.css",
  "dist/border-bezier.min.css",
  "dist/index.d.ts",
  "LICENSE",
  "README.md"
];

for (const file of required) {
  await access(path.join(packageRoot, file));
}

const npmCli = process.env.npm_execpath;
const npmCommand = npmCli
  ? process.execPath
  : process.platform === "win32" ? "npm.cmd" : "npm";
const npmArguments = npmCli
  ? [npmCli, "pack", "--dry-run", "--json"]
  : ["pack", "--dry-run", "--json"];

const output = execFileSync(
  npmCommand,
  npmArguments,
  {
    cwd: packageRoot,
    encoding: "utf8",
    shell: !npmCli && process.platform === "win32",
    env: {
      ...process.env,
      npm_config_cache: process.env.npm_config_cache
        ?? path.join(tmpdir(), "border-bezier-npm-cache")
    }
  }
);
const [{ files }] = JSON.parse(output);
const published = files.map(file => file.path);
const forbidden = published.filter(file =>
  /(^|\/)(src|tests|scripts|node_modules)(\/|$)|(^|\/)\.env/i.test(file)
);

if (forbidden.length) {
  throw new Error(`Unexpected files in package: ${forbidden.join(", ")}`);
}

for (const file of required) {
  if (!published.includes(file)) {
    throw new Error(`Missing from npm package: ${file}`);
  }
}

console.log(`Package contents verified: ${published.length} files.`);