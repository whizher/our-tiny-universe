# Our Tiny Universe v1.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add distinct fictional star personalities, anniversary behavior, sharing polish, social-preview assets, and stronger privacy enforcement without changing the site's dependency-free architecture.

**Architecture:** Keep the existing static HTML/CSS/ES-module structure. Pure content and calendar logic stay in src/content.mjs and src/time.mjs; script.js remains the testable DOM controller; build and privacy enforcement remain in scripts/build-site.mjs and scripts/validate.mjs.

**Tech Stack:** HTML5, CSS, browser JavaScript ES modules, Node.js 22 built-in test runner, GitHub Pages, ImageMagick only as a one-time local asset-generation tool.

## Global Constraints

- Preserve the existing plain HTML, CSS, and ES-module architecture.
- Add no npm dependency, framework, backend, API, database, analytics, cookie, form, or persistent browser storage.
- The only approved existing personal facts are the names Naufal and Rity and the relationship start date, 7 July 2024.
- All new interactive copy must be fictional and newly authored. Do not read, import, copy, paraphrase, reference, or commit any private conversation or private media during implementation.
- Do not add private photos, phone numbers, locations, health details, arguments, deleted-message details, intimate details, or private plans.
- Keep all runtime assets local and make no third-party runtime request.
- Preserve Asia/Pontianak calendar behavior and reduced-motion accessibility.
- Preserve every existing test and add new coverage; do not weaken assertions to make changes pass.
- Keep the social preview at exactly 1200 × 630 px and no larger than 1 MiB.
- Limit every other tracked file to 256 KiB.
- Do not push, open a pull request, or deploy until Naufal gives separate explicit approval.

## File Map

**Modify**

- src/content.mjs — named fictional message pools and anti-cringe selection.
- src/time.mjs — pure anniversary-state calculation.
- script.js — star routing, temporal rendering, animation hook, anniversary flourish, and share fallback.
- index.html — stable source attributes, approved timeline, anniversary status, sharing markup, favicon, and social metadata.
- styles.css — anniversary, sharing, and message-reveal presentation.
- scripts/build-site.mjs — copy the two approved public assets.
- scripts/validate.mjs — repository allowlist, size checks, and exact metadata URL handling.
- tests/content.test.mjs — named-pool and anti-cringe tests.
- tests/time.test.mjs — anniversary boundary tests.
- tests/controller.test.mjs — star attribution, anniversary, share, and cleanup tests.
- tests/build.test.mjs — asset, metadata, repository-policy, and artifact tests.
- README.md — document the v1.1 behavior and unchanged privacy boundary.

**Create**

- assets/social-preview.png — deterministic 1200 × 630 public link-preview image.
- assets/favicon.svg — deterministic two-star/orbit favicon.

**Do not create**

- Any chat export, photo, archive, tracking configuration, lockfile, dependency manifest beyond the existing package.json, service worker, or user-data file.

---

### Task 1: Split fictional content into stable named pools

**Files:**

- Modify: tests/content.test.mjs
- Modify: src/content.mjs
- Modify: tests/controller.test.mjs
- Modify: script.js
- Modify: index.html

**Interfaces:**

- Produces: MESSAGE_POOLS: Readonly<Record<"naufal" | "rity", ReadonlyArray<string>>>
- Produces: ANTI_CRINGE_MESSAGES: ReadonlyArray<string>
- Produces: pickNextMessage(source, lastIndex, random) -> { source, index, message }
- Produces: pickNextAntiCringe(lastIndex, random) -> { index, message }

- [ ] **Step 1: Replace the shared-content assertions with failing named-pool tests**

In tests/content.test.mjs, import the new symbols and assert the approved fictional copy:

~~~js
import test from "node:test";
import assert from "node:assert/strict";
import {
  ANTI_CRINGE_MESSAGES,
  MESSAGE_POOLS,
  createShootingStarSpecs,
  pickNextAntiCringe,
  pickNextMessage,
} from "../src/content.mjs";

test("contains separate approved fictional message pools", () => {
  assert.deepEqual(Object.keys(MESSAGE_POOLS), ["naufal", "rity"]);
  assert.deepEqual(MESSAGE_POOLS.naufal, [
    "Naufal entered the orbit. Normal behavior immediately left.",
    "Current status: dramatic, but still present.",
    "Acts chaotic. Still checks if Rity is okay.",
    "Naufal has a plan. The universe is concerned.",
    "Somehow both the problem and the tech support.",
    "Orbit stability: questionable. Commitment: still online.",
    "Naufal found a new way to be weird. Again.",
    "Romance detected. Naufal is pretending not to notice.",
  ]);
  assert.deepEqual(MESSAGE_POOLS.rity, [
    "Rity entered the orbit. Naufal's peace immediately left.",
    "Roasting Naufal remains a renewable energy source.",
    "Acts unimpressed. Keeps showing up anyway.",
    "Patience level: somehow still above zero.",
    "Rity detected unnecessary Naufal behavior.",
    "Romance detected. Sarcasm deployed immediately.",
    "Orbit supervisor: tired, but operational.",
    "Caring, but please do not make it weird.",
  ]);
});

test("contains the approved anti-cringe responses", () => {
  assert.deepEqual(ANTI_CRINGE_MESSAGES, [
    "Okay, cukup romantisnya.",
    "Romance levels exceeded safe limits.",
    "Emergency sarcasm deployed.",
    "Cringe contained. Orbit stabilized.",
  ]);
});

test("selects independently by source without an immediate repeat", () => {
  assert.deepEqual(pickNextMessage("naufal", -1, () => 0), {
    source: "naufal",
    index: 0,
    message: MESSAGE_POOLS.naufal[0],
  });
  assert.deepEqual(pickNextMessage("rity", 0, () => 0), {
    source: "rity",
    index: 1,
    message: MESSAGE_POOLS.rity[1],
  });
});

test("rejects an unknown message source", () => {
  assert.throws(
    () => pickNextMessage("unknown", -1, () => 0),
    /Unknown message source/,
  );
});

test("selects anti-cringe copy without an immediate repeat", () => {
  assert.deepEqual(pickNextAntiCringe(0, () => 0), {
    index: 1,
    message: ANTI_CRINGE_MESSAGES[1],
  });
});
~~~

Keep the existing shooting-star bounds test below these tests.

- [ ] **Step 2: Run the content tests and confirm the new API is missing**

Run:

~~~bash
node --test tests/content.test.mjs
~~~

Expected: FAIL because MESSAGE_POOLS, ANTI_CRINGE_MESSAGES, and pickNextAntiCringe are not exported and pickNextMessage still has the old signature.

- [ ] **Step 3: Implement the named immutable pools and shared no-repeat helper**

Replace the message model in src/content.mjs with:

~~~js
export const MESSAGE_POOLS = Object.freeze({
  naufal: Object.freeze([
    "Naufal entered the orbit. Normal behavior immediately left.",
    "Current status: dramatic, but still present.",
    "Acts chaotic. Still checks if Rity is okay.",
    "Naufal has a plan. The universe is concerned.",
    "Somehow both the problem and the tech support.",
    "Orbit stability: questionable. Commitment: still online.",
    "Naufal found a new way to be weird. Again.",
    "Romance detected. Naufal is pretending not to notice.",
  ]),
  rity: Object.freeze([
    "Rity entered the orbit. Naufal's peace immediately left.",
    "Roasting Naufal remains a renewable energy source.",
    "Acts unimpressed. Keeps showing up anyway.",
    "Patience level: somehow still above zero.",
    "Rity detected unnecessary Naufal behavior.",
    "Romance detected. Sarcasm deployed immediately.",
    "Orbit supervisor: tired, but operational.",
    "Caring, but please do not make it weird.",
  ]),
});

export const ANTI_CRINGE_MESSAGES = Object.freeze([
  "Okay, cukup romantisnya.",
  "Romance levels exceeded safe limits.",
  "Emergency sarcasm deployed.",
  "Cringe contained. Orbit stabilized.",
]);

function boundedRandom(random) {
  return Math.min(0.999_999, Math.max(0, Number(random())));
}

function pickFromPool(pool, lastIndex, random) {
  let index = Math.floor(boundedRandom(random) * pool.length);
  if (index === lastIndex) {
    index = (index + 1) % pool.length;
  }
  return { index, message: pool[index] };
}

export function pickNextMessage(
  source,
  lastIndex = -1,
  random = Math.random,
) {
  const pool = MESSAGE_POOLS[source];
  if (!pool) {
    throw new RangeError("Unknown message source: " + source);
  }
  return { source, ...pickFromPool(pool, lastIndex, random) };
}

export function pickNextAntiCringe(
  lastIndex = -1,
  random = Math.random,
) {
  return pickFromPool(ANTI_CRINGE_MESSAGES, lastIndex, random);
}
~~~

Retain createShootingStarSpecs unchanged below this implementation.

- [ ] **Step 4: Migrate the controller to the new source-aware API**

In index.html, change the star hooks to data-message-source="naufal" and
data-message-source="rity". Add data-message-title to the existing message-card
heading.

In the controller fixture, add dataset = {} to FakeElement, set the two star
source values, add messageTitle to the selector map, and replace the old shared
message assertion with:

~~~js
test("routes each star to its own attributed message pool", () => {
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    random: () => 0,
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  elements.stars[0].click();
  assert.equal(
    elements.messageTitle.textContent,
    "Transmission from Naufal ✨",
  );
  assert.equal(
    elements.message.textContent,
    "Naufal entered the orbit. Normal behavior immediately left.",
  );

  elements.stars[1].click();
  assert.equal(
    elements.messageTitle.textContent,
    "Transmission from Rity ✨",
  );
  assert.equal(
    elements.message.textContent,
    "Rity entered the orbit. Naufal's peace immediately left.",
  );
});
~~~

In script.js, query and require data-message-title, replace lastMessageIndex
with the source map below, and route revealMessage through event.currentTarget:

~~~js
const lastMessageIndexes = new Map([
  ["naufal", -1],
  ["rity", -1],
]);

function revealMessage(event) {
  const source = event.currentTarget.dataset.messageSource;
  const selection = pickNextMessage(
    source,
    lastMessageIndexes.get(source),
    random,
  );
  lastMessageIndexes.set(source, selection.index);
  messageTitle.textContent =
    "Transmission from " +
    source.charAt(0).toUpperCase() +
    source.slice(1) +
    " ✨";
  message.textContent = selection.message;
}
~~~

During initialization, verify the sources with:

~~~js
const sources = stars.map((star) => star.dataset.messageSource).sort();
const validSources =
  sources.length === 2 &&
  sources[0] === "naufal" &&
  sources[1] === "rity";
if (required.some((element) => !element) || !validSources) {
  throw new Error("Our Tiny Universe markup is incomplete");
}
~~~

- [ ] **Step 5: Run the focused and full tests**

Run:

~~~bash
node --test tests/content.test.mjs
node --test tests/controller.test.mjs
node --test tests/*.test.mjs
~~~

Expected: all content, controller, and full-suite tests PASS.

- [ ] **Step 6: Commit the content model and source routing**

~~~bash
git add src/content.mjs tests/content.test.mjs \
  script.js index.html tests/controller.test.mjs
git commit -m "feat: add distinct fictional star messages"
~~~

---

### Task 2: Add Pontianak-correct anniversary state

**Files:**

- Modify: tests/time.test.mjs
- Modify: src/time.mjs

**Interfaces:**

- Produces: anniversaryState(date) -> { isAnniversary: boolean, daysUntilNext: number }
- Preserves: daysTogether(date) and millisecondsUntilNextPontianakMidnight(date)

- [ ] **Step 1: Add failing anniversary boundary tests**

Append to tests/time.test.mjs:

~~~js
test("reports the day before, day of, and day after the anniversary", () => {
  assert.deepEqual(
    anniversaryState(new Date("2026-07-06T05:00:00.000Z")),
    { isAnniversary: false, daysUntilNext: 1 },
  );
  assert.deepEqual(
    anniversaryState(new Date("2026-07-07T05:00:00.000Z")),
    { isAnniversary: true, daysUntilNext: 0 },
  );
  assert.deepEqual(
    anniversaryState(new Date("2026-07-08T05:00:00.000Z")),
    { isAnniversary: false, daysUntilNext: 364 },
  );
});

test("counts across a leap day when targeting the next anniversary", () => {
  assert.deepEqual(
    anniversaryState(new Date("2027-07-08T05:00:00.000Z")),
    { isAnniversary: false, daysUntilNext: 365 },
  );
});

test("anniversary state rejects invalid dates", () => {
  assert.throws(
    () => anniversaryState(new Date("invalid")),
    TypeError,
  );
});
~~~

Add anniversaryState to the import list at the top.

- [ ] **Step 2: Run the focused tests and verify the missing export**

Run:

~~~bash
node --test tests/time.test.mjs
~~~

Expected: FAIL because anniversaryState is not exported.

- [ ] **Step 3: Implement the pure calendar calculation**

Add to src/time.mjs after daysTogether:

~~~js
export function anniversaryState(date = new Date()) {
  const current = pontianakParts(date);
  const isAnniversary = current.month === 7 && current.day === 7;
  const nextYear =
    current.month < 7 || (current.month === 7 && current.day <= 7)
      ? current.year
      : current.year + 1;
  const daysUntilNext =
    calendarOrdinal({ year: nextYear, month: 7, day: 7 }) -
    calendarOrdinal(current);
  return { isAnniversary, daysUntilNext };
}
~~~

- [ ] **Step 4: Run focused and full tests**

~~~bash
node --test tests/time.test.mjs
node --test tests/*.test.mjs
~~~

Expected: all time tests PASS and no existing counter/midnight behavior regresses.

- [ ] **Step 5: Commit the calendar model**

~~~bash
git add src/time.mjs tests/time.test.mjs
git commit -m "feat: add Pontianak anniversary state"
~~~

---

### Task 3: Render anniversary state and rotate anti-cringe responses

**Files:**

- Modify: index.html
- Modify: script.js
- Modify: tests/controller.test.mjs

**Interfaces:**

- Consumes: pickNextAntiCringe(lastIndex, random)
- Consumes: anniversaryState(date)
- Produces markup hooks: data-universe and data-anniversary-status.

- [ ] **Step 1: Expand the fake DOM and write failing temporal tests**

FakeElement already has dataset from Task 1. Add the animation-test helpers:

~~~js
this.offsetWidth = 1;
this.classes = new Set();
this.classList = {
  add: (...names) => names.forEach((name) => this.classes.add(name)),
  remove: (...names) => names.forEach((name) => this.classes.delete(name)),
};
~~~

Add universe and anniversaryStatus fake elements and selectors:

~~~js
["[data-universe]", elements.universe],
["[data-anniversary-status]", elements.anniversaryStatus],
~~~

Add:

~~~js
test("renders anniversary mode and its one-time flourish", () => {
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    now: () => new Date("2026-07-07T05:00:00.000Z"),
    random: () => 0.5,
    reducedMotion: () => false,
    schedule: () => 1,
    cancelSchedule: () => {},
  });
  assert.equal(
    elements.anniversaryStatus.textContent,
    "Orbit anniversary unlocked ✨",
  );
  assert.equal(elements.universe.dataset.anniversary, "true");
  assert.equal(elements.layer.children.length, 18);
});

test("skips the anniversary flourish with reduced motion", () => {
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    now: () => new Date("2026-07-07T05:00:00.000Z"),
    reducedMotion: () => true,
    schedule: () => 1,
    cancelSchedule: () => {},
  });
  assert.equal(elements.universe.dataset.anniversary, "true");
  assert.equal(elements.layer.children.length, 0);
});

test("destroy removes interaction listeners and cancels timers", () => {
  const { documentRef, elements } = createFixture();
  const cancelled = [];
  const site = initSite({
    documentRef,
    schedule: () => 99,
    cancelSchedule: (timer) => cancelled.push(timer),
  });
  site.destroy();
  elements.stars[0].click();
  elements.antiButton.click();
  assert.equal(elements.message.textContent, "");
  assert.equal(elements.layer.children.length, 0);
  assert.ok(cancelled.includes(99));
});
~~~

Update the anti-cringe test interaction to:

~~~js
elements.antiButton.click();
assert.equal(elements.antiResult.textContent, "Okay, cukup romantisnya.");
elements.antiButton.click();
assert.equal(
  elements.antiResult.textContent,
  "Romance levels exceeded safe limits.",
);
~~~

- [ ] **Step 2: Run controller tests and verify the missing DOM/controller behavior**

~~~bash
node --test tests/controller.test.mjs
~~~

Expected: FAIL because the anniversary selectors/state, rotating anti-cringe
behavior, and reducedMotion injection do not exist.

- [ ] **Step 3: Add exact markup hooks and approved timeline copy**

In index.html:

- Add data-universe to the main element.
- Add this immediately after data-days:

~~~html
<p class="anniversary-status" data-anniversary-status>
  Anniversary berikutnya: 7 Juli.
</p>
~~~
- Replace the timeline list with:

~~~html
<ol>
  <li>
    <span>Long before the orbit</span>
    <strong>The lore had already started.</strong>
  </li>
  <li>
    <span>7 Juli 2024</span>
    <strong>Officially one orbit.</strong>
  </li>
  <li>
    <span>Today</span>
    <strong>Same chaos, more teamwork.</strong>
  </li>
</ol>
~~~

- [ ] **Step 4: Implement temporal rendering and rotating anti-cringe copy**

In script.js:

- Import anniversaryState and pickNextAntiCringe.
- Add required selectors for universe and anniversaryStatus.
- Add:

~~~js
let lastAntiCringeIndex = -1;
let anniversaryActive = false;
~~~

- Add reducedMotion to initSite defaults:

~~~js
reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches,
~~~

- Generalize particle creation:

~~~js
function renderShootingStars(count) {
  const particles = createShootingStarSpecs(count, random).map((spec) => {
    const particle = documentRef.createElement("span");
    particle.className = "shooting-star";
    particle.style.setProperty("--left", spec.left + "%");
    particle.style.setProperty("--delay", spec.delayMs + "ms");
    particle.style.setProperty("--duration", spec.durationMs + "ms");
    return particle;
  });
  shootingLayer.replaceChildren(...particles);
  cancelSchedule(cleanupTimer);
  cleanupTimer = schedule(() => shootingLayer.replaceChildren(), 2_000);
}
~~~

- Render both counters from one date snapshot:

~~~js
function renderTemporalState() {
  const current = now();
  counter.textContent =
    "Sudah " + daysTogether(current) + " hari di orbit yang sama.";
  const state = anniversaryState(current);
  universe.dataset.anniversary = String(state.isAnniversary);
  anniversaryStatus.textContent = state.isAnniversary
    ? "Orbit anniversary unlocked ✨"
    : state.daysUntilNext + " hari menuju orbit anniversary berikutnya.";

  if (state.isAnniversary && !anniversaryActive && !reducedMotion()) {
    renderShootingStars(18);
  }
  anniversaryActive = state.isAnniversary;
}
~~~

- Replace launchAntiCringe with:

~~~js
function launchAntiCringe() {
  const selection = pickNextAntiCringe(lastAntiCringeIndex, random);
  lastAntiCringeIndex = selection.index;
  antiResult.hidden = false;
  antiResult.textContent = selection.message;
  renderShootingStars(12);
}
~~~
- At the end of the existing revealMessage, replay the CSS hook:

~~~js
message.classList.remove("message--reveal");
void message.offsetWidth;
message.classList.add("message--reveal");
~~~

- Replace renderCounter calls with renderTemporalState, including inside the midnight timer.
- Preserve listener/timer cleanup in destroy().

- [ ] **Step 5: Run controller, time, content, and full tests**

~~~bash
node --test tests/controller.test.mjs tests/time.test.mjs tests/content.test.mjs
node --test tests/*.test.mjs
~~~

Expected: all tests PASS.

- [ ] **Step 6: Commit the interaction controller**

~~~bash
git add index.html script.js tests/controller.test.mjs
git commit -m "feat: personalize star and anniversary interactions"
~~~

---

### Task 4: Add native sharing with safe fallbacks

**Files:**

- Modify: index.html
- Modify: script.js
- Modify: tests/controller.test.mjs

**Interfaces:**

- Produces: shareUniverse({ nativeShare, writeClipboard, url }) -> Promise<"shared" | "copied" | "cancelled" | "manual">
- Produces markup hooks: data-share, data-share-status, data-share-fallback.

- [ ] **Step 1: Make fake clicks await async listeners and add failing share tests**

Change FakeElement.click to:

~~~js
async click() {
  await Promise.all(
    (this.listeners.get("click") || []).map((listener) =>
      listener({ currentTarget: this }),
    ),
  );
}
~~~

Add shareButton, shareStatus, and shareFallback to the fixture and selector map.
Set elements.shareStatus.hidden = true and elements.shareFallback.hidden = true
inside createFixture. Then add:

~~~js
test("prefers native sharing", async () => {
  const calls = [];
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    nativeShare: async (payload) => calls.push(payload),
    writeClipboard: async () => assert.fail("clipboard should not run"),
    schedule: () => 1,
    cancelSchedule: () => {},
  });
  await elements.shareButton.click();
  assert.equal(calls.length, 1);
  assert.equal(elements.shareFallback.hidden, true);
});

test("falls back to clipboard when native sharing is unavailable", async () => {
  const copied = [];
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    nativeShare: null,
    writeClipboard: async (value) => copied.push(value),
    schedule: () => 1,
    cancelSchedule: () => {},
  });
  await elements.shareButton.click();
  assert.deepEqual(copied, [
    "https://whizher.github.io/our-tiny-universe/",
  ]);
  assert.equal(elements.shareStatus.textContent, "Link copied ✨");
});

test("keeps cancellation silent and reveals a manual fallback on failure", async () => {
  const cancelled = createFixture();
  initSite({
    documentRef: cancelled.documentRef,
    nativeShare: async () => {
      const error = new Error("cancelled");
      error.name = "AbortError";
      throw error;
    },
    writeClipboard: async () => assert.fail("clipboard should not run"),
    schedule: () => 1,
    cancelSchedule: () => {},
  });
  await cancelled.elements.shareButton.click();
  assert.equal(cancelled.elements.shareStatus.textContent, "");

  const failed = createFixture();
  initSite({
    documentRef: failed.documentRef,
    nativeShare: async () => {
      throw new Error("share failed");
    },
    writeClipboard: async () => {
      throw new Error("clipboard failed");
    },
    schedule: () => 1,
    cancelSchedule: () => {},
  });
  await failed.elements.shareButton.click();
  assert.equal(failed.elements.shareFallback.hidden, false);
});

test("destroy removes the share listener", async () => {
  let shares = 0;
  const { documentRef, elements } = createFixture();
  const site = initSite({
    documentRef,
    nativeShare: async () => {
      shares += 1;
    },
    schedule: () => 1,
    cancelSchedule: () => {},
  });
  site.destroy();
  await elements.shareButton.click();
  assert.equal(shares, 0);
});
~~~

- [ ] **Step 2: Run the focused test and verify the share hooks are missing**

~~~bash
node --test tests/controller.test.mjs
~~~

Expected: FAIL because share elements and shareUniverse do not exist.

- [ ] **Step 3: Add the share section to index.html**

Insert after the anti-cringe section:

~~~html
<section class="share" aria-label="Share this universe">
  <button type="button" data-share>Share Our Universe</button>
  <p data-share-status hidden aria-live="polite"></p>
  <a
    data-share-fallback
    href="https://whizher.github.io/our-tiny-universe/"
    hidden
  >
    Open the public link to copy it manually
  </a>
</section>
~~~

- [ ] **Step 4: Implement the pure share helper**

Add near the top of script.js:

~~~js
const CANONICAL_URL = "https://whizher.github.io/our-tiny-universe/";

export async function shareUniverse({
  nativeShare,
  writeClipboard,
  url = CANONICAL_URL,
}) {
  if (nativeShare) {
    try {
      await nativeShare({
        title: "Our Tiny Universe 🌌",
        text: "Same chaos, more teamwork.",
        url,
      });
      return "shared";
    } catch (error) {
      if (error && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  if (writeClipboard) {
    try {
      await writeClipboard(url);
      return "copied";
    } catch {
      // Continue to the visible manual-link fallback.
    }
  }
  return "manual";
}
~~~

Add initSite defaults using typeof guards:

~~~js
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
~~~

Query and require the three share elements. Add:

~~~js
async function launchShare() {
  shareStatus.hidden = true;
  shareStatus.textContent = "";
  shareFallback.hidden = true;
  const outcome = await shareUniverse({ nativeShare, writeClipboard });
  if (outcome === "copied") {
    shareStatus.textContent = "Link copied ✨";
    shareStatus.hidden = false;
  } else if (outcome === "manual") {
    shareFallback.hidden = false;
  }
}
~~~

Register launchShare on the share button and remove it in destroy().

- [ ] **Step 5: Run focused and full tests**

~~~bash
node --test tests/controller.test.mjs
node --test tests/*.test.mjs
~~~

Expected: all tests PASS, including native share, cancellation, clipboard, and manual fallback.

- [ ] **Step 6: Commit the sharing behavior**

~~~bash
git add index.html script.js tests/controller.test.mjs
git commit -m "feat: add privacy-safe sharing fallbacks"
~~~

---

### Task 5: Create and build the two approved public assets

**Files:**

- Create: assets/favicon.svg
- Create: assets/social-preview.png
- Modify: scripts/build-site.mjs
- Modify: tests/build.test.mjs

**Interfaces:**

- Produces public files at /assets/favicon.svg and /assets/social-preview.png.
- Preserves the exact production-artifact allowlist.

- [ ] **Step 1: Write failing build and dimension tests**

Update the expected list in tests/build.test.mjs to:

~~~js
assert.deepEqual(files, [
  ".nojekyll",
  "assets/favicon.svg",
  "assets/social-preview.png",
  "index.html",
  "script.js",
  "src/content.mjs",
  "src/time.mjs",
  "styles.css",
]);
~~~

Add:

~~~js
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

test("favicon is self-contained and privacy-safe", async () => {
  const favicon = await readFile("assets/favicon.svg", "utf8");
  assert.match(favicon, /<svg/);
  assert.doesNotMatch(favicon, /<image|https?:|data:/i);
});
~~~

Restrict forbidden-token scanning of _site files to text extensions so the PNG is not decoded as text.

- [ ] **Step 2: Run the build test and verify assets are absent**

~~~bash
node --test tests/build.test.mjs
~~~

Expected: FAIL with missing assets and the old artifact list.

- [ ] **Step 3: Create the exact favicon**

Use apply_patch to create assets/favicon.svg:

~~~svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#080d27"/>
  <ellipse cx="32" cy="32" rx="24" ry="10" fill="none"
    stroke="#bc9cff" stroke-opacity=".7" stroke-width="2"
    transform="rotate(-12 32 32)"/>
  <path d="m20 14 3.7 7.5 8.3 1.2-6 5.8 1.4 8.2-7.4-3.9-7.4 3.9
    1.4-8.2-6-5.8 8.3-1.2Z" fill="#ffd56a"/>
  <path d="m46 28 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3.1-5.8 3.1
    1.1-6.4-4.7-4.6 6.5-.9Z" fill="#bc9cff"/>
  <path d="M32 45c-5-3.6-8-6.2-8-10a4.5 4.5 0 0 1 8-2.8
    4.5 4.5 0 0 1 8 2.8c0 3.8-3 6.4-8 10Z" fill="#ff8fb8"/>
</svg>
~~~

- [ ] **Step 4: Generate the deterministic social preview**

Use apply_patch to create /tmp/our-tiny-universe-social-preview.svg with:

~~~svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"
  viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%">
      <stop offset="0" stop-color="#1b2867"/>
      <stop offset=".58" stop-color="#080d27"/>
      <stop offset="1" stop-color="#050817"/>
    </radialGradient>
    <filter id="goldGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="18" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="14" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g fill="#fff8e7" opacity=".68">
    <circle cx="90" cy="95" r="2"/><circle cx="170" cy="190" r="1.5"/>
    <circle cx="265" cy="78" r="2"/><circle cx="360" cy="145" r="1.5"/>
    <circle cx="505" cy="70" r="2"/><circle cx="690" cy="95" r="1.5"/>
    <circle cx="820" cy="65" r="2"/><circle cx="970" cy="160" r="1.5"/>
    <circle cx="1100" cy="85" r="2"/><circle cx="1050" cy="315" r="1.5"/>
    <circle cx="130" cy="410" r="1.5"/><circle cx="285" cy="515" r="2"/>
    <circle cx="920" cy="505" r="2"/><circle cx="1110" cy="450" r="1.5"/>
  </g>
  <ellipse cx="600" cy="270" rx="340" ry="132" fill="none"
    stroke="#bc9cff" stroke-opacity=".42" stroke-width="4"
    transform="rotate(-9 600 270)"/>
  <circle cx="600" cy="270" r="45" fill="#ff8fb8" fill-opacity=".16"
    filter="url(#softGlow)"/>
  <path d="M600 292c-35-23-54-43-54-70a31 31 0 0 1 54-20
    31 31 0 0 1 54 20c0 27-19 47-54 70Z"
    fill="#ff8fb8" filter="url(#softGlow)"/>
  <path d="m345 128 35 72 79 11-57 55 14 78-71-37-71 37
    14-78-57-55 79-11Z" fill="#ffd56a" stroke="#ff9d52"
    stroke-width="8" filter="url(#goldGlow)"/>
  <circle cx="326" cy="239" r="8" fill="#241a45"/>
  <circle cx="366" cy="239" r="8" fill="#241a45"/>
  <path d="M320 266q25 22 50 0" fill="none" stroke="#241a45"
    stroke-width="8" stroke-linecap="round"/>
  <path d="m855 128 35 72 79 11-57 55 14 78-71-37-71 37
    14-78-57-55 79-11Z" fill="#bc9cff" stroke="#7f6ae8"
    stroke-width="8" filter="url(#softGlow)"/>
  <circle cx="836" cy="239" r="8" fill="#241a45"/>
  <circle cx="876" cy="239" r="8" fill="#241a45"/>
  <path d="M830 266q25 22 50 0" fill="none" stroke="#241a45"
    stroke-width="8" stroke-linecap="round"/>
  <text x="600" y="500" text-anchor="middle" fill="#fff8e7"
    font-family="DejaVu Sans, sans-serif" font-size="70" font-weight="700">
    Our Tiny Universe
  </text>
  <text x="600" y="560" text-anchor="middle" fill="#bec6ef"
    font-family="DejaVu Sans, sans-serif" font-size="30" font-weight="600">
    Same chaos, more teamwork.
  </text>
</svg>
~~~

Then run:

~~~bash
mkdir -p assets
convert -background none /tmp/our-tiny-universe-social-preview.svg \
  -strip -define png:compression-level=9 \
  PNG32:assets/social-preview.png
identify -format "%wx%h %b\n" assets/social-preview.png
~~~

Expected: 1200x630 and no more than 1 MiB. If ImageMagick writes a larger PNG, run:

~~~bash
convert assets/social-preview.png -strip -quality 90 assets/social-preview.png
~~~

and re-run identify plus wc -c.

- [ ] **Step 5: Copy exact assets into the build**

In scripts/build-site.mjs:

~~~js
await mkdir("_site/assets", { recursive: true });
await cp("assets/favicon.svg", "_site/assets/favicon.svg");
await cp(
  "assets/social-preview.png",
  "_site/assets/social-preview.png",
);
~~~

Keep the existing exact source copy operations.

- [ ] **Step 6: Run build, focused test, and full tests**

~~~bash
node scripts/build-site.mjs
node --test tests/build.test.mjs
node --test tests/*.test.mjs
~~~

Expected: artifact list, dimensions, favicon, and all existing tests PASS.

- [ ] **Step 7: Commit the public assets and build support**

~~~bash
git add assets/favicon.svg assets/social-preview.png \
  scripts/build-site.mjs tests/build.test.mjs
git commit -m "feat: add privacy-safe social preview assets"
~~~

---

### Task 6: Add social metadata and presentation styling

**Files:**

- Modify: index.html
- Modify: styles.css
- Modify: tests/build.test.mjs
- Modify: tests/controller.test.mjs
- Modify: scripts/validate.mjs

**Interfaces:**

- Consumes: data-anniversary on the main element.
- Consumes: message--reveal class from the controller.
- Consumes: share, data-share-status, and data-share-fallback markup.

- [ ] **Step 1: Add failing static metadata and styling assertions**

In tests/build.test.mjs, read index.html and styles.css and add:

~~~js
test("declares canonical privacy-safe social metadata", async () => {
  const html = await readFile("index.html", "utf8");
  assert.match(
    html,
    /rel="canonical"\s+href="https:\/\/whizher\.github\.io\/our-tiny-universe\/"/,
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

test("keeps new effects inside reduced-motion handling", async () => {
  const css = await readFile("styles.css", "utf8");
  assert.match(css, /\.message--reveal/);
  assert.match(css, /\[data-anniversary="true"\]/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
~~~

In tests/controller.test.mjs, add:

~~~js
test("replays the message reveal hook on star interaction", () => {
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    random: () => 0,
    schedule: () => 1,
    cancelSchedule: () => {},
  });
  elements.stars[0].click();
  assert.ok(elements.message.classes.has("message--reveal"));
});
~~~

- [ ] **Step 2: Run focused tests and verify metadata/styles are absent**

~~~bash
node --test tests/build.test.mjs tests/controller.test.mjs
~~~

Expected: FAIL on missing canonical/Open Graph/favicon markup and missing CSS selectors.

- [ ] **Step 3: Add exact metadata to index.html**

Inside head, add:

~~~html
<meta
  name="description"
  content="A tiny playful universe. Same chaos, more teamwork."
>
<link
  rel="canonical"
  href="https://whizher.github.io/our-tiny-universe/"
>
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:title" content="Our Tiny Universe 🌌">
<meta property="og:description" content="Same chaos, more teamwork.">
<meta
  property="og:url"
  content="https://whizher.github.io/our-tiny-universe/"
>
<meta
  property="og:image"
  content="https://whizher.github.io/our-tiny-universe/assets/social-preview.png"
>
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Our Tiny Universe 🌌">
<meta name="twitter:description" content="Same chaos, more teamwork.">
<meta
  name="twitter:image"
  content="https://whizher.github.io/our-tiny-universe/assets/social-preview.png"
>
~~~

Replace the old description rather than leaving duplicate description tags.

- [ ] **Step 4: Add exact styles**

Extend the shared panel selector to include .share. Add:

~~~css
.anniversary-status {
  min-height: 1.5em;
  margin: 0.35rem 0 0;
  color: var(--gold);
  font-size: 0.9rem;
  font-weight: 700;
}

.message--reveal {
  animation: message-reveal 180ms ease-out;
}

[data-anniversary="true"] .center-glow {
  color: var(--gold);
  background: rgba(255, 213, 106, 0.18);
  box-shadow:
    0 0 2.8rem rgba(255, 213, 106, 0.76),
    0 0 4.5rem rgba(255, 143, 184, 0.32);
}

.share {
  max-width: 30rem;
  margin: 1rem auto 0;
}

.share button {
  min-width: 44px;
  min-height: 44px;
  padding: 0.8rem 1.1rem;
  color: var(--ink);
  font-weight: 800;
  background: rgba(188, 156, 255, 0.14);
  border: 1px solid rgba(188, 156, 255, 0.48);
  border-radius: 999px;
  cursor: pointer;
}

.share button:hover {
  background: rgba(188, 156, 255, 0.24);
}

.share p,
.share a {
  display: block;
  margin: 0.85rem 0 0;
  color: var(--gold);
}

.share [hidden] {
  display: none;
}

@keyframes message-reveal {
  from {
    opacity: 0.35;
    scale: 0.985;
  }

  to {
    opacity: 1;
    scale: 1;
  }
}
~~~

The existing reduced-motion block already reduces all animation durations to
0.01 ms, so no additional animated reduced-motion rule is added.

- [ ] **Step 5: Permit only the exact canonical href in validation**

In scripts/validate.mjs define:

~~~js
const CANONICAL_URL =
  "https://whizher.github.io/our-tiny-universe/";
const ALLOWED_METADATA_REFERENCES = new Set([CANONICAL_URL]);
~~~

Replace the current external-reference branch with:

~~~js
if (/^https?:/.test(reference)) {
  if (!ALLOWED_METADATA_REFERENCES.has(reference)) {
    errors.push("External runtime reference: " + reference);
  }
  continue;
}
if (/^(?:#|data:)/.test(reference)) {
  errors.push("Non-file runtime reference: " + reference);
  continue;
}
~~~

This permits the exact canonical link but does not permit any external script,
stylesheet, font, or runtime media URL.

- [ ] **Step 6: Run focused tests, validation, build, and full tests**

~~~bash
node --test tests/build.test.mjs tests/controller.test.mjs
node scripts/validate.mjs
node scripts/build-site.mjs
node --test tests/*.test.mjs
~~~

Expected: metadata/style assertions and all tests PASS; validation and build
both exit 0.

- [ ] **Step 7: Commit presentation changes**

~~~bash
git add index.html styles.css scripts/validate.mjs \
  tests/build.test.mjs tests/controller.test.mjs
git commit -m "feat: polish anniversary and social presentation"
~~~

---

### Task 7: Enforce the repository-wide privacy policy

**Files:**

- Modify: scripts/validate.mjs
- Modify: tests/build.test.mjs

**Interfaces:**

- Produces: validateTrackedEntries(entries) -> string[]
- Entry shape: { path: string, size: number }
- Preserves command: node scripts/validate.mjs

- [ ] **Step 1: Add failing pure-policy tests**

Import validateTrackedEntries from scripts/validate.mjs and add:

~~~js
test("repository policy permits only approved tracked paths", () => {
  assert.deepEqual(
    validateTrackedEntries([
      { path: "index.html", size: 4_000 },
      { path: "assets/favicon.svg", size: 2_000 },
      { path: "assets/social-preview.png", size: 500_000 },
      {
        path: "docs/superpowers/plans/2026-08-08-our-tiny-universe-v1-1.md",
        size: 40_000,
      },
    ]),
    [],
  );
});

test("repository policy rejects exports, media, unknown paths, and size excess", () => {
  const errors = validateTrackedEntries([
    { path: "private-export.txt", size: 100 },
    { path: "photos/memory.jpg", size: 100 },
    { path: "notes.md", size: 100 },
    { path: "script.js", size: 262_145 },
    { path: "assets/social-preview.png", size: 1_048_577 },
  ]);
  assert.equal(errors.length, 5);
  assert.match(errors.join("\n"), /private-export\.txt/);
  assert.match(errors.join("\n"), /memory\.jpg/);
  assert.match(errors.join("\n"), /notes\.md/);
  assert.match(errors.join("\n"), /script\.js/);
  assert.match(errors.join("\n"), /social-preview\.png/);
});
~~~

- [ ] **Step 2: Run the focused test and verify the policy export is missing**

~~~bash
node --test tests/build.test.mjs
~~~

Expected: FAIL because validateTrackedEntries is not exported.

- [ ] **Step 3: Refactor validation into importable pure functions**

In scripts/validate.mjs add imports:

~~~js
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const MAX_TEXT_BYTES = 256 * 1024;
const MAX_PREVIEW_BYTES = 1024 * 1024;
~~~

Define exact paths and the dated-doc pattern:

~~~js
const APPROVED_EXACT_PATHS = new Set([
  ".github/workflows/pages.yml",
  ".gitignore",
  "README.md",
  "package.json",
  "index.html",
  "styles.css",
  "script.js",
  "scripts/build-site.mjs",
  "scripts/validate.mjs",
  "src/content.mjs",
  "src/time.mjs",
  "tests/build.test.mjs",
  "tests/content.test.mjs",
  "tests/controller.test.mjs",
  "tests/time.test.mjs",
  "assets/social-preview.png",
  "assets/favicon.svg",
]);

const APPROVED_DOC =
  /^docs\/superpowers\/(?:specs|plans)\/\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/;

const DENIED_EXTENSION =
  /\.(?:txt|log|csv|tsv|zip|7z|rar|tar|gz|pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|webp|gif|heic|mp3|m4a|wav|ogg|mp4|mov|mkv|webm)$/i;
~~~

Implement:

~~~js
export function validateTrackedEntries(entries) {
  const errors = [];
  for (const entry of entries) {
    const approvedPath =
      APPROVED_EXACT_PATHS.has(entry.path) || APPROVED_DOC.test(entry.path);
    if (!approvedPath) {
      errors.push("Unapproved tracked path: " + entry.path);
      continue;
    }
    if (DENIED_EXTENSION.test(entry.path)) {
      errors.push("Forbidden tracked file type: " + entry.path);
      continue;
    }
    const limit =
      entry.path === "assets/social-preview.png"
        ? MAX_PREVIEW_BYTES
        : MAX_TEXT_BYTES;
    if (entry.size > limit) {
      errors.push("Tracked file exceeds size limit: " + entry.path);
    }
  }
  return errors;
}

async function trackedEntries() {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "-z"],
    { cwd: root, encoding: "utf8" },
  );
  const paths = stdout.split("\0").filter(Boolean);
  return Promise.all(
    paths.map(async (path) => ({
      path,
      size: (await stat(resolve(root, path))).size,
    })),
  );
}
~~~

Wrap current top-level validation in async function main(), append errors from validateTrackedEntries(await trackedEntries()), and invoke only when executed directly:

~~~js
const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  await main();
}
~~~

Importing the module in tests must not run the command-line validator.

- [ ] **Step 4: Preserve the exact metadata URL boundary**

Retain CANONICAL_URL and ALLOWED_METADATA_REFERENCES from Task 6 while moving
the command-line logic into main(). Add this test:

~~~js
test("runtime markup contains no external executable or embedded dependency", async () => {
  const html = await readFile("index.html", "utf8");
  const css = await readFile("styles.css", "utf8");
  assert.doesNotMatch(html, /<script[^>]+src="https?:/i);
  assert.doesNotMatch(
    html,
    /<link[^>]+rel="stylesheet"[^>]+href="https?:/i,
  );
  assert.doesNotMatch(html, /<iframe\b/i);
  assert.doesNotMatch(css, /@import\s+url\(["']?https?:/i);
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
~~~

- [ ] **Step 5: Run policy tests and command-line validation**

~~~bash
node --test tests/build.test.mjs
node scripts/validate.mjs
~~~

Expected: policy tests PASS and validation reports the expanded runtime/tracked-file checks with exit code 0.

- [ ] **Step 6: Run the full privacy-bounded verification**

~~~bash
node --test tests/*.test.mjs
node scripts/validate.mjs
node scripts/build-site.mjs
find _site -type f -printf "%P\n" | sort
~~~

Expected: all tests PASS; validation succeeds; the output list contains exactly .nojekyll, the two assets, index.html, script.js, two src modules, and styles.css.

- [ ] **Step 7: Commit privacy enforcement**

~~~bash
git add scripts/validate.mjs tests/build.test.mjs
git commit -m "test: enforce repository-wide privacy boundaries"
~~~

---

### Task 8: Document and verify the complete v1.1 release candidate

**Files:**

- Modify: README.md
- Verify: every source, test, asset, build, and documentation file above.

**Interfaces:**

- Produces a locally committed, fully verified release candidate.
- Does not push or deploy.

- [ ] **Step 1: Update README with the public feature summary**

Add a concise Features section:

~~~markdown
## Features

- Separate fictional transmissions for Naufal and Rity
- Pontianak-based relationship and anniversary counters
- Reduced-motion-aware orbit and shooting-star effects
- Native sharing with clipboard/manual fallbacks
- Privacy-bounded, dependency-free GitHub Pages build
~~~

Keep the existing Privacy section and validation commands unchanged except for any exact command output wording that genuinely changed.

- [ ] **Step 2: Run formatting and placeholder checks**

~~~bash
git diff --check
! rg -n "TB[D]|TO[D]O|FIXM[E]|XX[X]" \
  README.md index.html styles.css script.js src scripts tests \
  docs/superpowers/specs docs/superpowers/plans
~~~

Expected: both commands exit 0.

- [ ] **Step 3: Run the full automated verification from a clean build artifact**

~~~bash
node --test tests/*.test.mjs
node scripts/validate.mjs
node scripts/build-site.mjs
~~~

Expected: zero test failures, validation exit 0, build exit 0.

- [ ] **Step 4: Verify built privacy and resource integrity**

~~~bash
find _site -type f -printf "%P %s bytes\n" | sort
test ! -e "_site/docs"
test ! -e "_site/tests"
test ! -e "_site/README.md"
test "$(find _site -type f | wc -l)" -eq 8
~~~

Expected: exactly eight files including .nojekyll and the two approved assets; no documentation or tests are deployed.

- [ ] **Step 5: Smoke-test the local HTTP output**

~~~bash
python3 -m http.server 4173 >/tmp/otu-v1-1-server.log 2>&1 &
otu_server_pid=$!
trap 'kill "$otu_server_pid" 2>/dev/null || true' EXIT
curl -fsS http://127.0.0.1:4173/ >/tmp/otu-v1-1-index.html
curl -fsSI http://127.0.0.1:4173/assets/favicon.svg
curl -fsSI http://127.0.0.1:4173/assets/social-preview.png
rg -n "Long before the orbit|Same chaos, more teamwork|Share Our Universe" \
  /tmp/otu-v1-1-index.html
kill "$otu_server_pid"
trap - EXIT
~~~

Expected: all requests return HTTP 200 and all three public phrases are present.

- [ ] **Step 6: Confirm no private or unapproved file is tracked**

~~~bash
git ls-files
if git ls-files | rg -i "\.(txt|log|csv|tsv|zip|7z|rar|pdf|docx?|xlsx?|pptx?|jpe?g|webp|gif|heic|mp3|m4a|wav|ogg|mp4|mov|mkv|webm)$"; then
  exit 1
fi
git status --short
~~~

Expected: only approved paths are tracked; no denied extension appears; status shows only the intended README change before the final documentation commit.

- [ ] **Step 7: Commit release documentation**

~~~bash
git add README.md
git commit -m "docs: document Our Tiny Universe v1.1"
~~~

- [ ] **Step 8: Re-run final evidence after the commit**

~~~bash
node --test tests/*.test.mjs
node scripts/validate.mjs
node scripts/build-site.mjs
git status --short --branch
git log --oneline -8
~~~

Expected: all verification commands exit 0; the branch is clean and ahead of its remote only by the approved local design, plan, and implementation commits.

## Execution Boundary

Stop after Task 8. Do not push, create a pull request, merge, or deploy. Present the local verification evidence and ask Naufal whether to publish the release candidate.
