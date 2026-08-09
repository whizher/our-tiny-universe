# Lunar Drive Soundtrack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved “Lunar Drive” soundtrack as an optional, visibly credited local asset with a manual play control and a seamless five-second crossfade loop.

**Architecture:** Keep the dependency-free static site. A new pure `src/audio.mjs` controller coordinates two existing `<audio>` elements and receives clocks/frame schedulers as dependencies; `script.js` only binds that controller to accessible UI state. The build copies one sanitized, hash-pinned Opus asset and the validator continues to enforce an exact public-file boundary.

**Tech Stack:** HTML5 audio, CSS, browser JavaScript ES modules, Node.js 22 built-in test runner, FFmpeg/FFprobe only for one-time local asset preparation, GitHub Pages.

## Global Constraints

- Preserve the existing plain HTML, CSS, and ES-module architecture; add no package, framework, backend, service worker, API, database, analytics, cookie, form, or persistent browser storage.
- Start audio only from a visitor pressing the soundtrack button. Do not add `autoplay`, implicit playback from another control, or remembered playback preferences.
- Keep the soundtrack local. Do not embed or contact YouTube, Spotify, SoundCloud, Mondo Loops, an analytics service, or any other third party at runtime.
- Preserve the supplied Opus audio packets without re-encoding, but strip its embedded artwork, description, source URLs, and unrelated metadata before tracking it.
- The only approved new binary is `assets/lunar-drive.opus`. Pin it to SHA-256 `ba8d55ed26addb68ea68ca4703b96aeee665d429981495db3aee272e04081765` and cap it at 4,194,304 bytes.
- The permission conversation and supplied source file stay outside the repository. Never commit a chat, screenshot, private photo, export, URL-rich original metadata, or proof-of-permission artifact.
- Preserve the current privacy allowlist, external-resource rejection, Asia/Pontianak behavior, sharing behavior, and reduced-motion behavior. Do not weaken an existing assertion to make the feature pass.
- Treat playback rejection as a normal recoverable state. Never render raw browser exceptions or metadata.
- The control must remain keyboard/touch accessible, expose visible state text, and use `aria-pressed`; state must not rely on color alone.
- The production artifact must contain exactly ten files, including `.nojekyll`, `src/audio.mjs`, and `assets/lunar-drive.opus`.
- Run a final Codex Security diff scan. Merge and deploy only if every test/check passes and that scan reports no finding.

## File Map

**Modify**

- `scripts/validate.mjs` — exact soundtrack path, size limit, SHA-256 verification, binary loading, and deployed-reference boundary.
- `scripts/build-site.mjs` — copy the controller module and soundtrack.
- `tests/build.test.mjs` — repository policy, sanitized asset, validator fixture, and ten-file build tests.
- `script.js` — bind the audio controller to the fixed accessible control.
- `index.html` — add the control and two local media channels.
- `styles.css` — fixed safe-area-aware presentation and lower-page clearance.
- `tests/controller.test.mjs` — accessible UI-state and cleanup integration tests.
- `README.md` — visible credit, permission statement, and optional-playback feature note.
- `docs/superpowers/specs/2026-08-09-lunar-drive-soundtrack-design.md` — correct the artifact count from nine to ten.

**Create**

- `assets/lunar-drive.opus` — sanitized 2,932,210-byte soundtrack asset.
- `src/audio.mjs` — testable two-channel crossfade state machine.
- `tests/audio.test.mjs` — controller unit tests with fake media and frame scheduling.

**Never create**

- The original uploaded file, its embedded image, a permission screenshot, chat text, private media, a playlist, a remote embed, or any additional audio format.

---

### Task 1: Establish the exact binary and deployment boundary

**Files:**

- Modify: `tests/build.test.mjs`
- Modify: `scripts/validate.mjs`
- Modify: `scripts/build-site.mjs`
- Create: `assets/lunar-drive.opus`

**Interfaces:**

- Produces: `validateSoundtrack(bytes) -> string[]`
- Enforces: `assets/lunar-drive.opus` at no more than 4 MiB and at the pinned SHA-256
- Produces: `_site/assets/lunar-drive.opus`
- Expands: the exact approved tracked-path set from 17 to 20 entries

- [ ] **Step 1: Add failing repository-policy and soundtrack-integrity tests**

In `tests/build.test.mjs`, import `createHash` and extend the approved path test:

~~~js
import { createHash } from "node:crypto";

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
~~~

Add `"exports/file.opus"` to the denied-extension fixture and update its expected count from 29 to 30. Rename the two-assets policy test to `repository policy permits only package.json and the three approved public assets`, and include this passing entry:

~~~js
{ path: "assets/lunar-drive.opus", size: 2_932_210 },
~~~

Extend the byte-limit test with exact soundtrack boundaries:

~~~js
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
~~~

Add a binary-integrity test. It must use Node only so it also runs in CI where FFmpeg is not installed:

~~~js
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
~~~

- [ ] **Step 2: Update the validator fixture before making audio required**

Change `validateFixture` so every ordinary fixture receives the approved controller and soundtrack, while a test can mutate the binary after copying it:

~~~js
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
~~~

Do not copy the supplied upload into a fixture. Fixtures always use the sanitized repository asset.

- [ ] **Step 3: Add the failing build and validator-mutation assertions**

Update the exact build inventory to:

~~~js
assert.deepEqual(files, [
  ".nojekyll",
  "assets/favicon.svg",
  "assets/lunar-drive.opus",
  "assets/social-preview.png",
  "index.html",
  "script.js",
  "src/content.mjs",
  "src/time.mjs",
  "styles.css",
]);
~~~

Immediately after the inventory, assert that the build copy is byte-identical:

~~~js
assert.deepEqual(
  await readFile("_site/assets/lunar-drive.opus"),
  await readFile("assets/lunar-drive.opus"),
);
~~~

Add a validator tamper test:

~~~js
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
~~~

- [ ] **Step 4: Run the focused tests and confirm they fail for the intended missing behavior**

Run:

~~~bash
node --test tests/build.test.mjs
~~~

Expected: FAIL because the three new approved paths, `.opus` policy exception, soundtrack asset, validator hash check, soundtrack build copy, and nine-file intermediate inventory are not implemented yet. A missing `assets/lunar-drive.opus` error is expected at this RED stage.

- [ ] **Step 5: Produce the sanitized audio without re-encoding**

From the repository root, run exactly:

~~~bash
ffmpeg -hide_banner -loglevel error -y \
  -i "/workspace/scratch/01380b3c2ffa/upload/Lunar Drive.opus" \
  -map 0:a:0 -map_metadata -1 -c:a copy \
  -metadata title="Lunar Drive" \
  -metadata artist="Mondo Loops" \
  -fflags +bitexact \
  assets/lunar-drive.opus
~~~

Verify the one-time preparation result:

~~~bash
sha256sum assets/lunar-drive.opus
stat -c '%s' assets/lunar-drive.opus
ffprobe -v error -show_entries stream=index,codec_name,codec_type,sample_rate,channels:format=duration:format_tags=title,artist -of json assets/lunar-drive.opus
~~~

Expected: SHA-256 `ba8d55ed26addb68ea68ca4703b96aeee665d429981495db3aee272e04081765`, size `2932210`, one Opus audio stream, 48,000 Hz, two channels, approximately 189.320 seconds, and only the intended title/artist tags. If the hash differs, stop; do not update the pinned value to accommodate an unexplained output.

- [ ] **Step 6: Implement the exact validator policy**

In `scripts/validate.mjs`, import `createHash` and define the soundtrack constants:

~~~js
import { createHash } from "node:crypto";

const MAX_SOUNDTRACK_BYTES = 4 * 1024 * 1024;
const SOUNDTRACK_PATH = "assets/lunar-drive.opus";
const SOUNDTRACK_SHA256 =
  "ba8d55ed26addb68ea68ca4703b96aeee665d429981495db3aee272e04081765";
~~~

Add `assets/lunar-drive.opus`, `src/audio.mjs`, and `tests/audio.test.mjs` to `APPROVED_EXACT_PATHS`. Add `opus` to `DENIED_EXTENSION`, but permit the single pinned path after the allowlist check:

~~~js
if (DENIED_EXTENSION.test(entry.path) && entry.path !== SOUNDTRACK_PATH) {
  errors.push("Forbidden tracked file type: " + entry.path);
  continue;
}
const limit =
  entry.path === SOUNDTRACK_PATH
    ? MAX_SOUNDTRACK_BYTES
    : entry.path === "assets/social-preview.png"
      ? MAX_PREVIEW_BYTES
      : MAX_TEXT_BYTES;
~~~

Add `assets/lunar-drive.opus` and the reserved future module path `src/audio.mjs` to `DEPLOYED_SOURCE_PATHS`. Keep the soundtrack binary out of the UTF-8 `contents` map; `src/audio.mjs` does not become a required runtime text file until Task 3 integrates it.

Export a focused binary validator:

~~~js
export function validateSoundtrack(bytes) {
  const errors = [];
  if (bytes.length > MAX_SOUNDTRACK_BYTES) {
    errors.push("Soundtrack exceeds size limit");
  }
  if (Buffer.from(bytes.subarray(0, 4)).toString("ascii") !== "OggS") {
    errors.push("Soundtrack is not an Ogg/Opus container");
  }
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== SOUNDTRACK_SHA256) {
    errors.push("Soundtrack SHA-256 mismatch");
  }
  return errors;
}
~~~

In `main()`, read the soundtrack separately and append these errors:

~~~js
try {
  const soundtrack = await readFile(resolve(root, SOUNDTRACK_PATH));
  errors.push(...validateSoundtrack(soundtrack));
} catch {
  errors.push("Missing required file: " + SOUNDTRACK_PATH);
}
~~~

Report the existing six text runtime files plus the binary as seven validated runtime files. Do not decode the Opus payload or include it in forbidden-text scanning.

- [ ] **Step 7: Copy the soundtrack in the deterministic build**

Keep the existing `time.mjs`/`content.mjs` source-module loop unchanged in this task and add the soundtrack copy to `scripts/build-site.mjs`:

~~~js
await cp(
  "assets/lunar-drive.opus",
  "_site/assets/lunar-drive.opus",
);
~~~

Leave the existing favicon, preview, `.nojekyll`, and source-module copy statements unchanged.

- [ ] **Step 8: Run the focused boundary tests and validator**

Run:

~~~bash
node --test tests/build.test.mjs
node scripts/validate.mjs
node scripts/build-site.mjs
~~~

Expected: PASS, validator prints `Validated 7 runtime files.`, and the build reports success with the exact nine-file intermediate inventory. Task 3 adds the controller module to produce the final ten-file release artifact.

- [ ] **Step 9: Commit the isolated boundary change**

Run:

~~~bash
git add assets/lunar-drive.opus scripts/build-site.mjs scripts/validate.mjs tests/build.test.mjs
git commit -m "feat: add approved soundtrack asset boundary"
~~~

---

### Task 2: Build the test-driven two-channel crossfade controller

**Files:**

- Create: `tests/audio.test.mjs`
- Create: `src/audio.mjs`

**Interfaces:**

- Produces: `equalPowerVolumes(progress, targetVolume) -> { outgoing, incoming }`
- Produces: `createCrossfadeController(options) -> { play, pause, destroy, getState }`
- States: `idle`, `playing`, `paused`, `error`, `destroyed`
- Default target volume: `0.30`
- Default overlap: `5_000` ms

- [ ] **Step 1: Create deterministic fake audio and frame harnesses**

Start `tests/audio.test.mjs` with a fake that exposes only the media surface used by production:

~~~js
import test from "node:test";
import assert from "node:assert/strict";
import {
  createCrossfadeController,
  equalPowerVolumes,
} from "../src/audio.mjs";

class FakeAudio {
  constructor({ duration = 20 } = {}) {
    this.currentTime = 0;
    this.duration = duration;
    this.paused = true;
    this.volume = 1;
    this.listeners = new Map();
    this.playFailures = [];
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(type, listeners.filter((item) => item !== listener));
  }

  async play() {
    const failure = this.playFailures.shift();
    if (failure) throw failure;
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }

  emit(type) {
    for (const listener of this.listeners.get(type) || []) listener();
  }

  listenerCount(type) {
    return (this.listeners.get(type) || []).length;
  }
}

function createFrames() {
  let nextId = 1;
  const callbacks = new Map();
  return {
    cancel: (id) => callbacks.delete(id),
    runNext(timestamp) {
      const [id, callback] = callbacks.entries().next().value;
      callbacks.delete(id);
      callback(timestamp);
    },
    schedule(callback) {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    },
    size: () => callbacks.size,
  };
}

const flushPlayback = () => new Promise((resolve) => setImmediate(resolve));
~~~

- [ ] **Step 2: Add failing equal-power and ordinary state tests**

Add tests that assert:

~~~js
test("calculates a clamped equal-power crossfade", () => {
  assert.deepEqual(equalPowerVolumes(0, 0.3), {
    outgoing: 0.3,
    incoming: 0,
  });
  const halfway = equalPowerVolumes(0.5, 0.3);
  assert.ok(Math.abs(halfway.outgoing - Math.SQRT1_2 * 0.3) < 1e-12);
  assert.ok(Math.abs(halfway.incoming - Math.SQRT1_2 * 0.3) < 1e-12);
  assert.deepEqual(equalPowerVolumes(2, 0.3), {
    outgoing: 0,
    incoming: 0.3,
  });
});

test("plays, pauses, and resumes only from explicit calls", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const states = [];
  const controller = createCrossfadeController({
    channels,
    onStateChange: (state) => states.push(state),
  });

  assert.equal(controller.getState(), "idle");
  assert.ok(channels.every((channel) => channel.paused));
  assert.equal(await controller.play(), true);
  assert.equal(channels[0].volume, 0.3);
  assert.equal(controller.getState(), "playing");

  controller.pause();
  assert.equal(controller.getState(), "paused");
  assert.ok(channels.every((channel) => channel.paused));

  assert.equal(await controller.play(), true);
  assert.equal(controller.getState(), "playing");
  assert.deepEqual(states, ["idle", "playing", "paused", "playing"]);
});
~~~

Run `node --test tests/audio.test.mjs` and confirm RED because `src/audio.mjs` does not exist.

- [ ] **Step 3: Implement state, notification, and ordinary playback**

Create `src/audio.mjs` with clamped equal-power math and strict channel validation:

~~~js
const DEFAULT_CROSSFADE_MS = 5_000;
const DEFAULT_TARGET_VOLUME = 0.3;

export function equalPowerVolumes(progress, targetVolume = DEFAULT_TARGET_VOLUME) {
  const bounded = Math.min(1, Math.max(0, Number(progress)));
  if (bounded === 0) {
    return { outgoing: targetVolume, incoming: 0 };
  }
  if (bounded === 1) {
    return { outgoing: 0, incoming: targetVolume };
  }
  return {
    outgoing: Math.cos(bounded * Math.PI / 2) * targetVolume,
    incoming: Math.sin(bounded * Math.PI / 2) * targetVolume,
  };
}

export function createCrossfadeController({
  channels,
  crossfadeMs = DEFAULT_CROSSFADE_MS,
  targetVolume = DEFAULT_TARGET_VOLUME,
  now = () => performance.now(),
  scheduleFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (id) => cancelAnimationFrame(id),
  onStateChange = () => {},
}) {
  if (!Array.isArray(channels) || channels.length !== 2) {
    throw new TypeError("Crossfade controller requires exactly two audio channels");
  }
  if (!(crossfadeMs > 0) || !(targetVolume > 0 && targetVolume <= 1)) {
    throw new RangeError("Invalid soundtrack timing or volume");
  }

  let state = "idle";
  let activeIndex = 0;
  let frameId = null;
  let fade = null;
  let startingFade = false;
  let destroyed = false;

  function setState(nextState) {
    if (state === nextState) return;
    state = nextState;
    onStateChange(state);
  }
~~~

This is the exact opening fragment of the controller; the following test cycles add the remaining helpers before closing the function. Implement `play()` so idle/error starts channel 0 at `currentTime = 0` and volume `0.3`; paused resumes whichever channel or channels were active. A rejected `play()` pauses both channels, sets `error`, returns `false`, and exposes no exception. `pause()` is a no-op outside `playing` and changes `playing` to `paused`. Invoke `onStateChange(state)` once during construction so the first notification is `idle`.

- [ ] **Step 4: Add failing loop-boundary and role-swap tests**

Use a 20-second fake track. After starting channel A, set its `currentTime` to 15, emit `timeupdate`, flush the play promise, and drive the scheduled frame to 2,500 and 5,000 ms. Assert:

~~~js
assert.equal(channels[1].currentTime, 0);
assert.equal(channels[1].paused, false);

frames.runNext(2_500);
assert.ok(
  Math.abs(channels[0].volume - Math.SQRT1_2 * 0.3) < 1e-12,
);
assert.ok(
  Math.abs(channels[1].volume - Math.SQRT1_2 * 0.3) < 1e-12,
);

frames.runNext(5_000);
assert.equal(channels[0].paused, true);
assert.equal(channels[0].currentTime, 0);
assert.equal(channels[0].volume, 0);
assert.equal(channels[1].paused, false);
assert.equal(channels[1].volume, 0.3);
~~~

Then move channel B to 15 seconds, emit its `timeupdate`, and assert channel A becomes the next incoming channel. This proves role swapping rather than a one-use overlap.

- [ ] **Step 5: Implement event-driven crossfade scheduling**

Attach one `timeupdate` and one `ended` listener to each channel. Only the current `activeIndex` may start a fade. Start when:

~~~js
const secondsRemaining = channel.duration - channel.currentTime;
if (
  state === "playing" &&
  !fade &&
  !startingFade &&
  Number.isFinite(secondsRemaining) &&
  secondsRemaining <= crossfadeMs / 1_000
) {
  void beginCrossfade();
}
~~~

`beginCrossfade()` must guard concurrent `timeupdate` events, reset the standby channel to zero at volume zero, await its `play()`, record `{ outgoingIndex, incomingIndex, elapsedMs: 0, lastTimestamp: now() }`, and schedule one frame. Each frame adds only non-negative elapsed time, applies `equalPowerVolumes`, and schedules the next frame until progress reaches one.

At completion:

- cancel any stored frame handle;
- pause/reset the outgoing channel and set its volume to zero;
- keep the incoming channel at target volume;
- set `activeIndex` to the incoming index;
- clear the fade and its start guard.

If the standby `play()` rejects, pause/reset both channels and enter `error`.

- [ ] **Step 6: Add failing pause-during-fade, ended-fallback, retry, and destroy tests**

Cover these exact scenarios:

1. At 2,000 ms of a fade, `pause()` cancels the pending frame and pauses both channels. After advancing the fake `now` clock, `play()` resumes both and the next 3,000 ms of frame time completes the same fade rather than restarting it.
2. If the active channel emits `ended` before a fade starts, the standby channel starts at zero and becomes active at 0.3 volume.
3. If the outgoing channel emits `ended` during a fade, the already-playing incoming channel is promoted immediately at 0.3 volume.
4. An initial rejected `play()` produces `error`, leaves both paused, and a later successful `play()` retries from channel A at zero.
5. `destroy()` cancels a frame, removes all four media listeners, pauses/resets both channels, changes state to `destroyed`, and makes later media events inert.

Use explicit assertions such as:

~~~js
assert.equal(channels[0].listenerCount("timeupdate"), 1);
assert.equal(channels[0].listenerCount("ended"), 1);
controller.destroy();
assert.equal(channels[0].listenerCount("timeupdate"), 0);
assert.equal(channels[0].listenerCount("ended"), 0);
assert.equal(frames.size(), 0);
assert.ok(channels.every((channel) => channel.paused));
assert.ok(channels.every((channel) => channel.currentTime === 0));
assert.equal(controller.getState(), "destroyed");
~~~

- [ ] **Step 7: Complete resilience and cleanup behavior**

On pause during a fade, preserve `fade.elapsedMs`, clear `fade.lastTimestamp`, and cancel only the pending animation frame. On resume, call `play()` on both fade participants, set `lastTimestamp = now()`, and schedule the remaining fade.

The `ended` fallback must promote the standby channel immediately and must use the same rejection handler as ordinary playback. `destroy()` is idempotent. Public calls after destroy do not restart media: `play()` returns `false`, `pause()` does nothing, and `getState()` remains `destroyed`.

Return exactly:

~~~js
return {
  destroy,
  getState: () => state,
  pause,
  play,
};
~~~

- [ ] **Step 8: Run controller tests and the full existing suite**

Run:

~~~bash
node --test tests/audio.test.mjs
node --test tests/*.test.mjs
~~~

Expected: all crossfade tests and all pre-existing tests PASS with no real browser or network dependency.

- [ ] **Step 9: Commit the isolated controller**

Run:

~~~bash
git add src/audio.mjs tests/audio.test.mjs
git commit -m "feat: add soundtrack crossfade controller"
~~~

---

### Task 3: Integrate the accessible visible soundtrack control

**Files:**

- Modify: `tests/build.test.mjs`
- Modify: `tests/controller.test.mjs`
- Modify: `scripts/build-site.mjs`
- Modify: `scripts/validate.mjs`
- Modify: `index.html`
- Modify: `script.js`
- Modify: `styles.css`

**Interfaces:**

- New markup hooks: `[data-music-toggle]`, `[data-music-status]`, and exactly two `[data-soundtrack-channel]` elements
- New `initSite` dependency: `createSoundtrack = createCrossfadeController`
- Visible states: play, pause, resume, and retry

- [ ] **Step 1: Add failing static markup assertions**

In `tests/build.test.mjs`, add:

~~~js
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
~~~

Also add `"src/audio.mjs"` between `script.js` and `src/content.mjs` in the exact build inventory established in Task 1. Run `node --test tests/build.test.mjs`; expect RED because the control is absent and the controller is not copied into `_site` yet.

- [ ] **Step 2: Add the approved control and two channels**

Add this after `</main>` and before `</body>` in `index.html`:

~~~html
<aside class="music-player" aria-label="Soundtrack controls">
  <p class="music-player__status" data-music-status aria-live="polite">
    Tap 🎵 to start Lunar Drive.
  </p>
  <button
    class="music-player__toggle"
    type="button"
    data-music-toggle
    aria-pressed="false"
  >
    🎵 Play soundtrack
  </button>
  <audio
    data-soundtrack-channel
    src="assets/lunar-drive.opus"
    preload="metadata"
    hidden
  ></audio>
  <audio
    data-soundtrack-channel
    src="assets/lunar-drive.opus"
    preload="metadata"
    hidden
  ></audio>
</aside>
~~~

Do not add `controls`, `autoplay`, or `loop`; the visible custom button is the only playback entry point and the controller owns looping.

- [ ] **Step 3: Extend the controller fixture and add failing UI-state tests**

In `tests/controller.test.mjs`, add `attributes`, `setAttribute`, and `getAttribute` to `FakeElement`. Add `musicButton`, `musicStatus`, and two `audioChannels` to the fixture; return the two channels for `[data-soundtrack-channel]` and the stars for `[data-message-source]`.

Use an injected fake soundtrack factory so this file tests DOM integration, not the already-covered audio math:

~~~js
function createSoundtrackFake() {
  let state = "idle";
  let notify = () => {};
  let destroyed = false;
  return {
    factory({ channels, onStateChange }) {
      assert.equal(channels.length, 2);
      notify = onStateChange;
      onStateChange(state);
      return {
        destroy() {
          destroyed = true;
          state = "destroyed";
        },
        getState: () => state,
        pause() {
          state = "paused";
          notify(state);
        },
        async play() {
          state = "playing";
          notify(state);
          return true;
        },
      };
    },
    fail() {
      state = "error";
      notify(state);
    },
    wasDestroyed: () => destroyed,
  };
}
~~~

Add tests for initial state, play, pause, resume, error/retry text, and cleanup:

~~~js
assert.equal(elements.musicButton.textContent, "🎵 Play soundtrack");
assert.equal(elements.musicButton.getAttribute("aria-pressed"), "false");
assert.equal(
  elements.musicStatus.textContent,
  "Tap 🎵 to start Lunar Drive.",
);

await elements.musicButton.click();
assert.equal(elements.musicButton.textContent, "⏸ Pause soundtrack");
assert.equal(elements.musicButton.getAttribute("aria-pressed"), "true");
assert.equal(elements.musicStatus.textContent, "Lunar Drive — Mondo Loops");

await elements.musicButton.click();
assert.equal(elements.musicButton.textContent, "▶ Resume soundtrack");
assert.equal(elements.musicStatus.textContent, "Lunar Drive — Mondo Loops · Paused");
~~~

For error state, assert the button says `🎵 Try soundtrack again`, `aria-pressed` is false, and the visible polite status says `Lunar Drive couldn’t start. Tap to try again.` For destroy, assert the fake was destroyed and clicking the removed button listener does not change its state.

- [ ] **Step 4: Wire the controller into `script.js`**

Import the module and expose a test seam:

~~~js
import { createCrossfadeController } from "./src/audio.mjs";

export function initSite({
  documentRef = document,
  now = () => new Date(),
  random = Math.random,
  schedule = setTimeout,
  cancelSchedule = clearTimeout,
  nativeShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
      ? navigator.share.bind(navigator)
      : null,
  writeClipboard =
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
      ? navigator.clipboard.writeText.bind(navigator.clipboard)
      : null,
  reducedMotion = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  createSoundtrack = createCrossfadeController,
} = {}) {
~~~

Query and require the music elements:

~~~js
const musicButton = documentRef.querySelector("[data-music-toggle]");
const musicStatus = documentRef.querySelector("[data-music-status]");
const audioChannels = [
  ...documentRef.querySelectorAll("[data-soundtrack-channel]"),
];

const validAudioChannels = audioChannels.length === 2;
if (
  required.some((element) => !element) ||
  !validSources ||
  !musicButton ||
  !musicStatus ||
  !validAudioChannels
) {
  throw new Error("Our Tiny Universe markup is incomplete");
}
~~~

Render only approved state copy:

~~~js
function renderMusicState(state) {
  const views = {
    idle: {
      label: "🎵 Play soundtrack",
      pressed: "false",
      status: "Tap 🎵 to start Lunar Drive.",
    },
    playing: {
      label: "⏸ Pause soundtrack",
      pressed: "true",
      status: "Lunar Drive — Mondo Loops",
    },
    paused: {
      label: "▶ Resume soundtrack",
      pressed: "false",
      status: "Lunar Drive — Mondo Loops · Paused",
    },
    error: {
      label: "🎵 Try soundtrack again",
      pressed: "false",
      status: "Lunar Drive couldn’t start. Tap to try again.",
    },
  };
  const view = views[state];
  if (!view) return;
  musicButton.textContent = view.label;
  musicButton.setAttribute("aria-pressed", view.pressed);
  musicStatus.textContent = view.status;
}

const soundtrack = createSoundtrack({
  channels: audioChannels,
  onStateChange: renderMusicState,
});
renderMusicState(soundtrack.getState());

async function toggleSoundtrack() {
  if (soundtrack.getState() === "playing") {
    soundtrack.pause();
  } else {
    await soundtrack.play();
  }
}
~~~

Register the button with the other listeners. In `destroy()`, remove its listener and call `soundtrack.destroy()` before returning. Preserve all existing star, anti-cringe, share, timer, and `pagehide` cleanup.

- [ ] **Step 5: Complete controller deployment and validator scanning**

In `scripts/build-site.mjs`, expand the existing source-module list exactly once:

~~~js
for (const file of ["time.mjs", "content.mjs", "audio.mjs"]) {
  await cp("src/" + file, "_site/src/" + file);
}
~~~

In `scripts/validate.mjs`, add `src/audio.mjs` to the `required` text paths. It is already in `APPROVED_EXACT_PATHS` and `DEPLOYED_SOURCE_PATHS` from Task 1. The validator will now scan the module’s static JavaScript references and forbidden runtime tokens, and the success count becomes `Validated 8 runtime files.`

In `validateFixture` in `tests/build.test.mjs`, add this operation to the existing `Promise.all` so every validator fixture satisfies the new required module:

~~~js
cp("src/audio.mjs", join(sourceDirectory, "audio.mjs")),
~~~

Run `node --test tests/build.test.mjs` and confirm the build now has ten files and the ordinary validator fixture passes.

- [ ] **Step 6: Add the fixed safe-area-aware presentation**

In `styles.css`, add bottom clearance and a compact non-animated panel:

~~~css
body {
  padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
}

.music-player {
  position: fixed;
  right: max(0.75rem, env(safe-area-inset-right, 0px));
  bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
  z-index: 20;
  display: grid;
  gap: 0.55rem;
  width: min(19rem, calc(100vw - 1.5rem));
  padding: 0.75rem;
  text-align: left;
  background: rgba(8, 13, 39, 0.94);
  border: 1px solid rgba(188, 156, 255, 0.52);
  border-radius: 1rem;
  box-shadow: 0 1rem 2.5rem rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
}

.music-player__status {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.35;
}

.music-player__toggle {
  min-width: 44px;
  min-height: 44px;
  padding: 0.7rem 0.9rem;
  color: var(--ink);
  font-weight: 800;
  background: rgba(188, 156, 255, 0.16);
  border: 1px solid rgba(188, 156, 255, 0.52);
  border-radius: 999px;
  cursor: pointer;
}

.music-player__toggle:hover {
  background: rgba(188, 156, 255, 0.28);
}
~~~

Do not add pulsing, bouncing, or attention animation. The existing global `button:focus-visible` rule supplies the keyboard focus ring, and the global reduced-motion rule remains intact.

- [ ] **Step 7: Run integration, policy, and full-suite tests**

Run:

~~~bash
node --test tests/controller.test.mjs tests/build.test.mjs
node --test tests/*.test.mjs
node scripts/validate.mjs
node scripts/build-site.mjs
~~~

Expected: PASS. The validator prints `Validated 8 runtime files.`, accepts both identical local audio references and `script.js`’s local `src/audio.mjs` import, and finds no remote runtime reference. The build inventory is the final exact ten files.

- [ ] **Step 8: Commit the UI integration**

Run:

~~~bash
git add index.html script.js styles.css scripts/build-site.mjs scripts/validate.mjs tests/controller.test.mjs tests/build.test.mjs
git commit -m "feat: add visible soundtrack controls"
~~~

---

### Task 4: Document attribution and verify the release candidate

**Files:**

- Modify: `README.md`
- Verify: all source, tests, generated artifacts, and repository diff

- [ ] **Step 1: Add the public credit without private correspondence**

Add this feature bullet to `README.md`:

~~~md
- Optional local “Lunar Drive” soundtrack with manual play/pause and a five-second crossfade loop
~~~

Add a short section after Privacy:

~~~md
## Soundtrack

“Lunar Drive” is by Mondo Loops and is included here with the artist’s permission. Playback is optional, starts only after a visitor presses Play, and makes no third-party request.
~~~

Do not link to or quote the permission conversation, the source video metadata, or any private message.

- [ ] **Step 2: Run the mandatory clean verification sequence**

From a clean shell in the feature worktree, run:

~~~bash
node --test tests/*.test.mjs
node scripts/validate.mjs
node scripts/build-site.mjs
git diff --check origin/main...HEAD
git status --short
~~~

Then inventory the artifact and verify the deployed audio hash:

~~~bash
find _site -type f -printf '%P\n' | sort
sha256sum assets/lunar-drive.opus _site/assets/lunar-drive.opus
~~~

Expected inventory is exactly:

~~~text
.nojekyll
assets/favicon.svg
assets/lunar-drive.opus
assets/social-preview.png
index.html
script.js
src/audio.mjs
src/content.mjs
src/time.mjs
styles.css
~~~

Both hashes must be `ba8d55ed26addb68ea68ca4703b96aeee665d429981495db3aee272e04081765`. `git status --short` may show only the intentional README change before its commit and the ignored `_site` output; it must not show the supplied upload, a chat, image, or unrelated file.

- [ ] **Step 3: Run a local HTTP smoke check with reliable cleanup**

Serve `_site` on loopback, fetch the page/module/audio, and always stop the server:

~~~bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory _site >/tmp/otu-music-http.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true' EXIT
curl --retry 10 --retry-delay 1 --retry-connrefused -fsS http://127.0.0.1:4173/ -o /tmp/otu-music-index.html
curl -fsS http://127.0.0.1:4173/src/audio.mjs -o /tmp/otu-music-audio.mjs
curl -fsS http://127.0.0.1:4173/assets/lunar-drive.opus -o /tmp/otu-music-track.opus
sha256sum /tmp/otu-music-track.opus
kill "$server_pid"
wait "$server_pid" 2>/dev/null || true
trap - EXIT
~~~

Expected: all requests return successfully and the fetched soundtrack has the pinned SHA-256. Inspect `/tmp/otu-music-http.log` for only the three expected successful GET requests.

- [ ] **Step 4: Perform browser behavior checks**

At a desktop and narrow mobile viewport, verify:

- no sound starts on load or when pressing a star, anti-cringe, or share control;
- the hint and Play button are visible without covering the bottom content;
- Play changes the UI to the visible Mondo Loops credit and Pause state;
- Pause stops both channels, Resume continues, and a failed play exposes only the friendly retry copy;
- keyboard focus is visible and Enter/Space operate the button;
- the track overlaps smoothly for five seconds near 3:04 and continues into the next loop;
- Network shows only same-origin site files and no third-party request.

If waiting through the full track would be impractical during rapid iteration, use DevTools to move the active media element to five seconds before its duration for the interaction check, then perform one real full-boundary listen before release.

- [ ] **Step 5: Commit the public documentation**

Run:

~~~bash
git add README.md docs/superpowers/specs/2026-08-09-lunar-drive-soundtrack-design.md
git commit -m "docs: credit Lunar Drive soundtrack"
~~~

---

### Task 5: Security review, integration, and deployment gate

**Files:**

- Review: `git diff origin/main...HEAD`
- Review: exact tracked files and `_site` artifact
- External only after clean review: feature branch, pull request, merge, GitHub Pages deployment

- [ ] **Step 1: Re-run verification immediately before claiming completion**

Use the `superpowers:verification-before-completion` skill and collect fresh output from:

~~~bash
node --test tests/*.test.mjs
node scripts/validate.mjs
node scripts/build-site.mjs
git diff --check origin/main...HEAD
git status --short --branch
git ls-files
~~~

Check that the original upload path and all chat/photo/media evidence remain outside `git ls-files`.

- [ ] **Step 2: Review the final diff for functional and privacy regressions**

Use `superpowers:requesting-code-review`. The reviewer must explicitly check:

- manual-play enforcement and lack of autoplay paths;
- two-channel state/race/cleanup behavior;
- equal-power math and pause-resume timing preservation;
- exact hash/size/path policy and binary-vs-text handling;
- no permission correspondence, embedded artwork, URL metadata, or extra media;
- exact ten-file production artifact and no third-party runtime request.

Address any validated feedback with `superpowers:receiving-code-review`, rerun affected tests, then rerun the entire verification sequence.

- [ ] **Step 3: Run the Codex Security diff scan**

Use `codex-security:security-diff-scan` against `origin/main...HEAD`. Treat any Critical, Important, or plausible privacy finding as blocking. Fix and rescan until the result is clean; do not merge on an ambiguous or incomplete scan.

- [ ] **Step 4: Publish only the reviewed branch and merge only on green checks**

Use `superpowers:finishing-a-development-branch` and the GitHub publishing workflow. Push only `feature/otu-music`, open a focused pull request, confirm the GitHub Actions validation/build checks pass, and inspect the PR file list before merge. The file list must not contain private chats, screenshots, photos, the unsanitized upload, or any file outside this plan.

Merge only if the Codex Security scan is clean and the PR checks are green. Then wait for the GitHub Pages workflow to succeed.

- [ ] **Step 5: Verify the live deployment**

After Pages reports success, check:

~~~text
https://whizher.github.io/our-tiny-universe/
https://whizher.github.io/our-tiny-universe/src/audio.mjs
https://whizher.github.io/our-tiny-universe/assets/lunar-drive.opus
~~~

Confirm the live soundtrack hash matches the release asset, the visible control works, no autoplay occurs, attribution is visible after Play, pause/resume works, and one five-second loop boundary is smooth. If any live check fails, stop and diagnose that new issue without rebuilding the site.
