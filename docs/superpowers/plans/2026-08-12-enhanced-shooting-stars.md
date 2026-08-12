# Enhanced Shooting Stars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing shooting-star effect into a richer hybrid DOM/CSS effects system with named presets, transmission bursts, activity-aware ambient meteors, and preserved reduced-motion/performance safeguards.

**Architecture:** Keep deterministic particle generation in `src/content.mjs`, coordinate rendering/timers in `script.js`, and keep visual richness in `styles.css`. Four named presets (`ambient`, `transmission`, `antiCringe`, `anniversary`) share one generator and one renderer; the controller owns one ambient timer and one cleanup timer at a time.

**Tech Stack:** Dependency-free JavaScript ES modules, DOM/CSS animations, Node.js built-in test runner, existing repository validator/build scripts, GitHub Pages.

## Global Constraints

- No Canvas, WebGL, `requestAnimationFrame` particle loop, external animation library, or new runtime dependency.
- No new image, video, audio, or font assets.
- No local storage, session storage, cookies, analytics, identifiers, server-side state, or external runtime requests.
- Do not change message pools, transmission deck behavior, sharing behavior, timeline content, counters, soundtrack behavior, or the five-second equal-power audio crossfade.
- The effect layer remains `pointer-events: none`.
- Reduced motion is a hard guard: no shooting-star rendering and no ambient scheduling when `reducedMotion()` is true.
- Each new shooting-star batch replaces the previous batch.
- One ambient timer and one cleanup timer may be owned at a time; `destroy()` cancels both.
- Only transmission reveals refresh the active ambient window.
- Active ambient window: exactly 60,000 ms after the latest transmission reveal.
- Calm ambient cadence: 45,000-90,000 ms.
- Active ambient cadence: 18,000-36,000 ms.
- Preserve `assets/lunar-drive.opus` byte-for-byte.

---

## File map

- `src/content.mjs`: immutable preset ranges and deterministic shooting-star spec generation.
- `tests/content.test.mjs`: schema, ranges, determinism, and invalid-preset coverage.
- `script.js`: shared renderer, preset triggers, ambient scheduler, cleanup timing, reduced-motion guard, destroy cleanup.
- `tests/controller.test.mjs`: trigger routing, timer lifecycle, activity cadence, reduced motion, cleanup.
- `styles.css`: meteor tails, heads, tone variants, comet glow, trajectory-variable animation.
- `docs/superpowers/specs/2026-08-12-enhanced-shooting-stars-design.md`: approved design source of truth.

### Task 1: Introduce named presets and the shared cinematic renderer

**Files:**
- Modify: `src/content.mjs` around `createShootingStarSpecs()`
- Modify: `tests/content.test.mjs` around the current shooting-star test
- Modify: `script.js` around `renderShootingStars()`, anniversary, and Anti-Cringe calls
- Modify: `tests/controller.test.mjs` around existing shooting-star assertions
- Modify: `styles.css` around `.shooting-star-layer`, `.shooting-star`, and `@keyframes shoot`

**Interfaces:**
- Consumes: `random(): number`.
- Produces: `createShootingStarSpecs(preset = "ambient", random = Math.random): ReadonlyArray<ShootingStarSpec>`.
- `ShootingStarSpec`: `{ left, top, delayMs, durationMs, angleDeg, trailPx, thicknessPx, scale, brightness, travelXvw, travelYvh, color, isComet }`.
- Valid presets: `ambient`, `transmission`, `antiCringe`, `anniversary`.
- Internal renderer: `renderShootingStars(preset): void`.
- Cleanup delay: `max(delayMs + durationMs) + 160` ms.

- [ ] **Step 1: Replace the old content test with failing preset/schema tests**

Replace the existing `creates bounded shooting-star specifications` test with:

```js
test("creates bounded shooting-star specifications for every preset", () => {
  const expectedCounts = {
    ambient: 2,
    transmission: 5,
    antiCringe: 12,
    anniversary: 18,
  };

  for (const [preset, expectedCount] of Object.entries(expectedCounts)) {
    const specs = createShootingStarSpecs(preset, () => 0.5);
    assert.equal(specs.length, expectedCount, preset);
    for (const spec of specs) {
      assert.ok(spec.left >= 5 && spec.left <= 95);
      assert.ok(spec.top >= -8 && spec.top <= 10);
      assert.ok(spec.delayMs >= 0 && spec.delayMs <= 900);
      assert.ok(spec.durationMs >= 850 && spec.durationMs <= 1_900);
      assert.ok(spec.angleDeg >= -52 && spec.angleDeg <= -26);
      assert.ok(spec.trailPx >= 56 && spec.trailPx <= 150);
      assert.ok(spec.thicknessPx >= 1 && spec.thicknessPx <= 3.2);
      assert.ok(spec.scale >= 0.7 && spec.scale <= 1.35);
      assert.ok(spec.brightness >= 0.5 && spec.brightness <= 1);
      assert.ok(spec.travelXvw >= -62 && spec.travelXvw <= -32);
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

- [ ] **Step 2: Add a failing controller test for rich rendering and derived cleanup**

Add:

```js
test("renders rich shooting-star variables and derived cleanup", async () => {
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

  await elements.antiButton.click();

  assert.equal(elements.shootingLayer.children.length, 12);
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

  const cleanup = scheduled.find(
    ({ delay }) => delay > 1_000 && delay < 3_000,
  );
  assert.ok(cleanup);
  cleanup.callback();
  assert.equal(elements.shootingLayer.children.length, 0);
});
```

- [ ] **Step 3: Run the new tests and verify RED**

```bash
node --test tests/content.test.mjs
node --test --test-name-pattern="renders rich shooting-star variables" tests/controller.test.mjs
```

Expected: FAIL because the current generator is count-based and the renderer exposes only left/delay/duration with a fixed 2,000 ms cleanup.

- [ ] **Step 4: Add immutable preset ranges and helper functions**

Add before `createShootingStarSpecs()`:

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
    count: 12,
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

- [ ] **Step 5: Replace `createShootingStarSpecs()` with the named-preset generator**

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

- [ ] **Step 6: Replace `renderShootingStars(count)` with the shared preset renderer**

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

- [ ] **Step 7: Route the two existing triggers to preset names**

Change only these existing calls in this task:

```js
// anniversary entry
renderShootingStars("anniversary");

// Anti-Cringe
renderShootingStars("antiCringe");
```

- [ ] **Step 8: Replace the shooting-star CSS with the cinematic treatment**

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

Keep `.shooting-star-layer` fixed, full-screen, overflow-hidden, and `pointer-events: none`.

- [ ] **Step 9: Run the focused and complete suite**

```bash
node --test tests/content.test.mjs
node --test --test-name-pattern="shooting-star|Anti-Cringe|anniversary" tests/controller.test.mjs
node --test tests/*.test.mjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 10: Commit the working preset/renderer unit**

```bash
git diff --check
git add src/content.mjs tests/content.test.mjs script.js tests/controller.test.mjs styles.css
git commit -m "feat: render cinematic shooting stars"
```

### Task 2: Add transmission bursts and activity-aware ambient meteors

**Files:**
- Modify: `script.js` near module constants, effect state, `revealMessage()`, initialization, and `destroy()`
- Modify: `tests/controller.test.mjs` near transmission and scheduling tests

**Interfaces:**
- Constants: `ACTIVE_AMBIENT_WINDOW_MS = 60_000`, `CALM_AMBIENT_RANGE = [45_000, 90_000]`, `ACTIVE_AMBIENT_RANGE = [18_000, 36_000]`.
- State: `ambientTimer`, `lastTransmissionActivityAt`.
- Internal functions: `scheduleAmbientMeteor()`, `markTransmissionActivity()`.

- [ ] **Step 1: Add a failing transmission-burst test**

```js
test("renders a five-particle transmission burst", async () => {
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    random: () => 0.5,
    reducedMotion: () => false,
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  await elements.stars[0].click();
  assert.equal(elements.shootingLayer.children.length, 5);
});
```

- [ ] **Step 2: Add a failing calm-to-active ambient cadence test**

```js
test("switches ambient scheduling from calm to active after a transmission", async () => {
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

- [ ] **Step 3: Add a failing test proving Anti-Cringe does not refresh activity**

```js
test("does not activate ambient cadence from Anti-Cringe", async () => {
  const scheduled = [];
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    random: () => 0,
    reducedMotion: () => false,
    now: () => new Date("2026-08-12T04:00:00.000Z"),
    schedule: (callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
    cancelSchedule: () => {},
  });

  await elements.antiButton.click();
  assert.equal(scheduled.some(({ delay }) => delay === 18_000), false);
});
```

- [ ] **Step 4: Run the three tests and verify RED**

```bash
node --test --test-name-pattern="transmission burst|switches ambient|does not activate ambient" tests/controller.test.mjs
```

Expected: FAIL because transmission effects and ambient scheduling are not implemented.

- [ ] **Step 5: Add exact timing constants and a bounded delay helper**

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

- [ ] **Step 6: Add ambient state and scheduler inside `initSite()`**

Beside `cleanupTimer`, add:

```js
let ambientTimer;
let lastTransmissionActivityAt = -Infinity;
```

Add:

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

- [ ] **Step 7: Trigger the transmission burst and activity refresh**

At the end of `revealMessage()`, after updating the visible transmission:

```js
renderShootingStars("transmission");
markTransmissionActivity();
```

Do not call `markTransmissionActivity()` from Anti-Cringe or sharing.

- [ ] **Step 8: Start ambient scheduling at initialization**

After the initial temporal render and normal timer setup, call:

```js
scheduleAmbientMeteor();
```

- [ ] **Step 9: Run controller and full tests**

```bash
node --test tests/controller.test.mjs
node --test tests/*.test.mjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 10: Commit the ambient/interaction unit**

```bash
git diff --check
git add script.js tests/controller.test.mjs
git commit -m "feat: add ambient meteor activity"
```

### Task 3: Harden reduced-motion and effect lifecycle behavior

**Files:**
- Modify: `tests/controller.test.mjs`
- Modify if required by the failing tests: `script.js`

**Interfaces:**
- Uses the final renderer and scheduler from Tasks 1-2.

- [ ] **Step 1: Add a reduced-motion test covering ambient and interaction effects**

```js
test("suppresses shooting-star effects and ambient scheduling for reduced motion", async () => {
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

- [ ] **Step 2: Add a destroy test with exact timer cancellation assertions**

Add:

```js
test("destroy cancels ambient and shooting-star cleanup timers", async () => {
  const scheduled = [];
  const cancelled = [];
  const { documentRef, elements } = createFixture();
  const site = initSite({
    documentRef,
    random: () => 0,
    reducedMotion: () => false,
    schedule: (callback, delay) => {
      const id = scheduled.length + 1;
      scheduled.push({ id, callback, delay });
      return id;
    },
    cancelSchedule: (id) => {
      if (id !== undefined) cancelled.push(id);
    },
  });

  const ambient = scheduled.find(({ delay }) => delay === 45_000);
  await elements.antiButton.click();
  const cleanup = scheduled.find(
    ({ delay }) => delay > 1_000 && delay < 3_000,
  );

  site.destroy();

  assert.ok(ambient);
  assert.ok(cleanup);
  assert.ok(cancelled.includes(ambient.id));
  assert.ok(cancelled.includes(cleanup.id));
  assert.equal(elements.shootingLayer.children.length, 0);
});
```

- [ ] **Step 3: Run the lifecycle tests and verify their actual state**

```bash
node --test --test-name-pattern="reduced motion|destroy cancels ambient" tests/controller.test.mjs
```

Expected: PASS if Tasks 1-2 already satisfy lifecycle requirements. If a test fails, proceed to Step 4; otherwise skip Step 4.

- [ ] **Step 4: If needed, make the minimal lifecycle fix in `destroy()`**

The required final effect cleanup is exactly:

```js
cancelSchedule(ambientTimer);
cancelSchedule(cleanupTimer);
shootingLayer.replaceChildren();
```

Preserve every existing event-listener, midnight-timer, and soundtrack cleanup statement.

- [ ] **Step 5: Run the complete suite**

```bash
node --test tests/*.test.mjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 6: Commit lifecycle hardening**

```bash
git diff --check
git add tests/controller.test.mjs script.js
git commit -m "test: harden shooting star lifecycle"
```

If `script.js` has no diff, stage only `tests/controller.test.mjs`.

### Task 4: Verify build, privacy, scope, and production integrity

**Files:**
- Verify the complete branch; do not add unrelated modifications.

- [ ] **Step 1: Run the full automated suite fresh**

```bash
node --test tests/*.test.mjs
```

Expected: zero failures.

- [ ] **Step 2: Run repository validation**

```bash
node scripts/validate.mjs
```

Expected: exit 0.

- [ ] **Step 3: Build the production site**

```bash
node scripts/build-site.mjs
```

Expected: exit 0.

- [ ] **Step 4: Compare built runtime sources**

```bash
cmp script.js _site/script.js
cmp src/content.mjs _site/src/content.mjs
```

Expected: both commands exit 0.

- [ ] **Step 5: Verify soundtrack bytes**

```bash
sha256sum assets/lunar-drive.opus _site/assets/lunar-drive.opus
```

Expected for both:

```text
ba8d55ed26addb68ea68ca4703b96aeee665d429981495db3aee272e04081765
```

- [ ] **Step 6: Verify exact branch scope**

```bash
git diff --check origin/main...HEAD
git diff --name-only origin/main...HEAD | LC_ALL=C sort
git status --short
```

Allowed changed paths only:

```text
docs/superpowers/plans/2026-08-12-enhanced-shooting-stars.md
docs/superpowers/specs/2026-08-12-enhanced-shooting-stars-design.md
script.js
src/content.mjs
styles.css
tests/content.test.mjs
tests/controller.test.mjs
```

Expected: no other path appears and `git status --short` is empty.

- [ ] **Step 7: Perform focused runtime/privacy review**

```bash
git diff origin/main...HEAD -- script.js src/content.mjs styles.css
git diff origin/main...HEAD -- index.html src/audio.mjs src/time.mjs assets/lunar-drive.opus
```

Required result:

- first diff contains only shooting-star generation, rendering, scheduling, and related CSS;
- second diff is empty;
- no storage, analytics, identifiers, external requests, dependencies, or private material;
- no message pool wording/order changes;
- no sharing, timeline, counter, transmission-deck, or soundtrack behavior changes.

### Task 5: Publish a focused PR and stop before merge

**Files:**
- Publish `feature/enhanced-shooting-stars` only.

- [ ] **Step 1: Verify and push the branch**

```bash
git branch --show-current
git status --short
git push origin feature/enhanced-shooting-stars
```

Expected: correct branch, clean worktree, non-force push succeeds.

- [ ] **Step 2: Record the exact remote head**

```bash
git fetch origin feature/enhanced-shooting-stars
OTU_EXPECTED_HEAD="$(git rev-parse origin/feature/enhanced-shooting-stars)"
printf '%s\n' "$OTU_EXPECTED_HEAD"
```

- [ ] **Step 3: Open the PR**

Use title:

```text
Enhance shooting star effects
```

PR body must state:

```text
Summary:
- add preset-driven cinematic shooting stars
- add transmission bursts and activity-aware ambient meteors
- preserve Anti-Cringe and anniversary effects with richer visuals

Accessibility:
- reduced-motion users receive no shooting-star rendering or ambient scheduling

Privacy/scope:
- no storage, analytics, identifiers, external runtime requests, dependencies, or new assets

Verification:
- full tests
- validator
- production build
- source/build comparison
- unchanged soundtrack hash
- focused diff/privacy review
```

- [ ] **Step 4: Verify PR head and changed filenames**

Require the PR head SHA to equal `OTU_EXPECTED_HEAD` and require the changed-file set to match the allowed list in Task 4 exactly. Stop if the head moves or any unrelated path appears.

- [ ] **Step 5: Report and pause**

Report the PR URL, exact head SHA, changed paths, fresh verification evidence, and review status. Do not merge until the user explicitly authorizes it.
