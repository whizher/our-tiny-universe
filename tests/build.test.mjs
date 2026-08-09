import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { validateTrackedEntries } from "../scripts/validate.mjs";

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

async function validateFixture({
  indexHtml,
  scriptSource,
  stylesSource,
  timeSource,
  contentSource,
  prepareFixture,
  extraTrackedFiles = [],
}) {
  const fixtureContainer = await mkdtemp(
    join(tmpdir(), "our-tiny-universe-validator-"),
  );
  const fixtureRoot = join(fixtureContainer, "repo");
  const outsidePath = join(fixtureContainer, "outside.css");
  const assetsDirectory = join(fixtureRoot, "assets");
  const scriptsDirectory = join(fixtureRoot, "scripts");
  const sourceDirectory = join(fixtureRoot, "src");
  try {
    await mkdir(fixtureRoot);
    await Promise.all([
      mkdir(assetsDirectory),
      mkdir(scriptsDirectory),
      mkdir(sourceDirectory),
    ]);
    const fixtureStyles = stylesSource ?? await readFile("styles.css", "utf8");
    const fixtureIndex =
      typeof indexHtml === "function"
        ? await indexHtml({ fixtureRoot, outsidePath })
        : indexHtml;
    const soundtrackPath = join(assetsDirectory, "lunar-drive.opus");
    await Promise.all([
      cp("assets/favicon.svg", join(assetsDirectory, "favicon.svg")),
      cp("assets/lunar-drive.opus", soundtrackPath),
      cp("scripts/validate.mjs", join(scriptsDirectory, "validate.mjs")),
      timeSource === undefined
        ? cp("src/time.mjs", join(sourceDirectory, "time.mjs"))
        : writeFile(join(sourceDirectory, "time.mjs"), timeSource),
      contentSource === undefined
        ? cp("src/content.mjs", join(sourceDirectory, "content.mjs"))
        : writeFile(join(sourceDirectory, "content.mjs"), contentSource),
      cp("src/audio.mjs", join(sourceDirectory, "audio.mjs")),
      writeFile(join(fixtureRoot, "index.html"), fixtureIndex),
      writeFile(join(fixtureRoot, "script.js"), scriptSource),
      writeFile(join(fixtureRoot, "styles.css"), fixtureStyles),
      writeFile(outsidePath, "generic external fixture\n"),
      ...extraTrackedFiles.map(([path, source]) =>
        writeFile(join(fixtureRoot, path), source),
      ),
    ]);
    if (prepareFixture) {
      await prepareFixture({
        faviconPath: join(assetsDirectory, "favicon.svg"),
        fixtureRoot,
        indexPath: join(fixtureRoot, "index.html"),
        outsidePath,
        previewPath: join(assetsDirectory, "social-preview.png"),
        soundtrackPath,
      });
    }
    spawnSync("git", ["init", "--quiet"], { cwd: fixtureRoot });
    spawnSync("git", ["add", "--all"], { cwd: fixtureRoot });
    return spawnSync(process.execPath, [join(scriptsDirectory, "validate.mjs")], {
      encoding: "utf8",
    });
  } finally {
    await rm(fixtureContainer, { force: true, recursive: true });
  }
}

test("repository policy permits every exact approved tracked path", () => {
  const approvedPaths = [
    ".github/workflows/pages.yml",
    ".gitignore",
    "README.md",
    "package.json",
    "index.html",
    "styles.css",
    "script.js",
    "scripts/build-site.mjs",
    "scripts/validate.mjs",
    "src/audio.mjs",
    "src/content.mjs",
    "src/time.mjs",
    "tests/audio.test.mjs",
    "tests/build.test.mjs",
    "tests/content.test.mjs",
    "tests/controller.test.mjs",
    "tests/time.test.mjs",
    "assets/lunar-drive.opus",
    "assets/social-preview.png",
    "assets/favicon.svg",
  ];
  assert.equal(new Set(approvedPaths).size, 20);
  assert.deepEqual(
    validateTrackedEntries(approvedPaths.map((path) => ({ path, size: 1 }))),
    [],
  );
});

test("repository policy permits dated plan and spec documents", () => {
  assert.deepEqual(
    validateTrackedEntries([
      {
        path: "docs/superpowers/plans/2026-08-08-our-tiny-universe-v1-1.md",
        size: 40_000,
      },
      {
        path: "docs/superpowers/specs/2026-08-08-our-tiny-universe-v1-1-design.md",
        size: 40_000,
      },
    ]),
    [],
  );
});

test("repository policy rejects malformed, uppercase, and nested document paths", () => {
  assert.deepEqual(
    validateTrackedEntries([
      { path: "docs/superpowers/plans/2026-8-08-short-date.md", size: 1 },
      { path: "docs/superpowers/plans/2026-08-08-Uppercase.md", size: 1 },
      { path: "docs/superpowers/specs/2026-08-08-design.MD", size: 1 },
      { path: "docs/superpowers/plans/nested/2026-08-08-plan.md", size: 1 },
      { path: "docs/superpowers/notes/2026-08-08-note.md", size: 1 },
    ]),
    [
      "Unapproved tracked path: docs/superpowers/plans/2026-8-08-short-date.md",
      "Unapproved tracked path: docs/superpowers/plans/2026-08-08-Uppercase.md",
      "Unapproved tracked path: docs/superpowers/specs/2026-08-08-design.MD",
      "Unapproved tracked path: docs/superpowers/plans/nested/2026-08-08-plan.md",
      "Unapproved tracked path: docs/superpowers/notes/2026-08-08-note.md",
    ],
  );
});

test("repository policy rejects every denied export, media, and archive extension", () => {
  const deniedPaths = [
    "exports/file.txt",
    "exports/file.log",
    "exports/file.csv",
    "exports/file.tsv",
    "exports/file.zip",
    "exports/file.7z",
    "exports/file.rar",
    "exports/file.tar",
    "exports/file.gz",
    "exports/file.pdf",
    "exports/file.doc",
    "exports/file.docx",
    "exports/file.xls",
    "exports/file.xlsx",
    "exports/file.ppt",
    "exports/file.pptx",
    "exports/file.jpg",
    "exports/file.jpeg",
    "exports/file.webp",
    "exports/file.gif",
    "exports/file.heic",
    "exports/file.mp3",
    "exports/file.m4a",
    "exports/file.wav",
    "exports/file.ogg",
    "exports/file.opus",
    "exports/file.mp4",
    "exports/file.mov",
    "exports/file.mkv",
    "exports/file.webm",
  ];
  const errors = validateTrackedEntries(
    deniedPaths.map((path) => ({ path, size: 1 })),
  );
  assert.equal(deniedPaths.length, 30);
  assert.equal(errors.length, 30);
});

test("repository policy permits only package.json and the three approved public assets", () => {
  assert.deepEqual(
    validateTrackedEntries([
      { path: "package.json", size: 1 },
      { path: "assets/lunar-drive.opus", size: 2_932_210 },
      { path: "assets/social-preview.png", size: 1 },
      { path: "assets/favicon.svg", size: 1 },
    ]),
    [],
  );
  assert.deepEqual(
    validateTrackedEntries([
      { path: "package-lock.json", size: 1 },
      { path: "data.json", size: 1 },
      { path: "assets/data.json", size: 1 },
      { path: "social-preview.png", size: 1 },
      { path: "assets/alternate.png", size: 1 },
      { path: "favicon.svg", size: 1 },
      { path: "assets/alternate.svg", size: 1 },
    ]),
    [
      "Unapproved tracked path: package-lock.json",
      "Unapproved tracked path: data.json",
      "Unapproved tracked path: assets/data.json",
      "Unapproved tracked path: social-preview.png",
      "Unapproved tracked path: assets/alternate.png",
      "Unapproved tracked path: favicon.svg",
      "Unapproved tracked path: assets/alternate.svg",
    ],
  );
});

test("repository policy enforces exact text, preview, and soundtrack byte limits", () => {
  assert.deepEqual(
    validateTrackedEntries([
      { path: "script.js", size: 262_144 },
      { path: "assets/social-preview.png", size: 1_048_576 },
      { path: "assets/lunar-drive.opus", size: 4_194_304 },
    ]),
    [],
  );
  assert.deepEqual(
    validateTrackedEntries([
      { path: "script.js", size: 262_145 },
      { path: "assets/social-preview.png", size: 1_048_577 },
      { path: "assets/lunar-drive.opus", size: 4_194_305 },
    ]),
    [
      "Tracked file exceeds size limit: script.js",
      "Tracked file exceeds size limit: assets/social-preview.png",
      "Tracked file exceeds size limit: assets/lunar-drive.opus",
    ],
  );
});

test("soundtrack markup is local, manual, visible, and duplicated for crossfade", async () => {
  const html = await readFile("index.html", "utf8");
  const channels = html.match(/<audio\b[^>]*data-soundtrack-channel[^>]*>/g) || [];

  assert.equal(channels.length, 2);
  for (const channel of channels) {
    assert.match(channel, /src="assets\/lunar-drive\.opus"/);
    assert.match(channel, /preload="metadata"/);
    assert.doesNotMatch(channel, /\b(?:autoplay|loop)\b/i);
  }
  assert.match(html, /data-music-toggle/);
  assert.match(html, /data-music-status[^>]*aria-live="polite"/);
  assert.match(html, /Tap 🎵 to start Lunar Drive\./);
  assert.match(html, /🎵 Play soundtrack/);
  assert.doesNotMatch(html, /(?:youtube|spotify|soundcloud)\.com/i);
});

test("build emits only privacy-bounded public runtime files", async () => {
  const result = spawnSync(process.execPath, ["scripts/build-site.mjs"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);

  const files = await listFiles("_site");
  assert.deepEqual(files, [
    ".nojekyll",
    "assets/favicon.svg",
    "assets/lunar-drive.opus",
    "assets/social-preview.png",
    "index.html",
    "script.js",
    "src/audio.mjs",
    "src/content.mjs",
    "src/time.mjs",
    "styles.css",
  ]);

  assert.deepEqual(
    await readFile("_site/assets/lunar-drive.opus"),
    await readFile("assets/lunar-drive.opus"),
  );

  const forbidden =
    /WhatsApp|wa\.me|tel:|phone number|private photo|localStorage|analytics/i;
  for (const file of files.filter((path) => /\.(?:html|css|m?js|svg)$/i.test(path))) {
    const contents = await readFile(join("_site", file), "utf8");
    assert.doesNotMatch(contents, forbidden, `Private token in ${file}`);
  }
});

test("validator permits canonical metadata and local module imports", () => {
  const result = spawnSync(process.execPath, ["scripts/validate.mjs"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Validated 8 runtime files\./);
});

test("validator rejects a modified soundtrack", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    prepareFixture: async ({ soundtrackPath }) => {
      const bytes = await readFile(soundtrackPath);
      bytes[128] ^= 1;
      await writeFile(soundtrackPath, bytes);
    },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Soundtrack SHA-256 mismatch/);
});

test("validator rejects canonical URL used as a runtime script", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml: indexHtml.replace(
      '<script type="module" src="script.js"></script>',
      '<script type="module" src="https://whizher.github.io/our-tiny-universe/"></script>',
    ),
    scriptSource,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /External runtime reference: https:\/\/whizher\.github\.io\/our-tiny-universe\//,
  );
});

test("validator rejects a data-rel canonical spoof", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml: indexHtml.replace(
      'rel="canonical"',
      'rel="stylesheet" data-rel="canonical"',
    ),
    scriptSource,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /External runtime reference: https:\/\/whizher\.github\.io\/our-tiny-universe\//,
  );
});

test("validator rejects unquoted external href and src attributes", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const fixtures = [
    indexHtml.replace(
      '<link rel="stylesheet" href="styles.css">',
      '<link rel="stylesheet" href=https://example.invalid/style.css>',
    ),
    indexHtml.replace(
      '<script type="module" src="script.js"></script>',
      '<script type="module" src=https://example.invalid/runtime.js></script>',
    ),
  ];

  for (const fixture of fixtures) {
    const result = await validateFixture({
      indexHtml: fixture,
      scriptSource,
    });
    assert.notEqual(result.status, 0, "unquoted external URL was accepted");
    assert.match(result.stderr, /Unquoted HTML attribute in index\.html/);
  }
});

test("validator rejects a non-terminal self-closing marker before a URL attribute", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml: indexHtml.replace(
      '<script type="module" src="script.js"></script>',
      '<script / src=https://example.invalid/runtime.js></script>',
    ),
    scriptSource,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Malformed HTML attributes in index\.html/);
});

test("validator rejects external srcset candidates", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml: indexHtml.replace(
      "</body>",
      '<img alt="" srcset="assets/favicon.svg 1x, https://example.invalid/image.svg 2x">\n  </body>',
    ),
    scriptSource,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /External runtime reference: https:\/\/example\.invalid\/image\.svg/,
  );
});

test("validator rejects external imagesrcset candidates", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml: indexHtml.replace(
      "</head>",
      '<link rel="preload" as="image" imagesrcset="https://example.invalid/image.png 1x">\n  </head>',
    ),
    scriptSource,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /External runtime reference: https:\/\/example\.invalid\/image\.png/,
  );
});

test("validator rejects iframe srcdoc content", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml: indexHtml.replace(
      "</body>",
      '<iframe srcdoc="&lt;img src=&quot;https://example.invalid/image.png&quot;&gt;"></iframe>\n  </body>',
    ),
    scriptSource,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Forbidden srcdoc in index\.html/);
});

test("validator rejects external resources in inline style attributes", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml: indexHtml.replace(
      "</body>",
      '<div style="background-image: url(https://example.invalid/image.png)"></div>\n  </body>',
    ),
    scriptSource,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /External CSS URL in index\.html inline style: https:\/\/example\.invalid\/image\.png/,
  );
});

test("validator rejects dynamic JavaScript imports", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource: `${scriptSource}\nvoid import("https://example.invalid/runtime.mjs");\n`,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Forbidden dynamic import in script\.js/);
});

test("validator rejects network APIs hidden in template expressions", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource: scriptSource + "\n`${fetch(CANONICAL_URL)}`;\n",
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /Unsupported JavaScript template literal in script\.js/,
  );
});

test("validator rejects common network-capable JavaScript APIs", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const fixtures = [
    'fetch("https://example.invalid/data.json");',
    'globalThis["fetch"]("https://example.invalid/data.json");',
    "new XMLHttpRequest();",
    'new WebSocket("wss://example.invalid/socket");',
    'new EventSource("https://example.invalid/events");',
    'navigator.sendBeacon("https://example.invalid/collect", "x");',
  ];

  for (const fixture of fixtures) {
    const result = await validateFixture({
      indexHtml,
      scriptSource: `${scriptSource}\n${fixture}\n`,
    });
    assert.notEqual(result.status, 0, `network API was accepted: ${fixture}`);
    assert.match(result.stderr, /Forbidden network API in script\.js/);
  }
});

test("validator rejects inline HTML event handlers", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml: indexHtml.replace(
      "</body>",
      '<button onclick="fetch(\'https://example.invalid/data.json\')">Load</button>\n  </body>',
    ),
    scriptSource,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Forbidden inline event handler in index\.html/);
});

test("validator rejects external inline script and style blocks", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const fixtures = [
    indexHtml.replace(
      '<script type="module" src="script.js"></script>',
      '<script type="module" src="script.js">fetch("https://example.invalid/data.json")</script>',
    ),
    indexHtml.replace(
      "</head>",
      '<style>body { background: url("https://example.invalid/image.png"); }</style>\n  </head>',
    ),
  ];

  for (const fixtureHtml of fixtures) {
    const result = await validateFixture({
      indexHtml: fixtureHtml,
      scriptSource,
    });
    assert.notEqual(result.status, 0, "inline resource block was accepted");
    assert.match(result.stderr, /Forbidden inline (?:script|style) in index\.html/);
  }
});

test("validator rejects canonical URLs outside exact public-link contexts", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml: indexHtml.replace(" data-share-fallback", ""),
    scriptSource,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /External runtime reference: https:\/\/whizher\.github\.io\/our-tiny-universe\//,
  );
});

test("validator rejects external URLs in unapproved metadata contexts", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml: indexHtml.replace(
      "</head>",
      '<meta http-equiv="refresh" content="0; url=https://example.invalid/redirect">\n  </head>',
    ),
    scriptSource,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Forbidden metadata URL in index\.html/);
});

test("validator rejects external side-effect imports", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource: `${scriptSource}\nimport "https://example.invalid/runtime.mjs";\n`,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /External runtime reference: https:\/\/example\.invalid\/runtime\.mjs/,
  );
});

test("validator rejects commented external side-effect imports", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource: `${scriptSource}\nimport/* comment */ "https://example.invalid/runtime.mjs";\n`,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /External runtime reference: https:\/\/example\.invalid\/runtime\.mjs/,
  );
});

test("validator rejects string-form CSS imports", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const stylesSource = await readFile("styles.css", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    stylesSource: `@import "https://example.invalid/style.css";\n${stylesSource}`,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Forbidden CSS import in styles\.css/);
});

test("validator rejects url-form CSS imports", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const stylesSource = await readFile("styles.css", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    stylesSource: `@import url("https://example.invalid/style.css");\n${stylesSource}`,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Forbidden CSS import in styles\.css/);
});

test("validator rejects external CSS url dependencies", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const stylesSource = await readFile("styles.css", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    stylesSource: `${stylesSource}\nbody { background-image: url("https://example.invalid/image.png"); }\n`,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /External CSS URL in styles\.css: https:\/\/example\.invalid\/image\.png/,
  );
});

test("validator rejects quoted external CSS URLs containing parentheses", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const stylesSource = await readFile("styles.css", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    stylesSource: `${stylesSource}\nbody { background-image: url("https://example.invalid/image(1).png"); }\n`,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /External CSS URL in styles\.css: https:\/\/example\.invalid\/image\(1\)\.png/,
  );
});

test("validator rejects protocol-relative CSS URLs", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const stylesSource = await readFile("styles.css", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    stylesSource: `${stylesSource}\nbody { background-image: url(//example.invalid/image.png); }\n`,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /External CSS URL in styles\.css: \/\/example\.invalid\/image\.png/,
  );
});

test("validator rejects data and blob CSS URLs", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const stylesSource = await readFile("styles.css", "utf8");
  const fixtures = [
    "data:image/png;base64,AAAA",
    "blob:https://example.invalid/00000000-0000-0000-0000-000000000000",
  ];

  for (const reference of fixtures) {
    const result = await validateFixture({
      indexHtml,
      scriptSource,
      stylesSource: `${stylesSource}\nbody { background-image: url("${reference}"); }\n`,
    });
    assert.notEqual(result.status, 0, `CSS URL was accepted: ${reference}`);
    assert.match(result.stderr, /Non-file CSS URL in styles\.css:/);
  }
});

test("validator rejects unsupported escaped CSS syntax", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const stylesSource = await readFile("styles.css", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    stylesSource: `${stylesSource}\n@\\69mport "https://example.invalid/style.css";\n`,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unsupported CSS escape in styles\.css/);
});

test("validator rejects unsupported CSS resource functions", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const stylesSource = await readFile("styles.css", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    stylesSource: `${stylesSource}\nbody { background-image: image-set("https://example.invalid/image.png" 1x); }\n`,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /Forbidden CSS resource function in styles\.css/,
  );
});

test("validator rejects CSS-escaped external URL schemes", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const stylesSource = await readFile("styles.css", "utf8");
  const escapedExternalUrl = String.raw`url("\68ttps://example.invalid/image.png")`;
  assert.ok(escapedExternalUrl.includes("\\68ttps"));
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    stylesSource: `${stylesSource}\nbody { background-image: ${escapedExternalUrl}; }\n`,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Escaped CSS URL in styles\.css/);
});

test("validator rejects protocol-relative CSS imports", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const stylesSource = await readFile("styles.css", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    stylesSource: `@import "//example.invalid/style.css";\n${stylesSource}`,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Forbidden CSS import in styles\.css/);
});

test("validator permits local relative CSS URLs", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const stylesSource = await readFile("styles.css", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    stylesSource: `${stylesSource}\nbody { background-image: url("assets/favicon.svg"); }\n`,
  });
  assert.equal(result.status, 0, result.stderr);
});

test("validator rejects absolute and repo-escaping references to existing files", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const references = [
    ({ outsidePath }) => outsidePath,
    () => "../outside.css",
  ];

  for (const reference of references) {
    const result = await validateFixture({
      indexHtml: (paths) =>
        indexHtml.replace(
          'href="styles.css"',
          `href="${reference(paths)}"`,
        ),
      scriptSource,
    });
    assert.notEqual(result.status, 0, "outside existing file was accepted");
    assert.match(result.stderr, /Disallowed local reference in index\.html/);
  }
});

test("validator rejects a missing local CSS asset", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const stylesSource = await readFile("styles.css", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    stylesSource: `${stylesSource}\nbody { background: url("assets/missing.svg"); }\n`,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /Broken local reference in styles\.css: assets\/missing\.svg/,
  );
});

test("validator rejects an existing repository file excluded from the build", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml: indexHtml.replace(
      'href="styles.css"',
      'href="scripts/validate.mjs"',
    ),
    scriptSource,
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /Local reference is not deployed: scripts\/validate\.mjs/,
  );
});

test("validator rejects a re-export of an existing undeployed repository file", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource:
      scriptSource +
      '\nexport { validateTrackedEntries } from "./scripts/validate.mjs";\n',
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /Local reference is not deployed: scripts\/validate\.mjs/,
  );
});

test("validator rejects a deployed-path symlink that escapes the repository", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    prepareFixture: async ({ faviconPath, outsidePath }) => {
      await rm(faviconPath);
      await symlink(outsidePath, faviconPath);
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /Disallowed local reference in index\.html: assets\/favicon\.svg/,
  );
});

test("validator rejects symlinked tracked deploy inputs not reached by local references", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const fixtures = [
    async ({ indexPath, outsidePath }) => {
      await writeFile(outsidePath, indexHtml);
      await rm(indexPath);
      await symlink(outsidePath, indexPath);
    },
    async ({ outsidePath, previewPath }) => {
      await symlink(outsidePath, previewPath);
    },
  ];

  for (const prepareFixture of fixtures) {
    const result = await validateFixture({
      indexHtml,
      scriptSource,
      prepareFixture,
    });
    assert.notEqual(result.status, 0, "tracked deploy symlink was accepted");
    assert.match(result.stderr, /Tracked path is not a regular file:/);
  }
});

test("validator scans deployed SVG content for active resources", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const favicon = await readFile("assets/favicon.svg", "utf8");
  const additions = [
    '<script>fetch("https://example.invalid/data.json")</script>',
    '<style>@import "https://example.invalid/style.css";</style>',
    '<foreignObject><p>foreign content</p></foreignObject>',
    '<image href=https://example.invalid/image.png>',
  ];

  for (const addition of additions) {
    const result = await validateFixture({
      indexHtml,
      scriptSource,
      prepareFixture: ({ faviconPath }) =>
        writeFile(faviconPath, favicon.replace("</svg>", `${addition}</svg>`)),
    });
    assert.notEqual(result.status, 0, `SVG resource was accepted: ${addition}`);
    assert.match(result.stderr, /Forbidden SVG content in assets\/favicon\.svg/);
  }
});

test("validator resolves local module references from their source file", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const timeSource = await readFile("src/time.mjs", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    timeSource: `${timeSource}\nimport "./content.mjs";\n`,
  });
  assert.equal(result.status, 0, result.stderr);
});

test("validator parses newline-bearing tracked filenames with NUL delimiters", async () => {
  const indexHtml = await readFile("index.html", "utf8");
  const scriptSource = await readFile("script.js", "utf8");
  const result = await validateFixture({
    indexHtml,
    scriptSource,
    extraTrackedFiles: [["unknown\ntracked.md", "public test fixture\n"]],
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /Unapproved tracked path: unknown\ntracked\.md/,
  );
});

test("social preview has approved dimensions and size", async () => {
  const bytes = await readFile("assets/social-preview.png");
  assert.deepEqual(
    [...bytes.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
  assert.equal(bytes.readUInt32BE(16), 1200);
  assert.equal(bytes.readUInt32BE(20), 630);
  assert.ok(bytes.length <= 1_048_576);
});

test("soundtrack is the sanitized approved Opus asset", async () => {
  const bytes = await readFile("assets/lunar-drive.opus");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const searchable = bytes.toString("latin1");

  assert.equal(bytes.subarray(0, 4).toString("ascii"), "OggS");
  assert.equal(bytes.length, 2_932_210);
  assert.equal(
    digest,
    "ba8d55ed26addb68ea68ca4703b96aeee665d429981495db3aee272e04081765",
  );
  assert.match(searchable, /title=Lunar Drive/);
  assert.match(searchable, /artist=Mondo Loops/);
  assert.doesNotMatch(
    searchable,
    /https?:\/\/|youtu(?:\.be|be\.com)|lofi girl|description=|metadata_block_picture/i,
  );
});

test("favicon is self-contained and privacy-safe", async () => {
  const favicon = await readFile("assets/favicon.svg", "utf8");
  assert.match(
    favicon,
    /<svg\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/,
  );
  assert.doesNotMatch(favicon, /<image\b/i);
  assert.doesNotMatch(
    favicon,
    /\b(?:href|xlink:href|src)\s*=\s*["']\s*(?:https?|data):/i,
  );
});

test("declares canonical privacy-safe social metadata", async () => {
  const html = await readFile("index.html", "utf8");
  assert.match(
    html,
    /rel="canonical"\s+href="https:\/\/whizher\.github\.io\/our-tiny-universe\//,
  );
  assert.match(html, /property="og:title" content="Our Tiny Universe 🌌"/);
  assert.match(html, /property="og:description" content="Same chaos, more teamwork\."/);
  assert.match(
    html,
    /property="og:image"\s+content="https:\/\/whizher\.github\.io\/our-tiny-universe\/assets\/social-preview\.png"/,
  );
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /href="assets\/favicon\.svg"/);
});

test("runtime markup contains no external executable or embedded dependency", async () => {
  const html = await readFile("index.html", "utf8");
  const css = await readFile("styles.css", "utf8");
  assert.doesNotMatch(html, /<script[^>]+src="https?:/i);
  assert.doesNotMatch(
    html,
    /<link[^>]+rel="stylesheet"[^>]+href="https?:/i,
  );
  assert.doesNotMatch(html, /<iframe\b/i);
  assert.doesNotMatch(css, /@import\b/i);
  assert.doesNotMatch(css, /url\(["']?https?:/i);
  assert.match(
    html,
    /property="og:url"\s+content="https:\/\/whizher\.github\.io\/our-tiny-universe\/"/,
  );
  assert.match(
    html,
    /property="og:image"\s+content="https:\/\/whizher\.github\.io\/our-tiny-universe\/assets\/social-preview\.png"/,
  );
});

test("keeps new effects inside reduced-motion handling", async () => {
  const css = await readFile("styles.css", "utf8");
  assert.match(css, /\.message--reveal/);
  assert.match(css, /\[data-anniversary="true"\]/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
