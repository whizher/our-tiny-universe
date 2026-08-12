# Enhanced Shooting Stars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing shooting-star effect into a richer hybrid DOM/CSS effects system with preset-driven meteors, interaction bursts, activity-aware ambient events, and preserved reduced-motion/performance safeguards.

**Architecture:** Keep deterministic effect generation in `src/content.mjs`, use `script.js` as the single effect coordinator and scheduler, and keep all rendering richness in `styles.css`. Four named presets (`ambient`, `transmission`, `antiCringe`, `anniversary`) share one generator and one renderer; the controller owns one ambient timer and one cleanup timer at a time.

**Tech Stack:** Dependency-free JavaScript ES modules, DOM/CSS animations, Node.js built-in test runner, existing repository validator/build scripts, GitHub Pages.

## Global Constraints

- No Canvas, WebGL, `requestAnimationFrame` particle loop, external animation library, or new runtime dependency.
- No new image, video, audio, or font assets.
- No local storage, session storage, cookies, analytics, identifiers, server-side state, or external runtime requests.
- Do not change message pools, transmission deck behavior, sharing behavior, timeline content, counters, soundtrack behavior, or the five-second equal-power audio crossfade.
- The effect layer must remain `pointer-events: none`.
- Reduced motion is a hard guard: do not schedule or render shooting-star effects when `reducedMotion()` is true.
- Ambient events use one owned timer; effect cleanup uses one owned timer; `destroy()` must cancel both.
- Each new shooting-star batch replaces the previous batch. Do not build a persistent queue of overlapping batches.
- Only transmission reveals refresh the active ambient window.
- Active ambient window duration: exactly 60,000 ms from the most recent transmission reveal.
- Calm ambient cadence: randomized from 45,000 through 90,000 ms.
- Active ambient cadence: randomized from 18,000 through 36,000 ms.
- Preserve `assets/lunar-drive.opus` byte-for-byte.

---

## File map

- `src/content.mjs`: preset definitions, bounded deterministic shooting-star spec generation.
- `tests/content.test.mjs`: schema/range/determinism/preset validation for generated specs.
- `script.js`: preset rendering, CSS-variable mapping, cleanup lifetime, interaction triggers, ambient scheduler, reduced-motion guard, destroy cleanup.
- `tests/controller.test.mjs`: renderer lifecycle, trigger routing, ambient activity timing, reduced motion, destroy behavior.
- `styles.css`: meteor head/tail/glow/tone/comet presentation and trajectory-variable animation.
- `docs/superpowers/specs/2026-08-12-enhanced-shooting-stars-design.md`: approved design source of truth.

### Task 1: Replace count-only star generation with deterministic named presets

**Files:**
- Modify: `src/content.mjs` around `createShootingStarSpecs()`
- Modify: `tests/content.test.mjs` around the existing shooting-star specification test

**Interfaces:**
- Consumes: `random(): number`.
- Produces: `createShootingStarSpecs(preset = "ambient", random = Math.random): ReadonlyArray<ShootingStarSpec>`.
- `ShootingStarSpec` shape: `{ left, top, delayMs, durationMs, angleDeg, trailPx, thicknessPx, scale, brightness, travelXvw, travelYvh, color, isComet }`.
- Valid presets: `ambient`, `transmission`, `antiCringe`, `anniversary`.

- [ ] **Step 1: Replace the old bounded-count test with failing schema/preset tests**

In `tests/content.test.mjs`, replace the current `creates bounded shooting-star specifications` test with:

```js
test("creates bounded shooting-star specifications for every preset", () => {
  const expectedCounts = {
    ambient: 2,
    transmission: 5,
    antiCringe: 9,
    anniversary: 18,
  };

  for (const [preset, expectedCount] of Object.entries(expectedCounts)) {
    const specs = createShootingStarSpecs(preset, () => 0.5);
    assert.equal(specs.length, expectedCount, preset);
    for (const spec of specs) {
      assert.ok(spec.left >= 5 && spec.left <= 95);
      assert.ok(spec.top >= -8 && spec.top <= 10);
      assert.ok(spec.delayMs >= 0);
      assert.ok(spec.durationMs >= 800 && spec.durationMs <= 1_900);
      assert.ok(spec.angleDeg >= -52 && spec.angleDeg <= -26);
      assert.ok(spec.trailPx >= 56 && spec.trailPx <= 150);
      assert.ok(spec.thicknessPx >= 1 && spec.thicknessPx <= 3.2);
      assert.ok(spec.scale >= 0.7 && spec.scale <= 1.35);
      assert.ok(spec.brightness >= 0.5 && spec.brightness <= 1);
      assert.ok(spec.travelXvw <= -32 && spec.travelXvw >= -62);
      assert.ok(spec.travelYvh >= 72 && spec.travelYvh <= 104);
      assert.ok(["white", "gold", "lavender"].includes(spec.color));
      assert.equal(typeof spec.isComet, "boolean");
    }
  }
});

test("creates deterministic shooting-star specifications", () => {
  assert.deepEqual(
    createShootingStarSpecs("transmission", () => 0.25),
    createShootingStarSpecs("transmission", () => 0.25),
  );
});

test("rejects an unknown shooting-star preset", () => {
  assert.throws(
    () => createShootingStarSpecs("meteorApocalypse", () => 0),
    /Unknown shooting-star preset/,
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/content.test.mjs
```

Expected: FAIL because `createShootingStarSpecs()` still accepts a numeric count and does not emit the richer schema or reject unknown preset names.

- [ ] **Step 3: Add immutable preset configuration and interpolation helpers**

Immediately before `createShootingStarSpecs()`, add:

```js
const SHOOTING_STAR_PRESETS = Object.freeze({
  ambient: Object.freeze({
    count: 2,
    delayMs: [0, 120],
    durationMs: [1_200, 1_900],
    angleDeg: [-48, -30],
    trailPx: [56, 92],
    thicknessPx: [1, 1.7],
    scale: [0.7, 0.95],
    brightness: [0.5, 0.72],
    cometChance: 0.03,
  }),
  transmission: Object.freeze({
    count: 5,
    delayMs: [0, 320],
    durationMs: [850, 1_350],
    angleDeg: [-50, -28],
    trailPx: [68, 112],
    thicknessPx: [1.2, 2.1],
    scale: [0.8, 1.08],
    brightness: [0.62, 0.86],
    cometChance: 0.08,
  }),
  antiCringe: Object.freeze({
    count: 9,
    delayMs: [0, 500],
    durationMs: [900, 1_500],
    angleDeg: [-52, -26],
    trailPx: [72, 126],
    thicknessPx: [1.3, 2.4],
    scale: [0.82, 1.16],
    brightness: [0.66, 0.92],
    cometChance: 0.12,
  }),
  anniversary: Object.freeze({
    count: 18,
    delayMs: [0, 900],
    durationMs: [950, 1_700],
    angleDeg: [-52, -26],
    trailPx: [76, 150],
    thicknessPx: [1.4, 3.2],
    scale: [0.85, 1.35],
    brightness: [0.7, 1],
    cometChance: 0.2,
  }),
});

function between([minimum, maximum], random) {
  return minimum + boundedRandom(random) * (maximum - minimum);
}

function pickMeteorColor(random) {
  const value = boundedRandom(random);
  if (value < 0.72) return "white";
  if (value < 0.86) return "gold";
  return "lavender";
}
```

- [ ] **Step 4: Implement the richer preset generator**

Replace `createShootingStarSpecs()` with:

```js
export function createShootingStarSpecs(
  preset = "ambient",
  random = Math.random,
) {
  if (!Object.hasOwn(SHOOTING_STAR_PRESETS, preset)) {
    throw new RangeError("Unknown shooting-star preset: " + preset);
  }
  const config = SHOOTING_STAR_PRESETS[preset];

  return Array.from({ length: config.count }, () => {
    const isComet = boundedRandom(random) < config.cometChance;
    return Object.freeze({
      left: 5 + boundedRandom(random) * 90,
      top: -8 + boundedRandom(random) * 18,
      delayMs: between(config.delayMs, random),
      durationMs: between(config.durationMs, random),
      angleDeg: between(config.angleDeg, random),
      trailPx: between(config.trailPx, random),
      thicknessPx: between(config.thicknessPx, random),
      scale: between(config.scale, random),
      brightness: between(config.brightness, random),
      travelXvw: -(32 + boundedRandom(random) * 30),
      travelYvh: 72 + boundedRandom(random) * 32,
      color: pickMeteorColor(random),
      isComet,
    });
  });
}
```

- [ ] **Step 5: Run focused and full content tests**

Run:

```bash
node --test tests/content.test.mjs
node --test tests/*.test.mjs
```

Expected: the content tests pass; the full suite may still fail in controller tests that call the old numeric generator interface. Those failures are expected until Task 2.

- [ ] **Step 6: Commit the generator unit**

```bash
git diff --check
git add src/content.mjs tests/content.test.mjs
git commit -m "feat: add shooting star presets"
```

### Task 2: Build the hybrid renderer and cinematic CSS treatment

**Files:**
- Modify: `script.js` around `renderShootingStars()`
- Modify: `tests/controller.test.mjs` near shooting-star/Anti-Cringe tests
- Modify: `styles.css` around `.shooting-star-layer`, `.shooting-star`, and `@keyframes shoot`

**Interfaces:**
- Consumes: `createShootingStarSpecs(preset, random)` from Task 1.
- Produces internal `renderShootingStars(preset): void`.
- Cleanup delay: `max(spec.delayMs + spec.durationMs) + 160` ms.

- [ ] **Step 1: Add a failing controller test for CSS-variable mapping and derived cleanup**

Add a test using the existing fixture and injected scheduler pattern:

```js
test("renders rich shooting-star variables and cleans up after the longest particle", async () => {
  const scheduled = [];
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    random: () => 0.5,
    reducedMotion: () => false,
    schedule: (callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
    cancelSchedule: () => {},
  });

  await elements.stars[0].click();

  assert.equal(elements.shootingLayer.children.length, 5);
  const particle = elements.shootingLayer.children[0];
  assert.equal(particle.classList.contains("shooting-star"), true);
  assert.match(particle.style.getPropertyValue("--left"), /%$/);
  assert.match(particle.style.getPropertyValue("--top"), /%$/);
  assert.match(particle.style.getPropertyValue("--angle"), /deg$/);
  assert.match(particle.style.getPropertyValue("--trail"), /px$/);
  assert.match(particle.style.getPropertyValue("--thickness"), /px$/);
  assert.match(particle.style.getPropertyValue("--travel-x"), /vw$/);
  assert.match(particle.style.getPropertyValue("--travel-y"), /vh$/);
  assert.ok(["white", "gold", "lavender"].includes(particle.dataset.tone));

  const cleanup = scheduled.find(({ delay }) => delay > 1_000 && delay < 3_000);
  assert.ok(cleanup);
  cleanup.callback();
  assert.equal(elements.shootingLayer.children.length, 0);
});
```

- [ ] **Step 2: Run that controller test and verify RED**

Run the exact test with Node's name pattern:

```bash
node --test --test-name-pattern="renders rich shooting-star variables" tests/controller.test.mjs
```

Expected: FAIL because the renderer still accepts a count and sets only `--left`, `--delay`, and `--duration`, with fixed 2,000 ms cleanup.

- [ ] **Step 3: Replace `renderShootingStars(count)` with preset rendering**

Implement:

```js
function renderShootingStars(preset) {
  if (reducedMotion()) return;

  const specs = createShootingStarSpecs(preset, random);
  const particles = specs.map((spec) => {
    const particle = documentRef.createElement("span");
    particle.className = spec.isComet
      ? "shooting-star shooting-star--comet"
      : "shooting-star";
    particle.dataset.tone = spec.color;
    particle.style.setProperty("--left", spec.left + "%");
    particle.style.setProperty("--top", spec.top + "%");
    particle.style.setProperty("--delay", spec.delayMs + "ms");
    particle.style.setProperty("--duration", spec.durationMs + "ms");
    particle.style.setProperty("--angle", spec.angleDeg + "deg");
    particle.style.setProperty("--trail", spec.trailPx + "px");
    particle.style.setProperty("--thickness", spec.thicknessPx + "px");
    particle.style.setProperty("--scale", String(spec.scale));
    particle.style.setProperty("--brightness", String(spec.brightness));
    particle.style.setProperty("--travel-x", spec.travelXvw + "vw");
    particle.style.setProperty("--travel-y", spec.travelYvh + "vh");
    return particle;
  });

  shootingLayer.replaceChildren(...particles);
  cancelSchedule(cleanupTimer);
  const maximumLifetime = Math.max(
    ...specs.map((spec) => spec.delayMs + spec.durationMs),
  );
  cleanupTimer = schedule(
    () => shootingLayer.replaceChildren(),
    maximumLifetime + 160,
  );
}
```

- [ ] **Step 4: Upgrade the CSS treatment**

Replace the current `.shooting-star` rule and `shoot` animation with this structure:

```css
.shooting-star {
  --meteor-color: 255, 255, 255;
  position: absolute;
  top: var(--top);
  left: var(--left);
  width: var(--trail);
  height: var(--thickness);
  opacity: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--meteor-color), 0.2),
    rgba(var(--meteor-color), 0.95)
  );
  border-radius: 999px;
  filter: drop-shadow(0 0 0.45rem rgba(var(--meteor-color), 0.68));
  transform: rotate(var(--angle)) scale(var(--scale));
  transform-origin: 100% 50%;
  animation: shoot var(--duration) cubic-bezier(0.2, 0.65, 0.35, 1)
    var(--delay) forwards;
}

.shooting-star::after {
  position: absolute;
  top: 50%;
  right: 0;
  width: calc(var(--thickness) * 3);
  aspect-ratio: 1;
  content: "";
  background: rgb(var(--meteor-color));
  border-radius: 50%;
  translate: 50% -50%;
  box-shadow:
    0 0 0.45rem rgba(var(--meteor-color), 0.95),
    0 0 1rem rgba(var(--meteor-color), 0.55);
}

.shooting-star[data-tone="gold"] {
  --meteor-color: 255, 213, 106;
}

.shooting-star[data-tone="lavender"] {
  --meteor-color: 188, 156, 255;
}

.shooting-star--comet {
  filter:
    drop-shadow(0 0 0.65rem rgba(var(--meteor-color), 0.85))
    drop-shadow(0 0 1.1rem rgba(var(--meteor-color), 0.35));
}

.shooting-star--comet::after {
  width: calc(var(--thickness) * 4.5);
}

@keyframes shoot {
  from {
    opacity: 0;
    translate: 0 0;
  }

  12% {
    opacity: var(--brightness);
  }

  70% {
    opacity: calc(var(--brightness) * 0.9);
  }

  to {
    opacity: 0;
    translate: var(--travel-x) var(--travel-y);
  }
}
```

- [ ] **Step 5: Run focused controller tests and the full suite**

```bash
node --test --test-name-pattern="shooting-star|Anti-Cringe|anniversary" tests/controller.test.mjs
node --test tests/*.test.mjs
```

Expected: any remaining failures should be limited to old trigger/count expectations that still use numeric calls and will be intentionally updated in Task 3.

- [ ] **Step 6: Commit the renderer/CSS unit**

```bash
git diff --check
git add script.js styles.css tests/controller.test.mjs
git commit -m "feat: render cinematic shooting stars"
```

### Task 3: Route all four effect presets and add the activity-aware ambient scheduler

**Files:**
- Modify: `script.js` in effect state, `renderTemporalState()`, `revealMessage()`, `launchAntiCringe()`, initialization, and `destroy()`
- Modify: `tests/controller.test.mjs` around transmission, Anti-Cringe, anniversary, timers, reduced motion, and cleanup tests

**Interfaces:**
- Internal constants: `ACTIVE_AMBIENT_WINDOW_MS = 60_000`, `CALM_AMBIENT_RANGE = [45_000, 90_000]`, `ACTIVE_AMBIENT_RANGE = [18_000, 36_000]`.
- Internal state: `ambientTimer`, `lastTransmissionActivityAt`.
- Internal functions: `scheduleAmbientMeteor()`, `markTransmissionActivity()`.

- [ ] **Step 1: Add failing trigger and ambient cadence tests**

Add focused tests equivalent to:

```js
test("routes transmission, anti-cringe, and anniversary events to distinct effect sizes", async () => {
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    random: () => 0.5,
    reducedMotion: () => false,
    now: () => new Date("2026-08-12T04:00:00.000Z"),
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  await elements.stars[0].click();
  assert.equal(elements.shootingLayer.children.length, 5);

  await elements.antiButton.click();
  assert.equal(elements.shootingLayer.children.length, 9);
});

test("reschedules ambient meteors to the active cadence after a transmission", async () => {
  const scheduled = [];
  let currentTime = new Date("2026-08-12T04:00:00.000Z");
  const { documentRef, elements } = createFixture();

  initSite({
    documentRef,
    random: () => 0,
    reducedMotion: () => false,
    now: () => currentTime,
    schedule: (callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
    cancelSchedule: () => {},
  });

  assert.ok(scheduled.some(({ delay }) => delay === 45_000));

  await elements.stars[0].click();
  assert.ok(scheduled.some(({ delay }) => delay === 18_000));

  currentTime = new Date(currentTime.getTime() + 60_001);
  const activeAmbient = scheduled.findLast(({ delay }) => delay === 18_000);
  activeAmbient.callback();
  assert.equal(scheduled.at(-1).delay, 45_000);
});
```

Also add/adjust an anniversary test so entering anniversary state produces exactly 18 particles.

- [ ] **Step 2: Run the new tests and verify RED**

```bash
node --test --test-name-pattern="routes transmission|reschedules ambient|anniversary" tests/controller.test.mjs
```

Expected: FAIL because the trigger routing and ambient scheduler do not yet exist.

- [ ] **Step 3: Add exact ambient timing constants and bounded delay helper**

Near the other module constants in `script.js`, add:

```js
const ACTIVE_AMBIENT_WINDOW_MS = 60_000;
const CALM_AMBIENT_RANGE = [45_000, 90_000];
const ACTIVE_AMBIENT_RANGE = [18_000, 36_000];

function randomDelay([minimum, maximum], random) {
  const value = Math.min(0.999_999, Math.max(0, Number(random())));
  return minimum + Math.floor(value * (maximum - minimum + 1));
}
```

- [ ] **Step 4: Add ambient timer state and scheduling functions inside `initSite()`**

Beside `cleanupTimer`, add:

```js
let ambientTimer;
let lastTransmissionActivityAt = -Infinity;
```

Then add:

```js
function scheduleAmbientMeteor() {
  cancelSchedule(ambientTimer);
  if (reducedMotion()) return;

  const elapsed = now().getTime() - lastTransmissionActivityAt;
  const range =
    elapsed < ACTIVE_AMBIENT_WINDOW_MS
      ? ACTIVE_AMBIENT_RANGE
      : CALM_AMBIENT_RANGE;

  ambientTimer = schedule(() => {
    renderShootingStars("ambient");
    scheduleAmbientMeteor();
  }, randomDelay(range, random));
}

function markTransmissionActivity() {
  lastTransmissionActivityAt = now().getTime();
  scheduleAmbientMeteor();
}
```

- [ ] **Step 5: Route existing event sites to named presets**

Apply these exact behavior changes:

```js
// In renderTemporalState(), when anniversary begins:
renderShootingStars("anniversary");

// At the end of revealMessage(), after rendering the transmission text:
renderShootingStars("transmission");
markTransmissionActivity();

// In launchAntiCringe():
renderShootingStars("antiCringe");
```

Do not call `markTransmissionActivity()` from Anti-Cringe or sharing.

- [ ] **Step 6: Start the ambient scheduler during initialization**

After the first temporal render and normal timer setup, invoke:

```js
scheduleAmbientMeteor();
```

Do not schedule ambient effects at all when `reducedMotion()` is true.

- [ ] **Step 7: Update `destroy()` to cancel ambient and cleanup timers**

Ensure `destroy()` contains:

```js
cancelSchedule(ambientTimer);
cancelSchedule(cleanupTimer);
shootingLayer.replaceChildren();
```

Preserve all existing event-listener and soundtrack cleanup.

- [ ] **Step 8: Run controller tests and full suite**

```bash
node --test tests/controller.test.mjs
node --test tests/*.test.mjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 9: Commit scheduler and trigger routing**

```bash
git diff --check
git add script.js tests/controller.test.mjs
git commit -m "feat: add ambient meteor activity"
```

### Task 4: Harden reduced-motion and lifecycle regression coverage

**Files:**
- Modify: `tests/controller.test.mjs`
- Modify only if a failing test exposes a real implementation gap: `script.js`

**Interfaces:**
- Uses the final effect interfaces from Tasks 1-3.

- [ ] **Step 1: Add a reduced-motion test covering all shooting-star entry points**

Add:

```js
test("suppresses all shooting-star rendering and ambient scheduling for reduced motion", async () => {
  const scheduled = [];
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    random: () => 0,
    reducedMotion: () => true,
    now: () => new Date("2026-07-07T05:00:00.000Z"),
    schedule: (callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
    cancelSchedule: () => {},
  });

  await elements.stars[0].click();
  await elements.antiButton.click();

  assert.equal(elements.shootingLayer.children.length, 0);
  assert.equal(
    scheduled.some(({ delay }) => delay >= 18_000 && delay <= 90_000),
    false,
  );
});
```

- [ ] **Step 2: Add a destroy test that proves effect timers are cancelled**

Extend the existing destroy test or add a focused one that records timer IDs from `schedule`, calls `site.destroy()`, and asserts `cancelSchedule` received the ambient and cleanup IDs in addition to existing timers.

- [ ] **Step 3: Run focused lifecycle tests**

```bash
node --test --test-name-pattern="reduced motion|destroy" tests/controller.test.mjs
```

Expected: PASS. If either fails, make only the minimal `script.js` change required by the failing assertion.

- [ ] **Step 4: Run the complete automated suite**

```bash
node --test tests/*.test.mjs
```

Expected: 0 failures.

- [ ] **Step 5: Commit lifecycle hardening**

```bash
git diff --check
git add tests/controller.test.mjs script.js
git commit -m "test: harden shooting star lifecycle"
```

If `script.js` was unchanged, omit it from `git add`.

### Task 5: Verify build, privacy, scope, and production artifact integrity

**Files:**
- Verify all tracked runtime/test/docs files.
- Do not modify unrelated runtime or assets.

- [ ] **Step 1: Run the complete test suite fresh**

```bash
node --test tests/*.test.mjs
```

Expected: 0 failures.

- [ ] **Step 2: Run repository validation**

```bash
node scripts/validate.mjs
```

Expected: exit 0.

- [ ] **Step 3: Build production output**

```bash
node scripts/build-site.mjs
```

Expected: exit 0 and `_site` is rebuilt successfully.

- [ ] **Step 4: Compare built runtime sources**

```bash
cmp script.js _site/script.js
cmp src/content.mjs _site/src/content.mjs
```

Expected: both commands exit 0.

- [ ] **Step 5: Verify soundtrack bytes are unchanged**

```bash
sha256sum assets/lunar-drive.opus _site/assets/lunar-drive.opus
```

Expected for both files:

```text
ba8d55ed26addb68ea68ca4703b96aeee665d429981495db3aee272e04081765
```

- [ ] **Step 6: Verify exact feature scope**

```bash
git diff --check origin/main...HEAD
git diff --name-only origin/main...HEAD | LC_ALL=C sort
git status --short
```

Expected changed paths are limited to:

```text
docs/superpowers/plans/2026-08-12-enhanced-shooting-stars.md
docs/superpowers/specs/2026-08-12-enhanced-shooting-stars-design.md
script.js
src/content.mjs
styles.css
tests/content.test.mjs
tests/controller.test.mjs
```

`git status --short` must print nothing.

- [ ] **Step 7: Perform focused privacy/runtime review**

```bash
git diff origin/main...HEAD -- script.js src/content.mjs styles.css
git diff origin/main...HEAD -- index.html src/audio.mjs src/time.mjs assets/lunar-drive.opus
```

Confirm:

- first diff contains only shooting-star generation/rendering/scheduling and related CSS;
- second diff is empty;
- no storage, analytics, identifiers, external requests, or private material were introduced;
- no message pool wording/order changed;
- no soundtrack, timeline, counter, sharing, or transmission-deck behavior changed.

### Task 6: Publish a focused pull request and stop before merge

**Files:**
- Publish branch: `feature/enhanced-shooting-stars`.

- [ ] **Step 1: Verify branch identity and push**

```bash
git branch --show-current
git status --short
git push origin feature/enhanced-shooting-stars
```

Expected: branch is `feature/enhanced-shooting-stars`, worktree is clean, push succeeds without force.

- [ ] **Step 2: Record the exact remote head SHA**

```bash
git fetch origin feature/enhanced-shooting-stars
OTU_EXPECTED_HEAD="$(git rev-parse origin/feature/enhanced-shooting-stars)"
printf '%s\n' "$OTU_EXPECTED_HEAD"
```

- [ ] **Step 3: Open the pull request**

Create a PR titled `Enhance shooting star effects` with:

- base: `main`
- head: `feature/enhanced-shooting-stars`
- summary: preset-driven cinematic meteors, transmission/Anti-Cringe/anniversary bursts, activity-aware ambient meteors
- accessibility: reduced-motion users receive no shooting-star rendering or ambient scheduling
- privacy: no storage, analytics, identifiers, external runtime requests, dependencies, or new assets
- verification: full tests, validator, production build, source/build comparison, unchanged soundtrack hash, focused diff review

- [ ] **Step 4: Verify PR head and filenames**

Require PR head SHA to equal `OTU_EXPECTED_HEAD` and require the changed-file set to match Task 5 exactly. Stop if the head moves unexpectedly or unrelated paths appear.

- [ ] **Step 5: Report the PR and pause**

Report the PR URL, exact head SHA, changed paths, fresh verification evidence, and any review comments. Do not merge until the user explicitly authorizes the merge.
