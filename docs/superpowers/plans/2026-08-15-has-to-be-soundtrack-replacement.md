# Has to Be Soundtrack Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the active “Lunar Drive — Mondo Loops” soundtrack with the user-supplied “Has to Be — Capzlock” Opus audio, preserve the existing playback/crossfade behavior at a 50% default volume, and keep the public asset privacy-bounded and deterministically validated.

**Architecture:** Keep the existing two-channel soundtrack controller in `src/audio.mjs` unchanged. Sanitize the supplied Ogg/Opus container once with an audio stream-copy, activate the new local `assets/has-to-be.opus` path everywhere, and strengthen the existing validator so the committed asset is size-bounded, SHA-256 pinned, structurally Opus, and limited to clean title/artist/encoder metadata. Update only the active player copy and README; historical Lunar Drive spec/plan documents stay untouched.

**Tech Stack:** Dependency-free JavaScript ES modules, Node.js built-in test runner, existing repository validator/builder, local `ffmpeg`/`ffprobe` only for one-time asset preparation and verification, GitHub Pages.

## Global Constraints

- Visible credit is exactly **“Has to Be — Capzlock.”**
- Initial hint is exactly **“Tap 🎵 to start Has to Be.”**
- Playback starts only after a direct visitor action; no autoplay.
- Default soundtrack target volume remains exactly **50% (`0.5`)**.
- Preserve the existing two-channel **five-second equal-power crossfade** and loop behavior.
- Preserve pause/resume, retry, standby authorization, `ended` fallback, and destroy-time cleanup behavior.
- Public soundtrack path is exactly `assets/has-to-be.opus`.
- The public asset must be an audio stream-copy of the supplied Opus audio, not a lossy re-encode.
- The public asset must remain below **5 MiB (5,242,880 bytes)**.
- Remove embedded artwork and source metadata; keep only `title=Has to Be`, `artist=Capzlock`, and an encoder tag if the muxer writes one.
- The final committed soundtrack bytes must be SHA-256 pinned in repository validation.
- Remove `assets/lunar-drive.opus` from active production assets and active references.
- Arbitrary additional `.opus` files remain rejected.
- No analytics, tracking, cookies, storage, third-party embeds, external runtime requests, playlists, seeking, shuffle, or volume slider.
- Do not change transmissions, shooting stars, sharing, timeline, relationship copy, soundtrack control layout, or unrelated behavior.
- Do not rewrite historical Lunar Drive design/plan documents.
- Do not commit permission correspondence or private evidence.
- Do **not** merge the implementation pull request without explicit user approval.

---

## File map

- **Create:** `assets/has-to-be.opus` — sanitized local public soundtrack, audio packets copied from the supplied file.
- **Delete:** `assets/lunar-drive.opus` — superseded public soundtrack asset.
- **Modify:** `scripts/validate.mjs` — new path, 5 MiB ceiling, new SHA-256, Ogg/Opus tag policy.
- **Modify:** `scripts/build-site.mjs` — copy only the new soundtrack into `_site`.
- **Modify:** `index.html` — point both hidden audio channels at the new asset and update the initial hint.
- **Modify:** `script.js` — update active soundtrack status/credit/error copy only.
- **Modify:** `README.md` — update the active soundtrack feature/credit.
- **Modify:** `tests/build.test.mjs` — path, size, validator, metadata, markup, and build assertions.
- **Modify:** `tests/controller.test.mjs` — player-state copy assertions.
- **Verify only:** `src/audio.mjs`, `tests/audio.test.mjs` — existing 50% target and crossfade behavior should remain unchanged.
- **Do not modify:** historical files under `docs/superpowers/specs/2026-08-09-*soundtrack*` and `docs/superpowers/plans/2026-08-09-*soundtrack*`.

---

### Task 1: Replace and policy-pin the public soundtrack asset

**Files:**
- Create: `assets/has-to-be.opus`
- Delete: `assets/lunar-drive.opus`
- Modify: `scripts/validate.mjs`
- Modify: `scripts/build-site.mjs`
- Modify: `index.html`
- Modify: `tests/build.test.mjs`

**Interfaces:**
- Consumes: the supplied source file `/mnt/data/Has to Be - Capzlock ( Instrumental Loop ｜ SLOWED + Reverb to Perfection.opus`.
- Produces: `assets/has-to-be.opus`, an Ogg/Opus file under 5 MiB whose audio packet stream matches the supplied source; `validateSoundtrack(bytes): string[]`; `validateOpusTagComments(comments): string[]`.
- Preserves: `src/audio.mjs`, all player control semantics, exact production artifact count, and the existing local-only runtime boundary.

- [ ] **Step 1: Update the build/validator tests first so the old production asset becomes RED**

In `tests/build.test.mjs`, extend the validator import:

```js
import {
  validateOpusTagComments,
  validateSoundtrack,
  validateTrackedEntries,
} from "../scripts/validate.mjs";
```

In `validateFixture()`, replace the fixture soundtrack path and copy source:

```js
const soundtrackPath = join(assetsDirectory, "has-to-be.opus");
```

```js
cp("assets/has-to-be.opus", soundtrackPath),
```

In the exact approved-path test, replace:

```js
"assets/lunar-drive.opus",
```

with:

```js
"assets/has-to-be.opus",
```

Keep the approved-path count at `20` because one soundtrack path replaces one soundtrack path.

Replace the approved-public-assets assertion with:

```js
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
  ]),
  [
    "Unapproved tracked path: assets/lunar-drive.opus",
    "Unapproved tracked path: assets/alternate.opus",
  ],
);
```

Replace the soundtrack-size boundary portion of the byte-limit test with the exact 5 MiB boundary:

```js
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
```

In the soundtrack markup test, change only the two-channel source assertion for this task:

```js
assert.match(channel, /src="assets\/has-to-be\.opus"/);
```

Leave the old hint assertion temporarily unchanged; Task 2 owns user-visible soundtrack naming.

In the build artifact test, replace the old path in the exact file list:

```js
"assets/has-to-be.opus",
```

and replace the byte-identity assertion with:

```js
assert.deepEqual(
  await readFile("_site/assets/has-to-be.opus"),
  await readFile("assets/has-to-be.opus"),
);
```

Add these metadata-policy tests near the existing soundtrack validator tests:

```js
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
```

Keep the existing modified-soundtrack fixture test; after the fixture path update it should continue proving the SHA pin rejects one-byte changes.

- [ ] **Step 2: Run the focused tests to verify RED before changing production files**

Run:

```bash
node --test \
  --test-name-pattern="repository policy|soundtrack markup|build emits|soundtrack metadata policy|committed sanitized soundtrack|modified soundtrack" \
  tests/build.test.mjs
```

Expected: FAIL because `validateOpusTagComments` does not exist yet, the approved path is still `assets/lunar-drive.opus`, and `assets/has-to-be.opus` has not been created.

- [ ] **Step 3: Create the sanitized asset with an Opus stream-copy**

From the repository root, set the source path and create the new asset:

```bash
SOURCE='/mnt/data/Has to Be - Capzlock ( Instrumental Loop ｜ SLOWED + Reverb to Perfection.opus'
rm -f assets/has-to-be.opus
ffmpeg -hide_banner -loglevel error \
  -i "$SOURCE" \
  -map 0:a:0 \
  -c:a copy \
  -map_metadata -1 \
  -metadata:s:a:0 title='Has to Be' \
  -metadata:s:a:0 artist='Capzlock' \
  assets/has-to-be.opus
```

Do not use `libopus`, a bitrate flag, a filter, resampling, normalization, or any other re-encoding option.

- [ ] **Step 4: Verify the sanitized asset before pinning it**

Inspect source and sanitized streams:

```bash
ffprobe -v error \
  -show_entries stream=index,codec_name,codec_type,sample_rate,channels:stream_tags \
  -of json \
  "$SOURCE"

ffprobe -v error \
  -show_entries stream=index,codec_name,codec_type,sample_rate,channels:stream_tags \
  -of json \
  assets/has-to-be.opus
```

Expected for `assets/has-to-be.opus`:

- exactly one stream;
- `codec_name` is `opus`;
- `codec_type` is `audio`;
- sample rate is `48000`;
- channels is `2`;
- title is `Has to Be`;
- artist is `Capzlock`;
- an `encoder` tag is allowed;
- no MJPEG/video stream;
- no `METADATA_BLOCK_PICTURE`, `purl`, `synopsis`, `DESCRIPTION`, album, genre, or source URL tag.

Verify that the compressed audio packets are byte-identical across the remux:

```bash
ffmpeg -v error -i "$SOURCE" -map 0:a:0 -c:a copy -f hash -hash sha256 -
ffmpeg -v error -i assets/has-to-be.opus -map 0:a:0 -c:a copy -f hash -hash sha256 -
```

Expected from both commands:

```text
SHA256=7ea3aaa7a8228b73706bfd13f6ee88c4cd13a1e72cb6e5017deec4285076e0f0
```

Verify the size ceiling:

```bash
SIZE=$(stat -c '%s' assets/has-to-be.opus)
printf '%s\n' "$SIZE"
test "$SIZE" -lt 5242880
```

A planning-environment remux was `4,352,134` bytes; the exact Ogg container bytes may differ with muxer version, so only the `< 5,242,880` requirement is normative.

Finally compute the exact container digest that will be pinned:

```bash
sha256sum assets/has-to-be.opus
```

Record the 64-hex digest printed for the exact file that will be committed. On the planning environment the exploratory remux digest was `dd2f4064a1648f6cf7f2ecd4306381e13eddc3fd00dbd17222cc8cffcda07e56`; if execution produces different container bytes, pin the execution asset’s digest after the stream/metadata checks above rather than forcing the exploratory digest.

- [ ] **Step 5: Strengthen `scripts/validate.mjs` for the replacement asset and clean Opus tags**

Replace the soundtrack constants with:

```js
const MAX_SOUNDTRACK_BYTES = 5 * 1024 * 1024;
const SOUNDTRACK_PATH = "assets/has-to-be.opus";
const SOUNDTRACK_SHA256 =
  "<the exact 64-hex digest printed by sha256sum in Step 4>";
```

The value in `SOUNDTRACK_SHA256` must be the literal digest from Step 4 before this task is committed; do not leave angle brackets or temporary text in the file.

Replace `assets/lunar-drive.opus` with `assets/has-to-be.opus` in both `APPROVED_EXACT_PATHS` and `DEPLOYED_SOURCE_PATHS`.

Add these helpers immediately before `validateSoundtrack()`:

```js
function extractOggPackets(input) {
  const bytes = Buffer.from(input);
  const packets = [];
  const serials = new Set();
  let pending = [];
  let pendingLength = 0;
  let offset = 0;

  while (offset < bytes.length) {
    if (
      offset + 27 > bytes.length ||
      bytes.subarray(offset, offset + 4).toString("ascii") !== "OggS" ||
      bytes[offset + 4] !== 0
    ) {
      throw new Error("Malformed Ogg page");
    }

    const segmentCount = bytes[offset + 26];
    const tableStart = offset + 27;
    const dataStart = tableStart + segmentCount;
    if (dataStart > bytes.length) throw new Error("Malformed Ogg segment table");

    const lacingValues = bytes.subarray(tableStart, dataStart);
    const bodyLength = [...lacingValues].reduce(
      (total, value) => total + value,
      0,
    );
    const pageEnd = dataStart + bodyLength;
    if (pageEnd > bytes.length) throw new Error("Truncated Ogg page");

    serials.add(bytes.readUInt32LE(offset + 14));
    let cursor = dataStart;
    for (const segmentLength of lacingValues) {
      pending.push(bytes.subarray(cursor, cursor + segmentLength));
      pendingLength += segmentLength;
      cursor += segmentLength;
      if (segmentLength < 255) {
        packets.push(Buffer.concat(pending, pendingLength));
        pending = [];
        pendingLength = 0;
      }
    }
    offset = pageEnd;
  }

  if (pendingLength !== 0) throw new Error("Truncated Ogg packet");
  return { packets, serials };
}

function parseOpusTagsPacket(packet) {
  if (packet.subarray(0, 8).toString("ascii") !== "OpusTags") {
    throw new Error("Missing OpusTags packet");
  }

  let offset = 8;
  function readLength() {
    if (offset + 4 > packet.length) throw new Error("Truncated OpusTags length");
    const value = packet.readUInt32LE(offset);
    offset += 4;
    return value;
  }

  const vendorLength = readLength();
  if (offset + vendorLength > packet.length) {
    throw new Error("Truncated OpusTags vendor");
  }
  offset += vendorLength;

  const commentCount = readLength();
  const comments = [];
  for (let index = 0; index < commentCount; index += 1) {
    const length = readLength();
    if (offset + length > packet.length) {
      throw new Error("Truncated OpusTags comment");
    }
    comments.push(packet.subarray(offset, offset + length).toString("utf8"));
    offset += length;
  }
  return comments;
}

export function validateOpusTagComments(comments) {
  const errors = [];
  const allowedKeys = new Set(["title", "artist", "encoder"]);
  const values = new Map();

  for (const comment of comments) {
    const separator = comment.indexOf("=");
    if (separator <= 0) {
      errors.push("Malformed soundtrack metadata comment");
      continue;
    }

    const key = comment.slice(0, separator).trim().toLowerCase();
    const value = comment.slice(separator + 1);
    const existing = values.get(key) || [];
    existing.push(value);
    values.set(key, existing);

    if (!allowedKeys.has(key)) {
      errors.push("Unapproved soundtrack metadata tag: " + key);
    }
    if (/https?:\/\/|www\./i.test(value)) {
      errors.push("Soundtrack metadata contains URL");
    }
  }

  if (
    values.get("title")?.length !== 1 ||
    values.get("title")[0] !== "Has to Be"
  ) {
    errors.push("Soundtrack title metadata mismatch");
  }
  if (
    values.get("artist")?.length !== 1 ||
    values.get("artist")[0] !== "Capzlock"
  ) {
    errors.push("Soundtrack artist metadata mismatch");
  }
  if ((values.get("encoder")?.length || 0) > 1) {
    errors.push("Duplicate soundtrack encoder metadata");
  }
  return errors;
}
```

Then replace `validateSoundtrack()` with this implementation, preserving the size and SHA checks while adding structural/tag validation:

```js
export function validateSoundtrack(bytes) {
  const errors = [];
  const buffer = Buffer.from(bytes);

  if (buffer.length > MAX_SOUNDTRACK_BYTES) {
    errors.push("Soundtrack exceeds size limit");
  }
  if (buffer.subarray(0, 4).toString("ascii") !== "OggS") {
    errors.push("Soundtrack is not an Ogg/Opus container");
  } else {
    try {
      const { packets, serials } = extractOggPackets(buffer);
      if (serials.size !== 1) {
        errors.push("Soundtrack must contain exactly one Ogg logical stream");
      }
      if (packets[0]?.subarray(0, 8).toString("ascii") !== "OpusHead") {
        errors.push("Soundtrack is missing an OpusHead packet");
      }
      if (!packets[1]) {
        errors.push("Soundtrack is missing an OpusTags packet");
      } else {
        errors.push(
          ...validateOpusTagComments(parseOpusTagsPacket(packets[1])),
        );
      }
    } catch {
      errors.push("Soundtrack Ogg structure is malformed");
    }
  }

  const digest = createHash("sha256").update(buffer).digest("hex");
  if (digest !== SOUNDTRACK_SHA256) {
    errors.push("Soundtrack SHA-256 mismatch");
  }
  return errors;
}
```

This keeps CI dependency-free: `ffprobe` is only a one-time preparation check; the committed asset’s structure/tags are enforced by Node plus the exact SHA pin thereafter.

- [ ] **Step 6: Cut the active production path over to `assets/has-to-be.opus`**

In `scripts/build-site.mjs`, replace the old soundtrack copy with:

```js
await cp(
  "assets/has-to-be.opus",
  "_site/assets/has-to-be.opus",
);
```

In `index.html`, change both hidden audio elements to:

```html
src="assets/has-to-be.opus"
```

Do not change the visible soundtrack hint yet; Task 2 owns all user-facing identity copy.

Remove the superseded asset:

```bash
rm assets/lunar-drive.opus
```

- [ ] **Step 7: Run the focused build/validator tests to verify GREEN**

Run:

```bash
node --test \
  --test-name-pattern="repository policy|soundtrack markup|build emits|soundtrack metadata policy|committed sanitized soundtrack|modified soundtrack" \
  tests/build.test.mjs
node scripts/validate.mjs
node scripts/build-site.mjs
```

Expected:

- focused tests PASS;
- validator exits `0` and still reports the same approved runtime-file count;
- build exits `0`;
- `_site/assets/has-to-be.opus` exists;
- `_site/assets/lunar-drive.opus` does not exist.

- [ ] **Step 8: Review the asset/policy diff and commit Task 1**

Run:

```bash
git diff --check
git diff -- scripts/validate.mjs scripts/build-site.mjs index.html tests/build.test.mjs
git status --short
```

The binary diff should show `assets/has-to-be.opus` added and `assets/lunar-drive.opus` deleted. No unrelated runtime file should change.

Commit:

```bash
git add \
  assets/has-to-be.opus \
  assets/lunar-drive.opus \
  scripts/validate.mjs \
  scripts/build-site.mjs \
  index.html \
  tests/build.test.mjs
git commit -m "feat: replace public soundtrack asset"
```

---

### Task 2: Update active soundtrack identity copy and preserve the 50% controller behavior

**Files:**
- Modify: `tests/controller.test.mjs`
- Modify: `tests/build.test.mjs`
- Modify: `script.js`
- Modify: `index.html`
- Modify: `README.md`
- Verify only: `src/audio.mjs`, `tests/audio.test.mjs`

**Interfaces:**
- Consumes: the replacement asset/path from Task 1 and the existing `createCrossfadeController()` API.
- Produces: exact active UI copy for “Has to Be — Capzlock”.
- Preserves: `DEFAULT_TARGET_VOLUME = 0.5`, equal-power crossfade math, playback state machine, control layout, and all unrelated site behavior.

- [ ] **Step 1: Update player-copy tests first to verify RED**

In `tests/controller.test.mjs`, replace the expected active soundtrack strings as follows:

```text
Tap 🎵 to start Lunar Drive.
→ Tap 🎵 to start Has to Be.

Lunar Drive — Mondo Loops
→ Has to Be — Capzlock

Lunar Drive — Mondo Loops · Paused
→ Has to Be — Capzlock · Paused

Lunar Drive couldn’t start. Tap to try again.
→ Has to Be couldn’t start. Tap to try again.
```

Apply those replacements only to soundtrack-control assertions; do not touch unrelated tests.

In the soundtrack markup test in `tests/build.test.mjs`, replace the temporary old hint assertion with:

```js
assert.match(html, /Tap 🎵 to start Has to Be\./);
```

Add a focused README assertion:

```js
test("active documentation credits only the replacement soundtrack", async () => {
  const readme = await readFile("README.md", "utf8");
  assert.match(readme, /“Has to Be” is by Capzlock/);
  assert.doesNotMatch(readme, /Lunar Drive|Mondo Loops/);
});
```

- [ ] **Step 2: Run the identity-copy tests to verify RED**

Run:

```bash
node --test \
  --test-name-pattern="soundtrack|active documentation credits" \
  tests/controller.test.mjs tests/build.test.mjs
```

Expected: FAIL because `index.html`, `script.js`, and `README.md` still display Lunar Drive / Mondo Loops.

- [ ] **Step 3: Update the active player copy in `index.html` and `script.js`**

In `index.html`, set the initial status text to:

```html
Tap 🎵 to start Has to Be.
```

In `script.js`, keep the existing `renderMusicState()` structure and change only its status strings:

```js
idle: {
  accessibleLabel: "Play soundtrack",
  icon: "🎵",
  pressed: "false",
  status: "Tap 🎵 to start Has to Be.",
},
starting: {
  accessibleLabel: "Pause soundtrack",
  icon: "⏸",
  pressed: "true",
  status: "Tap 🎵 to start Has to Be.",
},
playing: {
  accessibleLabel: "Pause soundtrack",
  icon: "⏸",
  pressed: "true",
  status: "Has to Be — Capzlock",
},
resuming: {
  accessibleLabel: "Pause soundtrack",
  icon: "⏸",
  pressed: "true",
  status: "Has to Be — Capzlock",
},
paused: {
  accessibleLabel: "Resume soundtrack",
  icon: "▶",
  pressed: "false",
  status: "Has to Be — Capzlock · Paused",
},
error: {
  accessibleLabel: "Retry soundtrack",
  icon: "↻",
  pressed: "false",
  status: "Has to Be couldn’t start. Tap to try again.",
},
```

Do not pass a new `targetVolume` argument into `createCrossfadeController()`. The controller already defaults to `0.5`; changing the call site would be redundant and would create two sources of truth.

- [ ] **Step 4: Update the active README credit only**

In the Features list, replace the old soundtrack bullet with:

```markdown
- Optional local “Has to Be” soundtrack with manual play/pause and a five-second crossfade loop
```

Replace the active Soundtrack section body with:

```markdown
“Has to Be” is by Capzlock and is included here with permission. Playback is optional, starts only after a visitor presses Play, and makes no third-party request.
```

Do not edit the historical soundtrack design/plan documents.

- [ ] **Step 5: Run focused copy tests to verify GREEN**

Run:

```bash
node --test \
  --test-name-pattern="soundtrack|active documentation credits" \
  tests/controller.test.mjs tests/build.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Re-run the existing 50% and crossfade controller tests without changing controller code**

Run:

```bash
node --test tests/audio.test.mjs
```

Expected: PASS, including the existing assertions that the default equal-power target is `0.5`, the active channel starts at `0.5`, and the five-second crossfade scales both channels to the same target.

Confirm no controller implementation diff exists:

```bash
git diff -- src/audio.mjs
```

Expected: no output.

- [ ] **Step 7: Review and commit Task 2**

Run:

```bash
git diff --check
git diff -- script.js index.html README.md tests/controller.test.mjs tests/build.test.mjs
git status --short
```

Commit:

```bash
git add script.js index.html README.md tests/controller.test.mjs tests/build.test.mjs
git commit -m "feat: update soundtrack identity"
```

---

### Task 3: Run full verification, prove stale production references are gone, and open the PR

**Files:**
- Verify all files changed by Tasks 1–2.
- No additional source changes are expected.

**Interfaces:**
- Consumes: completed Task 1 and Task 2 commits.
- Produces: a fully verified feature branch and an unmerged pull request ready for explicit user approval.
- Preserves: production behavior outside the soundtrack replacement.

- [ ] **Step 1: Run the complete automated suite and repository validator**

Run:

```bash
node --test tests/*.test.mjs
node scripts/validate.mjs
```

Expected: every test passes and validator exits `0` with no privacy, path, size, metadata, hash, or runtime-reference errors.

- [ ] **Step 2: Build and verify the exact production artifact boundary**

Run:

```bash
node scripts/build-site.mjs
find _site -type f -printf '%P\n' | sort
```

Expected exact file list:

```text
.nojekyll
assets/favicon.svg
assets/has-to-be.opus
assets/social-preview.png
index.html
script.js
src/audio.mjs
src/content.mjs
src/time.mjs
styles.css
```

Verify the soundtrack is copied byte-for-byte:

```bash
cmp assets/has-to-be.opus _site/assets/has-to-be.opus
sha256sum assets/has-to-be.opus _site/assets/has-to-be.opus
```

Expected: `cmp` exits `0`; both SHA-256 values are identical and equal the literal `SOUNDTRACK_SHA256` value committed in `scripts/validate.mjs`.

- [ ] **Step 3: Re-check the committed audio stream and metadata**

Run:

```bash
ffprobe -v error \
  -show_entries stream=index,codec_name,codec_type,sample_rate,channels:stream_tags \
  -of json \
  assets/has-to-be.opus
```

Expected: one stereo 48 kHz Opus audio stream; `title=Has to Be`; `artist=Capzlock`; optional encoder tag only; no image/video stream and no source URL/description/artwork metadata.

Re-confirm the compressed audio packet hash against the user-supplied source:

```bash
SOURCE='/mnt/data/Has to Be - Capzlock ( Instrumental Loop ｜ SLOWED + Reverb to Perfection.opus'
ffmpeg -v error -i "$SOURCE" -map 0:a:0 -c:a copy -f hash -hash sha256 -
ffmpeg -v error -i assets/has-to-be.opus -map 0:a:0 -c:a copy -f hash -hash sha256 -
```

Expected from both commands:

```text
SHA256=7ea3aaa7a8228b73706bfd13f6ee88c4cd13a1e72cb6e5017deec4285076e0f0
```

- [ ] **Step 4: Prove there are no stale active Lunar Drive references**

Search only active production/test/docs surfaces, deliberately excluding historical dated soundtrack specs/plans:

```bash
grep -RInE \
  'Lunar Drive|Mondo Loops|lunar-drive\.opus' \
  README.md index.html script.js scripts src tests .github \
  || true
```

Expected: no output.

Confirm the historical documents still exist unchanged:

```bash
git diff main...HEAD -- \
  'docs/superpowers/specs/2026-08-09-*soundtrack*' \
  'docs/superpowers/plans/2026-08-09-*soundtrack*'
```

Expected: no output.

- [ ] **Step 5: Run local HTTP smoke checks against the built site**

Start a temporary server:

```bash
python3 -m http.server 4173 -d _site >/tmp/our-tiny-universe-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
```

Check the page and soundtrack asset:

```bash
curl -fsS http://127.0.0.1:4173/ >/tmp/our-tiny-universe-index.html
curl -fsS http://127.0.0.1:4173/assets/has-to-be.opus >/tmp/our-tiny-universe-soundtrack.opus
cmp assets/has-to-be.opus /tmp/our-tiny-universe-soundtrack.opus
```

Expected: both requests succeed and the served soundtrack matches the committed asset byte-for-byte.

Stop the server when finished:

```bash
kill "$SERVER_PID"
trap - EXIT
```

Browser-level manual playback is a post-merge/live-site verification item; do not claim it from these HTTP checks alone.

- [ ] **Step 6: Review the final branch diff and scope**

Run:

```bash
git diff --check
git status --short
git diff main...HEAD --stat
git diff main...HEAD -- \
  README.md \
  index.html \
  script.js \
  scripts/build-site.mjs \
  scripts/validate.mjs \
  tests/build.test.mjs \
  tests/controller.test.mjs
```

Expected changed implementation surfaces:

- `assets/has-to-be.opus` added;
- `assets/lunar-drive.opus` deleted;
- `README.md`;
- `index.html`;
- `script.js`;
- `scripts/build-site.mjs`;
- `scripts/validate.mjs`;
- `tests/build.test.mjs`;
- `tests/controller.test.mjs`;
- this approved replacement spec and implementation plan.

Expected unchanged runtime surfaces include `src/audio.mjs`, `src/content.mjs`, `src/time.mjs`, `styles.css`, and unrelated tests/workflows.

- [ ] **Step 7: Push the verified branch and open an unmerged pull request**

If executing in a local clone, push the existing branch:

```bash
git push -u origin feature/replace-soundtrack-has-to-be
```

Open a PR with title:

```text
Replace soundtrack with Has to Be
```

Use this PR summary:

```markdown
## Summary

- replace the local Lunar Drive soundtrack with the user-approved “Has to Be — Capzlock” Opus asset
- strip embedded artwork/source metadata while preserving the original compressed audio packets
- keep the existing manual playback, 50% default volume, and five-second equal-power loop crossfade
- update deterministic build/validator policy to the new asset path, 5 MiB ceiling, clean metadata policy, and exact SHA-256 pin
- update active player/README credit without changing unrelated site behavior

## Verification

- full Node test suite passes
- repository validator passes
- deterministic 10-file production build passes
- soundtrack build copy is byte-identical to the committed asset
- source and sanitized soundtrack audio packet hashes match
- sanitized asset is one stereo 48 kHz Opus audio stream with clean title/artist metadata and no embedded artwork/source URLs
- no stale Lunar Drive production/test references remain
- local HTTP page/asset smoke checks pass

## Merge gate

Do not merge without explicit user approval.
```

Do **not** merge the PR. Hand back the PR number, exact head SHA, CI state, and verification summary for user approval.

---

## Post-merge verification (only after separate explicit merge approval)

After an approved merge, verify the first GitHub Pages run on the exact merge SHA, then verify the live page serves `assets/has-to-be.opus`. A real browser/manual check must confirm the visible credit, explicit-start playback, pause/resume, 50% target behavior as observable through the existing controller, and a smooth five-second loop transition. If deployment or playback is not freshly verified, report that limitation rather than inferring success from CI alone.
