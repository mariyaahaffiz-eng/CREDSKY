import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

function copyDirectory(source, destination) {
  mkdirSync(destination, { recursive: true });

  for (const entry of readdirSync(source)) {
    const sourcePath = join(source, entry);
    const destinationPath = join(destination, entry);

    if (statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else {
      copyFileSync(sourcePath, destinationPath);
    }
  }
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

copyFileSync(join(root, "index.html"), join(dist, "index.html"));
copyFileSync(join(root, "favicon.svg"), join(dist, "favicon.svg"));
copyDirectory(join(root, "css"), join(dist, "css"));
copyDirectory(join(root, "js"), join(dist, "js"));

console.log(`SKY CRED build complete → ${relative(root, dist)}`);
console.log("Static bundle contains no API credentials; /api/* holds the key server-side.");
