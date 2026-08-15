# Has to Be Soundtrack Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the active “Lunar Drive — Mondo Loops” soundtrack with the user-supplied “Has to Be — Capzlock” Opus audio while preserving the existing 50% default volume, two-channel five-second equal-power loop crossfade, accessibility behavior, privacy boundary, and deterministic GitHub Pages build.

**Architecture:** Keep `src/audio.mjs` unchanged. Sanitize the supplied Ogg/Opus container once with an Opus stream-copy, activate only `assets/has-to-be.opus`, strengthen `scripts/validate.mjs` so the committed asset is size-bounded, SHA-256 pinned, structurally Opus, and limited to approved metadata, then update the active player/README identity copy. Historical Lunar Drive specs/plans remain untouched.

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
- **Verify only:** `src/audio.mjs`, `tests/audio.test.mjs` — existing 50% target and crossfade behavior must remain unchanged.
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
- Consumes: `/mnt/data/Has to Be - Capzlock ( Instrumental Loop ｜ SLOWED + Reverb to Perfection.opus`.
- Produces: `assets/has-to-be.opus`; `validateSoundtrack(bytes): string[]`; `validateOpusTagComments(comments): string[]`.
- Preserves: all player control semantics and the exact 10-file production artifact boundary.

- [ ] **Step 1: Write the replacement-path and metadata-policy tests first**

In `tests/build.test.mjs`, replace the validator import with:

```js
import {
  validateOpusTagComments,
  validateSoundtrack,
  validateTrackedEntries,
} from "../scripts/validate.mjs";
```

In `validateFixture()`, change the fixture soundtrack to the new path:

```js
const soundtrackPath = join(assetsDirectory, "has-to-be.opus");
```

and:

```js
cp("assets/has-to-be.opus", soundtrackPath),
```

In the exact approved-path test, replace `assets/lunar-drive.opus` with:

```js
"assets/has-to-be.opus",
```

Keep the approved-path count at `20`.

Replace the soundtrack portion of the approved-assets test with:

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

Replace the soundtrack byte-limit assertions with the exact 5 MiB boundary:

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

In the existing soundtrack-markup test, change only the channel source assertion for this task:

```js
assert.match(channel, /src="assets\/has-to-be\.opus"/);
```

Leave its old visible hint assertion unchanged until Task 2.

In the build-artifact test, replace the old soundtrack path in the exact file list with:

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

Add these tests near the existing soundtrack validator tests:

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

Keep the existing modified-soundtrack fixture test; after the fixture-path replacement it must still prove that a one-byte mutation produces `Soundtrack SHA-256 mismatch`.

- [ ] **Step 2: Run the focused tests to verify RED**

Run:

```bash
node --test \
  --test-name-pattern="repository policy|soundtrack markup|build emits|soundtrack metadata policy|committed sanitized soundtrack|modified soundtrack" \
  tests/build.test.mjs
```

Expected: FAIL because `validateOpusTagComments` does not exist, the validator still approves the Lunar Drive path, and `assets/has-to-be.opus` does not exist.

- [ ] **Step 3: Create the sanitized asset with an Opus stream-copy**

Run from the repository root:

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

Do not use `libopus`, bitrate flags, filters, resampling, normalization, or any other re-encoding option.

- [ ] **Step 4: Verify the sanitized asset before pinning it**

Run:

```bash
ffprobe -v error \
  -show_entries stream=index,codec_name,codec_type,sample_rate,channels:stream_tags \
  -of json \
  assets/has-to-be.opus
```

Expected:

- exactly one stream;
- `codec_name: opus`;
- `codec_type: audio`;
- sample rate `48000`;
- `2` channels;
- title `Has to Be`;
- artist `Capzlock`;
- optional encoder tag only;
- no MJPEG/video stream;
- no `METADATA_BLOCK_PICTURE`, `purl`, `synopsis`, `DESCRIPTION`, album, genre, or source URL metadata.

Prove the compressed audio packet stream was copied rather than re-encoded:

```bash
ffmpeg -v error -i "$SOURCE" -map 0:a:0 -c:a copy -f hash -hash sha256 -
ffmpeg -v error -i assets/has-to-be.opus -map 0:a:0 -c:a copy -f hash -hash sha256 -
```

Expected from both commands:

```text
SHA256=7ea3aaa7a8228b73706bfd13f6ee88c4cd13a1e72cb6e5017deec4285076e0f0
```

Check the size and compute the exact container hash:

```bash
SIZE=$(stat -c '%s' assets/has-to-be.opus)
printf '%s\n' "$SIZE"
test "$SIZE" -lt 5242880
DIGEST=$(sha256sum assets/has-to-be.opus | awk '{print $1}')
printf '%s\n' "$DIGEST"
test "${#DIGEST}" -eq 64
```

The planning-environment remux was `4,352,134` bytes with container digest `dd2f4064a1648f6cf7f2ecd4306381e13eddc3fd00dbd17222cc8cffcda07e56`. Those are useful cross-checks, but the exact execution asset’s digest is the one to pin after all checks above pass.

- [ ] **Step 5: Update `scripts/validate.mjs` for the new path and 5 MiB ceiling**

Set:

```js
const MAX_SOUNDTRACK_BYTES = 5 * 1024 * 1024;
const SOUNDTRACK_PATH = "assets/has-to-be.opus";
```

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

Replace `validateSoundtrack()` with:

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

- [ ] **Step 6: Pin the exact container digest without leaving a temporary value**

Run this immediately after the validator edits while `$DIGEST` still contains the Step 4 result:

```bash
python3 - "$DIGEST" <<'PY'
from pathlib import Path
import re
import sys

path = Path("scripts/validate.mjs")
source = path.read_text()
digest = sys.argv[1]
updated, count = re.subn(
    r'const SOUNDTRACK_SHA256 =\n\s+"[0-9a-f]{64}";',
    f'const SOUNDTRACK_SHA256 =\n  "{digest}";',
    source,
    count=1,
)
if count != 1:
    raise SystemExit("expected exactly one existing SOUNDTRACK_SHA256 constant")
path.write_text(updated)
PY
```

Then verify the literal pin is present and matches the asset:

```bash
grep -A1 'const SOUNDTRACK_SHA256' scripts/validate.mjs
sha256sum assets/has-to-be.opus
```

Expected: the same 64-hex digest appears in both places. No temporary marker is written to the source file at any point.

- [ ] **Step 7: Cut the production asset path over**

In `scripts/build-site.mjs`, use:

```js
await cp(
  "assets/has-to-be.opus",
  "_site/assets/has-to-be.opus",
);
```

In both hidden `<audio>` elements in `index.html`, set:

```html
src="assets/has-to-be.opus"
```

Do not change the visible hint yet; Task 2 owns soundtrack identity copy.

Remove the old asset:

```bash
rm assets/lunar-drive.opus
```

- [ ] **Step 8: Run the focused tests and builder to verify GREEN**

Run:

```bash
node --test \
  --test-name-pattern="repository policy|soundtrack markup|build emits|soundtrack metadata policy|committed sanitized soundtrack|modified soundtrack" \
  tests/build.test.mjs
node scripts/validate.mjs
node scripts/build-site.mjs
```

Expected: all focused tests pass, validator exits `0`, build exits `0`, `_site/assets/has-to-be.opus` exists, and `_site/assets/lunar-drive.opus` does not exist.

- [ ] **Step 9: Review and commit Task 1**

Run:

```bash
git diff --check
git diff -- scripts/validate.mjs scripts/build-site.mjs index.html tests/build.test.mjs
git status --short
```

Expected binary changes: `assets/has-to-be.opus` added and `assets/lunar-drive.opus` deleted. No unrelated runtime file changes.

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

### Task 2: Update active soundtrack identity copy and verify the existing 50% controller

**Files:**
- Modify: `tests/controller.test.mjs`
- Modify: `tests/build.test.mjs`
- Modify: `script.js`
- Modify: `index.html`
- Modify: `README.md`
- Verify only: `src/audio.mjs`, `tests/audio.test.mjs`

**Interfaces:**
- Consumes: `assets/has-to-be.opus` and the existing `createCrossfadeController()` API.
- Produces: exact active UI copy for “Has to Be — Capzlock”.
- Preserves: `DEFAULT_TARGET_VOLUME = 0.5`, equal-power crossfade math, playback state machine, and control layout.

- [ ] **Step 1: Update player-copy tests first**

In `tests/controller.test.mjs`, replace only soundtrack-control expected strings:

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

In the soundtrack-markup test in `tests/build.test.mjs`, replace the temporary old hint assertion with:

```js
assert.match(html, /Tap 🎵 to start Has to Be\./);
```

Add:

```js
test("active documentation credits only the replacement soundtrack", async () => {
  const readme = await readFile("README.md", "utf8");
  assert.match(readme, /“Has to Be” is by Capzlock/);
  assert.doesNotMatch(readme, /Lunar Drive|Mondo Loops/);
});
```

- [ ] **Step 2: Run identity-copy tests to verify RED**

Run:

```bash
node --test \
  --test-name-pattern="soundtrack|active documentation credits" \
  tests/controller.test.mjs tests/build.test.mjs
```

Expected: FAIL because `index.html`, `script.js`, and `README.md` still name Lunar Drive / Mondo Loops.

- [ ] **Step 3: Update active player copy only**

In `index.html`, set the status text to:

```html
Tap 🎵 to start Has to Be.
```

In `script.js`, keep `renderMusicState()` structurally unchanged and use these status strings:

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

Do not pass a new `targetVolume` into `createCrossfadeController()`. The controller already defaults to `0.5`; keep one source of truth.

- [ ] **Step 4: Update the active README credit only**

Replace the soundtrack feature bullet with:

```markdown
- Optional local “Has to Be” soundtrack with manual play/pause and a five-second crossfade loop
```

Replace the active Soundtrack section body with:

```markdown
“Has to Be” is by Capzlock and is included here with permission. Playback is optional, starts only after a visitor presses Play, and makes no third-party request.
```

Do not edit historical soundtrack specs/plans.

- [ ] **Step 5: Run focused copy tests to verify GREEN**

Run:

```bash
node --test \
  --test-name-pattern="soundtrack|active documentation credits" \
  tests/controller.test.mjs tests/build.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Re-run the existing 50%/crossfade tests without changing controller code**

Run:

```bash
node --test tests/audio.test.mjs
git diff -- src/audio.mjs
```

Expected: audio tests PASS, including the existing default-target assertions for `0.5`; `git diff -- src/audio.mjs` prints nothing.

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

### Task 3: Run full verification and open an unmerged PR

**Files:**
- Verify all files changed by Tasks 1–2.
- No additional source changes are expected.

**Interfaces:**
- Consumes: completed Task 1 and Task 2 commits.
- Produces: a fully verified feature branch and an unmerged PR ready for explicit user approval.

- [ ] **Step 1: Run the complete automated suite and validator**

Run:

```bash
node --test tests/*.test.mjs
node scripts/validate.mjs
```

Expected: every test passes; validator exits `0` with no privacy, path, size, metadata, hash, or runtime-reference errors.

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

Verify byte identity and SHA pin:

```bash
cmp assets/has-to-be.opus _site/assets/has-to-be.opus
sha256sum assets/has-to-be.opus _site/assets/has-to-be.opus
grep -A1 'const SOUNDTRACK_SHA256' scripts/validate.mjs
```

Expected: `cmp` exits `0`; both hashes are identical and equal the literal validator pin.

- [ ] **Step 3: Re-check audio structure, metadata, and stream-copy identity**

Run:

```bash
ffprobe -v error \
  -show_entries stream=index,codec_name,codec_type,sample_rate,channels:stream_tags \
  -of json \
  assets/has-to-be.opus
```

Expected: one stereo 48 kHz Opus audio stream; title `Has to Be`; artist `Capzlock`; optional encoder tag only; no image/video stream and no source URL/description/artwork metadata.

Re-check packet identity:

```bash
SOURCE='/mnt/data/Has to Be - Capzlock ( Instrumental Loop ｜ SLOWED + Reverb to Perfection.opus'
ffmpeg -v error -i "$SOURCE" -map 0:a:0 -c:a copy -f hash -hash sha256 -
ffmpeg -v error -i assets/has-to-be.opus -map 0:a:0 -c:a copy -f hash -hash sha256 -
```

Expected from both:

```text
SHA256=7ea3aaa7a8228b73706bfd13f6ee88c4cd13a1e72cb6e5017deec4285076e0f0
```

- [ ] **Step 4: Prove stale active Lunar Drive references are gone**

Search active surfaces only, excluding historical dated soundtrack docs:

```bash
grep -RInE \
  'Lunar Drive|Mondo Loops|lunar-drive\.opus' \
  README.md index.html script.js scripts src tests .github \
  || true
```

Expected: no output.

Confirm historical soundtrack docs are untouched:

```bash
git diff main...HEAD -- \
  'docs/superpowers/specs/2026-08-09-*soundtrack*' \
  'docs/superpowers/plans/2026-08-09-*soundtrack*'
```

Expected: no output.

- [ ] **Step 5: Run local HTTP smoke checks**

Start the built site:

```bash
python3 -m http.server 4173 -d _site >/tmp/our-tiny-universe-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
```

Check page and soundtrack delivery:

```bash
curl -fsS http://127.0.0.1:4173/ >/tmp/our-tiny-universe-index.html
curl -fsS http://127.0.0.1:4173/assets/has-to-be.opus >/tmp/our-tiny-universe-soundtrack.opus
cmp assets/has-to-be.opus /tmp/our-tiny-universe-soundtrack.opus
```

Expected: both requests succeed and the served soundtrack is byte-identical.

Stop the server:

```bash
kill "$SERVER_PID"
trap - EXIT
```

Do not claim browser playback from HTTP checks alone.

- [ ] **Step 6: Review final scope**

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

Expected implementation changes:

- `assets/has-to-be.opus` added;
- `assets/lunar-drive.opus` deleted;
- `README.md`;
- `index.html`;
- `script.js`;
- `scripts/build-site.mjs`;
- `scripts/validate.mjs`;
- `tests/build.test.mjs`;
- `tests/controller.test.mjs`;
- the approved replacement spec and this implementation plan.

Expected unchanged runtime surfaces include `src/audio.mjs`, `src/content.mjs`, `src/time.mjs`, `styles.css`, and unrelated workflows/tests.

- [ ] **Step 7: Push and open an unmerged PR**

If execution uses a local clone:

```bash
git push -u origin feature/replace-soundtrack-has-to-be
```

PR title:

```text
Replace soundtrack with Has to Be
```

PR body:

```markdown
## Summary

- replace the local Lunar Drive soundtrack with the user-approved “Has to Be — Capzlock” Opus asset
- strip embedded artwork/source metadata while preserving the original compressed audio packets
- keep manual playback, 50% default volume, and the five-second equal-power loop crossfade
- update deterministic build/validator policy to the new path, 5 MiB ceiling, clean metadata policy, and exact SHA-256 pin
- update active player/README credit without changing unrelated site behavior

## Verification

- full Node test suite passes
- repository validator passes
- deterministic 10-file production build passes
- soundtrack build copy is byte-identical to the committed asset
- source and sanitized soundtrack audio packet hashes match
- sanitized asset is one stereo 48 kHz Opus audio stream with clean title/artist metadata and no embedded artwork/source URLs
- no stale Lunar Drive active references remain
- local HTTP page/asset smoke checks pass

## Merge gate

Do not merge without explicit user approval.
```

Do **not** merge. Hand back the PR number, exact head SHA, CI state, and verification summary for user approval.

---

## Post-merge verification (only after separate explicit merge approval)

After an approved merge, verify the first GitHub Pages run on the exact merge SHA, then verify the live page serves `assets/has-to-be.opus`. A real browser/manual check must confirm the visible credit, explicit-start playback, pause/resume, 50% target behavior through the existing controller, and a smooth five-second loop transition. If deployment or playback is not freshly verified, report that limitation rather than inferring success from CI alone.
