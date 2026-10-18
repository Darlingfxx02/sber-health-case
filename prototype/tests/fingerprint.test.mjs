import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fingerprintSite } from "../scripts/fingerprint.mjs";
test("published HTML pins its iframe and all JS/CSS to the same content revision", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "sber-assets-"));
  try {
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
      await writeFile(path.join(dir, name), name);
    await writeFile(
      path.join(dir, "app.html"),
      '<script src="app.bundle.js"></script><link href="app-shell.css">',
    );
    await writeFile(
      path.join(dir, "case.bundle.js"),
      'iframe.src="app.html?embed=case"; element.style.cssText="color:red"',
    );
    await writeFile(
      path.join(dir, "index.html"),
      '<script src="case.bundle.js"></script><link href="case.bundle.css">',
    );
    const names = await fingerprintSite(dir);
    const index = await readFile(path.join(dir, "index.html"), "utf8"),
      app = await readFile(path.join(dir, names.get("app.html")), "utf8"),
      bundle = await readFile(
        path.join(dir, names.get("case.bundle.js")),
        "utf8",
      );
    assert.ok(index.includes(names.get("case.bundle.js")));
    assert.ok(index.includes(names.get("case.bundle.css")));
    assert.ok(app.includes(names.get("app.bundle.js")));
    assert.ok(app.includes(names.get("app-shell.css")));
    assert.ok(bundle.includes(names.get("app.html") + "?embed=case"));
    assert.ok(bundle.includes('element.style.cssText="color:red"'));
    for (const name of names.values()) {
      assert.match(name, /\.[a-f0-9]{12}\./);
      await readFile(path.join(dir, name));
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
