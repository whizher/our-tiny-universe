import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { START_DATE, isAnniversaryNoteEligible } from "../src/time.mjs";
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
import {
  validateOpusTagComments,
  validateSoundtrack,
  validateTrackedEntries,
} from "../scripts/validate.mjs";

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

function capsuleMarkup(html) {
  const capsule = html.match(/<section\b[^>]*class="anniversary-capsule"[^>]*>([\s\S]*?)<\/section>/)?.[0];
  assert.ok(capsule, "permanent capsule must exist in static HTML");
  return capsule;
}

function inlineText(html) {
  return html.replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

function letterCanonicalBlocks(article) {
  return [...article.matchAll(/<(h3|p)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(([, tag, body]) => {
    const spans = [...body.matchAll(/<(strong|em)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(match => {
      const prefix = inlineText(body.slice(0, match.index));
      const before = body.slice(0, match.index).replace(/<[^>]*>/g, "");
      const start = prefix.length + (/\s$/.test(before) ? 1 : 0);
      return [match[1], start, start + inlineText(match[2]).length];
    });
    return [tag, inlineText(body), spans];
  });
}

function assertNoteInventory(html, now) {
  const cards = [...html.matchAll(/<details\b([^>]*\bdata-anniversary-note-year\b[^>]*)>([\s\S]*?)<\/details>/g)];
  let previous = 2026;
  for (const [, attributes, body] of cards) {
    const years = [...attributes.matchAll(/\bdata-anniversary-note-year="(\d{4})"/g)];
    assert.equal(years.length, 1, "one strict calendar-year attribute required");
    const year = Number(years[0][1]);
    assert.ok(year > previous, "notes must be unique and chronological, starting in 2027");
    previous = year;
    assert.ok(isAnniversaryNoteEligible(year, now), "note anniversary has not arrived");
    const summary = body.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)?.[1];
    assert.ok(summary, "note needs a native summary");
    const number = year - START_DATE.year;
    const suffix = number % 100 >= 11 && number % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[number % 10] || "th");
    assert.match(inlineText(summary), new RegExp(`^${number}${suffix} anniversary`));
    const month = String(START_DATE.month).padStart(2, "0");
    const day = String(START_DATE.day).padStart(2, "0");
    assert.match(summary, new RegExp(`<time\\b[^>]*datetime="${year}-${month}-${day}"`));
    assert.match(inlineText(summary.match(/<time\b[^>]*>([\s\S]*?)<\/time>/)?.[1] || ""), new RegExp(`^7 July ${year}$`));
    const content = body.replace(/<summary\b[^>]*>[\s\S]*?<\/summary>/, "");
    assert.ok(inlineText(content).length > 0, "note body must not be empty");
    assert.doesNotMatch(attributes, /\bname\s*=|\bopen\b/);
  }
  assert.equal((html.match(/\bdata-anniversary-note-year\b/g) || []).length, cards.length,
    "note metadata must belong to a complete native card");
  return cards.length;
}

test("capsule is a closed independent native keepsake between timeline and Anti-Cringe", async () => {
  const html = await readFile("index.html", "utf8");
  const capsule = capsuleMarkup(html);
  assert.ok(html.indexOf('class="timeline"') < html.indexOf(capsule));
  assert.ok(html.indexOf(capsule) < html.indexOf('class="anti-cringe"'));
  assert.match(capsule, /aria-labelledby="capsule-title"/);
  assert.match(capsule, /<h2 id="capsule-title">Anniversary Capsule<\/h2>/);
  assert.match(capsule, /<details class="eternal-letter">/);
  const summary = capsule.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)?.[1];
  assert.equal(inlineText(summary), "Eternal Letter from Naufal to Rity");
  assert.match(summary, /<svg[^>]*aria-hidden="true"[^>]*focusable="false"/);
  assert.doesNotMatch(capsule, /\bname=|\btabindex=|aria-expanded|aria-pressed|<button|<a\b|<dialog/);
  assert.match(capsule, /<article[^>]*aria-labelledby="eternal-letter-title"/);
  const status = capsule.match(/<div[^>]*aria-live="polite"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  assert.match(status, /<p[^>]*data-capsule-status[^>]*hidden/);
  assert.doesNotMatch(status, /<article|<details/);
});

test("capsule letter exactly matches the private approved manuscript block and emphasis digest", async () => {
  const html = capsuleMarkup(await readFile("index.html", "utf8"));
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/)?.[1] || "";
  const blocks = letterCanonicalBlocks(article);
  assert.equal(blocks.length, 22);
  // Derived from Appendix A before candidate generation; no duplicate manuscript fixture.
  assert.equal(createHash("sha256").update(JSON.stringify(blocks)).digest("hex"),
    "5e64ca9dedfcb036798fbb647302f9dd382456f0eca5daaf04375d490a703417");
  assert.match(article, /<p lang="id">Aku nggak tahu persis[\s\S]*?<span lang="en">[^<]+<\/span>/);
  assert.match(article, /<p lang="id">Bintang-bintang[\s\S]*?<strong lang="en">[^<]+<\/strong>/);
  assert.equal((article.match(/<p\b/g) || []).length, 21);
});

test("capsule publication inventory rejects invalid, premature and empty synthetic notes", () => {
  const card = (year = 2027, number = "3rd", date = "2027-07-07", content = "Synthetic policy fixture.") =>
    `<details data-anniversary-note-year="${year}"><summary>${number} anniversary · <time datetime="${date}">7 July ${year}</time></summary><p>${content}</p></details>`;
  const late = new Date("2027-07-10T00:00:00Z");
  assert.equal(assertNoteInventory(card(), late), 1);
  assert.equal(assertNoteInventory(card(), new Date("2030-01-01Z")), 1);
  for (const bad of [card(2025), card(2026), card("oops"), card(2027, "4th"),
    card(2027, "3th"), card(2027, "3rd", "2027-07-32"), card(2027, "3rd", "2027-07-08"),
    card(2027, "3rd", "2027-07-07", "  "), card() + card(),
    card(2028, "4th", "2028-07-07"), '<p data-anniversary-note-year="2027">fixture</p>']) {
    assert.throws(() => assertNoteInventory(bad, late));
  }
  assert.throws(() => assertNoteInventory(card(), new Date("2027-07-06T16:59:59.999Z")));
  assert.equal(assertNoteInventory(card(), new Date("2027-07-06T17:00:00Z")), 1);
  assert.throws(() => assertNoteInventory(card(2028, "4th", "2028-07-07") + card(), new Date("2030-01-01Z")));
});

test("capsule launch contains no unpublished annual cards or empty archive collection", async () => {
  const html = await readFile("index.html", "utf8");
  const current = new Date();
  assert.equal(assertNoteInventory(html, current), 0);
  assert.doesNotMatch(capsuleMarkup(html), /anniversary-notes|<ol|<ul|data-anniversary-note-year/);
});

test("capsule styling keeps a static readable star and respects both motion preferences", async () => {
  const css = await readFile("styles.css", "utf8");
  assert.match(css, /\.capsule-summary\s*\{[^}]*min-height:\s*44px;/);
  assert.match(css, /\.capsule-summary:focus-visible[^}]*outline:\s*3px solid #ffffff;/);
  assert.match(css, /\.capsule-letter\s*\{[^}]*max-width:\s*65ch;[^}]*font-size:\s*1rem;[^}]*line-height:\s*1\.7;/);
  assert.match(css, /:root\[data-motion-paused="true"\] \.anniversary-capsule details\s*\{\s*transition:\s*none;/);
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.anniversary-capsule details\s*\{\s*transition:\s*none;/);
  assert.doesNotMatch(css.match(/\.celestial-star\s*\{([^}]*)\}/)?.[1] || "", /\banimation\s*:|\btransform\s*:/);
});

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
    const soundtrackPath = join(assetsDirectory, "has-to-be.opus");
    await Promise.all([
      cp("assets/favicon.svg", join(assetsDirectory, "favicon.svg")),
      cp("assets/has-to-be.opus", soundtrackPath),
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
    ".github/workflows/validate.yml",
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
    "assets/has-to-be.opus",
    "assets/social-preview.png",
    "assets/favicon.svg",
  ];
  assert.equal(new Set(approvedPaths).size, 21);
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
      { path: "assets/has-to-be.opus", size: 4_352_134 },
      { path: "assets/social-preview.png", size: 1 },
      { path: "assets/favicon.svg", size: 1 },
    ]),
    [],
  );
  assert.deepEqual(
    validateTrackedEntries([
      { path: "assets/lunar-drive.opus", size: 1 },
      { path: "assets/alternate.opus", size: 1 },
      { path: "package-lock.json", size: 1 },
      { path: "data.json", size: 1 },
      { path: "assets/data.json", size: 1 },
      { path: "social-preview.png", size: 1 },
      { path: "assets/alternate.png", size: 1 },
      { path: "favicon.svg", size: 1 },
      { path: "assets/alternate.svg", size: 1 },
    ]),
    [
      "Unapproved tracked path: assets/lunar-drive.opus",
      "Unapproved tracked path: assets/alternate.opus",
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
      { path: "assets/has-to-be.opus", size: 5_242_880 },
    ]),
    [],
  );
  assert.deepEqual(
    validateTrackedEntries([
      { path: "script.js", size: 262_145 },
      { path: "assets/social-preview.png", size: 1_048_577 },
      { path: "assets/has-to-be.opus", size: 5_242_881 },
    ]),
    [
      "Tracked file exceeds size limit: script.js",
      "Tracked file exceeds size limit: assets/social-preview.png",
      "Tracked file exceeds size limit: assets/has-to-be.opus",
    ],
  );
});

test("soundtrack markup is local, manual, visible, and duplicated for crossfade", async () => {
  const html = await readFile("index.html", "utf8");
  const channels = html.match(/<audio\b[^>]*data-soundtrack-channel[^>]*>/g) || [];

  assert.equal(channels.length, 2);
  for (const channel of channels) {
    assert.doesNotMatch(channel, /\bsrc\s*=/);
    assert.match(channel, /preload="none"/);
    assert.doesNotMatch(channel, /\b(?:autoplay|loop)\b/i);
  }
  assert.match(html, /data-music-toggle/);
  assert.match(html, /data-music-status[^>]*aria-live="polite"/);
  assert.match(html, /Tap 🎵 to start Has to Be\./);
  const toggle = html.match(
    /<button\b[^>]*data-music-toggle[^>]*>[\s\S]*?<\/button>/,
  )?.[0] || "";
  assert.match(toggle, /aria-label="Play soundtrack"/);
  assert.match(toggle, /type="button"/);
  assert.doesNotMatch(toggle, /aria-(?:pressed|checked)/);
  assert.match(toggle, />\s*🎵\s*<\/button>/);
  assert.doesNotMatch(toggle, />[^<]*Play soundtrack/);
  assert.doesNotMatch(html, /(?:youtube|spotify|soundcloud)\.com/i);
});

test("declares English as the default with Indonesian passages identified", async () => {
  const html = await readFile("index.html", "utf8");
  assert.match(html, /<html lang="en">/);
  assert.match(html, /class="subtitle" lang="id"/);
  assert.match(html, /data-days lang="id"/);
  assert.match(html, /data-anniversary-status lang="id"/);
  assert.match(html, /data-message lang="id"/);
  assert.match(html, /<span lang="id">7 Juli 2024<\/span>/);
});

test("announces speaker and transmission together in one persistent region", async () => {
  const html = await readFile("index.html", "utf8");
  assert.match(html, /<div aria-live="polite" aria-atomic="true">\s*<h2[^>]*data-message-title[\s\S]*?<p[^>]*data-message[\s\S]*?<\/div>/);
  const message = html.match(/<p\b[^>]*data-message\b[^>]*>/)?.[0] || "";
  assert.doesNotMatch(message, /aria-live/);
  assert.match(html, /<div aria-live="polite" aria-atomic="true">\s*<p[^>]*data-anti-result/);
  assert.match(html, /<div aria-live="polite" aria-atomic="true">\s*<p[^>]*data-share-status/);
});

async function readTimelineDisclosures() {
  const html = await readFile("index.html", "utf8");
  const timeline = html.match(/<section\b[^>]*class="timeline"[^>]*>([\s\S]*?)<\/section>/)?.[1] || "";
  return [...timeline.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)]
    .map(([, attributes, content]) => {
      const summary = content.match(/<summary\b([^>]*)>([\s\S]*?)<\/summary>/);
      return {
        attributes,
        summaryAttributes: summary?.[1] || "",
        summary: summary?.[2] || "",
        story: content.replace(summary?.[0] || "", ""),
      };
    });
}

function readableMarkupText(markup) {
  return markup.replace(/<svg\b[\s\S]*?<\/svg>/g, "")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

test("timeline exposes the three original stories through named native disclosures", async () => {
  const disclosures = await readTimelineDisclosures();
  assert.equal(disclosures.length, 3, "all milestones need a native disclosure");
  const expected = [
    ["Long before the orbit", "The lore had already started."],
    ["7 Juli 2024", "Officially one orbit."],
    ["Today", "Same chaos, more teamwork."],
  ];
  assert.deepEqual(disclosures.map(({ summary, story }) => [
    readableMarkupText(summary), readableMarkupText(story),
  ]), expected);
  for (const disclosure of disclosures) {
    assert.doesNotMatch(disclosure.attributes + disclosure.story, /\bhidden\b/);
    assert.doesNotMatch(disclosure.summaryAttributes, /\b(?:role|tabindex|aria-[\w-]+)\s*=/);
    assert.doesNotMatch(disclosure.summary, /<(?:a|button|input|select|textarea)\b/);
  }
});

test("timeline uses one native disclosure group with only the first story initially open", async () => {
  const disclosures = await readTimelineDisclosures();
  assert.equal(disclosures.length, 3);
  const groups = disclosures.map(({ attributes }) => attributes.match(/\bname="([^"]+)"/)?.[1]);
  assert.ok(groups.every(Boolean), "native exclusive grouping needs a nonempty name");
  assert.equal(new Set(groups).size, 1, "all three disclosures must share one group");
  assert.deepEqual(disclosures.map(({ attributes }) => /\bopen(?:\s|=|$)/.test(attributes)), [true, false, false]);
});

test("timeline decorative stars stay out of accessible milestone names and keyboard order", async () => {
  const disclosures = await readTimelineDisclosures();
  assert.equal(disclosures.length, 3);
  for (const { summary } of disclosures) {
    const icons = [...summary.matchAll(/<svg\b([^>]*)>/g)];
    assert.equal(icons.length, 1);
    assert.match(icons[0][1], /\baria-hidden="true"/);
    assert.match(icons[0][1], /\bfocusable="false"/);
    assert.doesNotMatch(icons[0][1], /\btabindex\s*=/);
  }
});

test("timeline disclosure controls retain touch-sized targets and visible keyboard focus", async () => {
  const css = await readFile("styles.css", "utf8");
  const summaryRules = css.match(/\.timeline summary\s*\{([^}]*)\}/)?.[1] || "";
  const minimumHeight = Number(summaryRules.match(/min-height:\s*([\d.]+)px;/)?.[1]);
  assert.ok(minimumHeight >= 44, "summary hit targets must be at least 44px high");
  const focusRules = css.match(/\.timeline summary:focus-visible\s*\{([^}]*)\}/)?.[1] || "";
  assert.match(focusRules, /outline:\s*3px solid #ffffff;/);
  assert.match(focusRules, /outline-offset:\s*4px;/);
});

test("timeline transitions honor manual pause as well as reduced-motion preference", async () => {
  const css = await readFile("styles.css", "utf8");
  const manualPause = css.match(/:root\[data-motion-paused="true"\] \.timeline details\s*\{([^}]*)\}/)?.[1] || "";
  assert.match(manualPause, /transition:\s*none;/);
  const reducedMotion = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reducedMotion, /transition-duration:\s*0\.01ms\s*!important;/);
});

test("timeline story contrast remains readable even over a bright translucent backdrop", async () => {
  const css = await readFile("styles.css", "utf8");
  const variables = new Map([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)]
    .map(([, name, value]) => [name, value]));
  function color(value) {
    const variable = value.match(/^var\((--[\w-]+)\)$/)?.[1];
    if (variable) return color(variables.get(variable));
    if (/^#[\da-f]{6}$/i.test(value)) {
      return [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
    }
    assert.match(value, /^rgba?\([\d.,\s]+\)$/);
    return value.match(/[\d.]+/g).map(Number);
  }
  function paint(foreground, background) {
    const alpha = foreground[3] ?? 1;
    return foreground.slice(0, 3).map((channel, index) =>
      channel * alpha + background[index] * (1 - alpha));
  }
  function luminance(rgb) {
    const channels = rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  const selectedCard = css.match(/\.timeline details\[open\]\s*\{([^}]*)\}/)?.[1] || "";
  const story = css.match(/\.timeline-story\s*\{([^}]*)\}/)?.[1] || "";
  const foreground = color(story.match(/\bcolor:\s*([^;]+);/)?.[1]);
  const card = color(selectedCard.match(/\bbackground:\s*([^;]+);/)?.[1]);
  // A white backdrop bounds any lighter pixel behind the translucent panel.
  const background = paint(card, paint(color(variables.get("--panel")), [255, 255, 255]));
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  const ratio = (light + 0.05) / (dark + 0.05);
  assert.ok(ratio >= 4.5, `story contrast ${ratio.toFixed(2)}:1 is below 4.5:1`);
});

test("star controls explain their result and share repeated-selection guidance", async () => {
  const html = await readFile("index.html", "utf8");
  for (const name of ["Naufal", "Rity"]) {
    const star = html.match(new RegExp(`<button[^>]*aria-label="Read a transmission from ${name}"[^>]*>`))?.[0] || "";
    assert.match(star, /aria-describedby="star-guidance"/);
  }
  assert.match(html, /id="star-guidance"[^>]*>\s*Select either star for a transmission\. Select again for another\./);
});

test("motion uses an action button with a changing label, without toggle state", async () => {
  const html = await readFile("index.html", "utf8");
  const button = html.match(/<button\b[^>]*data-motion-toggle[^>]*>[\s\S]*?<\/button>/)?.[0] || "";
  assert.match(button, /type="button"/);
  assert.match(button, />\s*Pause motion\s*<\/button>/);
  assert.doesNotMatch(button, /aria-pressed/);
  assert.doesNotMatch(button, /aria-label/);
});

test("active documentation credits only the replacement soundtrack", async () => {
  const readme = await readFile("README.md", "utf8");
  assert.match(readme, /“Has to Be” is by Capzlock/);
  assert.doesNotMatch(readme, /Lunar Drive|Mondo Loops/);
});

test("soundtrack control is a compact circle with a separate hint bubble", async () => {
  const styles = await readFile("styles.css", "utf8");
  const player = styles.match(/\.music-player\s*\{([^}]*)\}/)?.[1] || "";
  const status = styles.match(
    /\.music-player__status\s*\{([^}]*)\}/,
  )?.[1] || "";
  const toggle = styles.match(
    /\.music-player__toggle\s*\{([^}]*)\}/,
  )?.[1] || "";

  assert.match(player, /justify-items:\s*end;/);
  assert.match(player, /width:\s*max-content;/);
  assert.match(player, /max-width:\s*calc\(100vw - 1\.5rem\);/);
  assert.doesNotMatch(player, /background:\s*rgba/);
  assert.doesNotMatch(player, /padding:\s*0\.75rem/);

  assert.match(
    status,
    /max-width:\s*min\(16rem, calc\(100vw - 1\.5rem\)\);/,
  );
  assert.match(status, /padding:\s*0\.55rem 0\.7rem;/);
  assert.match(status, /background:\s*rgba\(8, 13, 39, 0\.94\);/);
  assert.match(status, /backdrop-filter:\s*blur\(12px\);/);

  assert.match(toggle, /width:\s*3rem;/);
  assert.match(toggle, /height:\s*3rem;/);
  assert.match(toggle, /min-width:\s*3rem;/);
  assert.match(toggle, /min-height:\s*3rem;/);
  assert.match(toggle, /padding:\s*0;/);
  assert.match(toggle, /border-radius:\s*50%;/);
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
    "assets/has-to-be.opus",
    "assets/social-preview.png",
    "index.html",
    "script.js",
    "src/audio.mjs",
    "src/content.mjs",
    "src/time.mjs",
    "styles.css",
  ]);

  assert.deepEqual(
    await readFile("_site/assets/has-to-be.opus"),
    await readFile("assets/has-to-be.opus"),
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

test("soundtrack metadata policy permits only clean identity tags", () => {
  assert.deepEqual(
    validateOpusTagComments([
      "title=Has to Be",
      "artist=Capzlock",
      "encoder=Lavf61.7.103",
    ]),
    [],
  );
});

test("soundtrack metadata policy rejects artwork URLs and source description tags", () => {
  assert.deepEqual(
    validateOpusTagComments([
      "title=Has to Be",
      "artist=Capzlock",
      "METADATA_BLOCK_PICTURE=AAAA",
      "purl=https://www.youtube.com/watch?v=example",
      "synopsis=source description",
    ]),
    [
      "Unapproved soundtrack metadata tag: metadata_block_picture",
      "Unapproved soundtrack metadata tag: purl",
      "Soundtrack metadata contains URL",
      "Unapproved soundtrack metadata tag: synopsis",
    ],
  );
});

test("validator accepts the committed sanitized soundtrack", async () => {
  const bytes = await readFile("assets/has-to-be.opus");
  assert.deepEqual(validateSoundtrack(bytes), []);
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
  const bytes = await readFile("assets/has-to-be.opus");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const searchable = bytes.toString("latin1");

  assert.equal(bytes.subarray(0, 4).toString("ascii"), "OggS");
  assert.equal(bytes.length, 4_352_134);
  assert.equal(
    digest,
    "d5fc2e189524fb8228651bc733555a327e9fe2f516fed6c7872f1bfe345a1d5e",
  );
  assert.match(searchable, /title=Has to Be/);
  assert.match(searchable, /artist=Capzlock/);
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
  const reducedMotionRules = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reducedMotionRules, /\.character-star\s*\{\s*animation:\s*none\s*!important;/);
  assert.match(reducedMotionRules, /\.motion-toggle\s*\{\s*display:\s*none;/);
});

test("orbit hover pause requires a hovered star on a hover-capable fine pointer", async () => {
  const css = await readFile("styles.css", "utf8");
  const hoverRule = /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{\s*\.orbit-scene:has\(\.character-star:hover\)\s+\.character-star\s*\{\s*animation-play-state:\s*paused;\s*\}\s*\}/;
  assert.match(css, hoverRule);
  assert.doesNotMatch(css, /\.orbit-scene:hover/);
  assert.doesNotMatch(css.replace(hoverRule, ""), /\.orbit-scene:has\(\.character-star:hover\)/);
});

test("keyboard-visible star focus pauses both stars without generic retained focus", async () => {
  const css = await readFile("styles.css", "utf8");
  const pausedRules = [...css.matchAll(/([^{}]+)\{([^{}]*animation-play-state:\s*paused;[^{}]*)\}/g)]
    .map((rule) => rule[1]);
  assert.ok(pausedRules.some((selectors) => selectors.includes(".orbit-scene:has(.character-star:focus-visible) .character-star")));
  assert.doesNotMatch(css, /\.orbit-scene:focus-within/);
  assert.match(css, /button:focus-visible\s*\{[^}]*outline:\s*3px solid #ffffff;/);
});

test("manual pause independently stops stars, background motion, and message reveal", async () => {
  const css = await readFile("styles.css", "utf8");
  const pausedRules = [...css.matchAll(/([^{}]+)\{([^{}]*animation-play-state:\s*paused;[^{}]*)\}/g)]
    .map((rule) => rule[1]);
  assert.ok(pausedRules.some((selectors) => selectors.includes(':root[data-motion-paused="true"] .character-star')));
  const manualPause = pausedRules.find((selectors) => selectors.includes(':root[data-motion-paused="true"] .character-star'));
  assert.doesNotMatch(manualPause, /:has\(|:hover|:focus/);
  for (const background of ["body::before", "body::after"]) {
    assert.ok(pausedRules.some((selectors) => selectors.includes(':root[data-motion-paused="true"] ' + background)));
  }
  assert.match(css, /:root\[data-motion-paused="true"\] \.message--reveal\s*\{\s*animation:\s*none;/);
});
