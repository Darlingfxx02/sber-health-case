import "./build.mjs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { fingerprintSite } from "./scripts/fingerprint.mjs";

const root = fileURLToPath(new URL(".", import.meta.url)),
  output = path.join(root, "dist");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const files = [
  "favicon.svg",
  "index.html",
  "app.html",
  "app.bundle.js",
  "app.bundle.css",
  "case.bundle.js",
  "case.bundle.css",
  "style.css",
  "health-overview.css",
  "typography.css",
  "app-shell.css",
  "case-embed.css",
];
for (const name of files)
  await cp(path.join(root, name), path.join(output, name));
for (const name of ["assets", "history", "presentation/public"]) {
  await cp(path.join(root, name), path.join(output, name), {
    recursive: true,
    filter: (source) =>
      !source.endsWith(".jsonl") &&
      !source.endsWith(".DS_Store") &&
      !source.endsWith("main-title.mp3"),
  });
}
await fingerprintSite(output);
await writeFile(path.join(output, ".nojekyll"), "");
await writeFile(
  path.join(output, "build.json"),
  JSON.stringify({ revision: process.env.GITHUB_SHA || null }, null, 2) + "\n",
);
console.log("GitHub Pages site: prototype/dist");
