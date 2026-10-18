import { createHash } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

export async function fingerprintSite(directory) {
  const names = new Map();
  async function fingerprint(name, contents) {
    const data = contents ?? (await readFile(path.join(directory, name)));
    const hash = createHash("sha256").update(data).digest("hex").slice(0, 12);
    const extension = path.extname(name),
      output = name.slice(0, -extension.length) + "." + hash + extension;
    await writeFile(path.join(directory, output), data);
    names.set(name, output);
    return output;
  }
  const rewrite = (text) =>
    [...names].reduce((text, [from, to]) => text.replaceAll(from, to), text);
  for (const name of [
    "app.bundle.js",
    "app.bundle.css",
    "case.bundle.css",
    "style.css",
    "health-overview.css",
    "typography.css",
    "app-shell.css",
    "case-embed.css",
  ])
    await fingerprint(name);
  const app = rewrite(await readFile(path.join(directory, "app.html"), "utf8"));
  await fingerprint("app.html", app);
  // The case embeds a versioned app document, whose CSS/JS references are pinned.
  await fingerprint(
    "case.bundle.js",
    rewrite(await readFile(path.join(directory, "case.bundle.js"), "utf8")),
  );
  await writeFile(
    path.join(directory, "index.html"),
    rewrite(await readFile(path.join(directory, "index.html"), "utf8")),
  );
  await writeFile(path.join(directory, "app.html"), app); // direct prototype URL remains available
  for (const name of names.keys())
    if (name !== "app.html") await unlink(path.join(directory, name));
  await writeFile(
    path.join(directory, "asset-manifest.json"),
    JSON.stringify(Object.fromEntries(names), null, 2) + "\n",
  );
  return names;
}
