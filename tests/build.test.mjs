import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(join(directory, entry.name), relativePath)));
    } else {
      files.push(relativePath);
    }
  }
  return files.sort();
}

test("build emits only privacy-bounded public runtime files", async () => {
  const result = spawnSync(process.execPath, ["scripts/build-site.mjs"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);

  const files = await listFiles("_site");
  assert.deepEqual(files, [
    ".nojekyll",
    "index.html",
    "script.js",
    "src/content.mjs",
    "src/time.mjs",
    "styles.css",
  ]);

  const forbidden =
    /WhatsApp|wa\.me|tel:|phone number|private photo|localStorage|analytics/i;
  for (const file of files.filter((path) => path !== ".nojekyll")) {
    const contents = await readFile(join("_site", file), "utf8");
    assert.doesNotMatch(contents, forbidden, `Private token in ${file}`);
  }
});
