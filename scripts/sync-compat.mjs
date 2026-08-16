import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

await Promise.all([
  copyFile(
    path.join(packageRoot, "dist", "border-bezier.js"),
    path.join(packageRoot, "border-bezier.js")
  ),
  copyFile(
    path.join(packageRoot, "dist", "border-bezier.js"),
    path.join(packageRoot, "legacy", "border-bezier.js")
  ),
  copyFile(
    path.join(packageRoot, "src", "styles.css"),
    path.join(packageRoot, "border-bezier.css")
  )
]);

console.log("Compatibility entry points synchronized.");
