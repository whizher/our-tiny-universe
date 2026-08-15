import test from "node:test";
import assert from "node:assert/strict";
import { initSite as initProductionSite } from "../script.js";
import { MESSAGE_POOLS } from "../src/content.mjs";

class FakeElement {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.hidden = false;
    this.listeners = new Map();
    this.styleProperties = new Map();
    this.style = {
      setProperty: (name, value) => this.styleProperties.set(name, String(value)),
      getPropertyValue: (name) => this.styleProperties.get(name) ?? "",
    };
    this.textContent = "";
    this.offsetWidth = 1;
    this.currentTime = 0;
    this.duration = 20;
    this.paused = true;
    this.volume = 1;
    this.playWaits = [];
    this.classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => this.classes.add(name)),
      remove: (...names) => names.forEach((name) => this.classes.delete(name)),
    };
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(
      type,
      listeners.filter((item) => item !== listener),
    );
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  async click() {
    await Promise.all(
      (this.listeners.get("click") || []).map((listener) =>
        listener({ currentTarget: this }),
      ),
    );
  }

  emit(type) {
    for (const listener of this.listeners.get(type) || []) listener();
  }

  async play() {
    const wait = this.playWaits.shift();
    if (wait) await wait;
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }
}

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
    getState: () => state,
    wasDestroyed: () => destroyed,
  };
}

function initSite(options) {
  return initProductionSite({
    createSoundtrack: createSoundtrackFake().factory,
    ...options,
  });
}

function createFixture() {
  const elements = {
    counter: new FakeElement(),
    universe: new FakeElement(),
    anniversaryStatus: new FakeElement(),
    messageTitle: new FakeElement(),
    message: new FakeElement(),
    antiButton: new FakeElement(),
    antiResult: new FakeElement(),
    shareButton: new FakeElement(),
    shareStatus: new FakeElement(),
    shareFallback: new FakeElement(),
    layer: new FakeElement(),
    musicButton: new FakeElement(),
    musicStatus: new FakeElement(),
    audioChannels: [new FakeElement(), new FakeElement()],
    stars: [new FakeElement(), new FakeElement()],
  };
  elements.stars[0].dataset.messageSource = "naufal";
  elements.stars[1].dataset.messageSource = "rity";
  elements.shareStatus.hidden = true;
  elements.shareFallback.hidden = true;
  const selectors = new Map([
    ["[data-days]", elements.counter],
    ["[data-universe]", elements.universe],
    ["[data-anniversary-status]", elements.anniversaryStatus],
    ["[data-message-title]", elements.messageTitle],
    ["[data-message]", elements.message],
    ["[data-anti-cringe]", elements.antiButton],
    ["[data-anti-result]", elements.antiResult],
    ["[data-share]", elements.shareButton],
    ["[data-share-status]", elements.shareStatus],
    ["[data-share-fallback]", elements.shareFallback],
    ["[data-shooting-stars]", elements.layer],
    ["[data-music-toggle]", elements.musicButton],
    ["[data-music-status]", elements.musicStatus],
  ]);
  const documentRef = {
    querySelector: (selector) => selectors.get(selector) || null,
    querySelectorAll: (selector) =>
      selector === "[data-message-source]"
        ? elements.stars
        : selector === "[data-soundtrack-channel]"
          ? elements.audioChannels
          : [],
    createElement: () => new FakeElement(),
  };
  return { documentRef, elements };
}

function assertMusicView(elements, {
  accessibleLabel,
  icon,
  pressed,
  status,
}) {
  assert.equal(elements.musicButton.textContent, icon);
  assert.equal(
    elements.musicButton.getAttribute("aria-label"),
    accessibleLabel,
  );
  assert.equal(
    elements.musicButton.getAttribute("aria-pressed"),
    pressed,
  );
  assert.equal(elements.musicStatus.textContent, status);
}

test("renders the initial soundtrack control state", () => {
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  assertMusicView(elements, {
    accessibleLabel: "Play soundtrack",
    icon: "🎵",
    pressed: "false",
    status: "Tap 🎵 to start Has to Be.",
  });
});

test("shows Pause while initial soundtrack playback is pending", async () => {
  const { documentRef, elements } = createFixture();
  let releaseStart;
  elements.audioChannels[0].playWaits.push(
    new Promise((resolve) => { releaseStart = resolve; }),
  );
  initProductionSite({
    documentRef,
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  const startClick = elements.musicButton.click();
  assertMusicView(elements, {
    accessibleLabel: "Pause soundtrack",
    icon: "⏸",
    pressed: "true",
    status: "Tap 🎵 to start Has to Be.",
  });

  releaseStart();
  await startClick;
  assertMusicView(elements, {
    accessibleLabel: "Pause soundtrack",
    icon: "⏸",
    pressed: "true",
    status: "Has to Be — Capzlock",
  });
});

test("plays, pauses, and resumes the soundtrack through the visible control", async () => {
  const soundtrack = createSoundtrackFake();
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    createSoundtrack: soundtrack.factory,
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  await elements.musicButton.click();
  assertMusicView(elements, {
    accessibleLabel: "Pause soundtrack",
    icon: "⏸",
    pressed: "true",
    status: "Has to Be — Capzlock",
  });

  await elements.musicButton.click();
  assertMusicView(elements, {
    accessibleLabel: "Resume soundtrack",
    icon: "▶",
    pressed: "false",
    status: "Has to Be — Capzlock · Paused",
  });

  await elements.musicButton.click();
  assertMusicView(elements, {
    accessibleLabel: "Pause soundtrack",
    icon: "⏸",
    pressed: "true",
    status: "Has to Be — Capzlock",
  });
});

test("keeps Pause available while soundtrack resume is pending", async () => {
  const { documentRef, elements } = createFixture();
  initProductionSite({
    documentRef,
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  await elements.musicButton.click();
  await elements.musicButton.click();
  let rejectResume;
  elements.audioChannels[0].playWaits.push(new Promise((_, reject) => {
    rejectResume = reject;
  }));

  const resumeClick = elements.musicButton.click();
  assertMusicView(elements, {
    accessibleLabel: "Pause soundtrack",
    icon: "⏸",
    pressed: "true",
    status: "Has to Be — Capzlock",
  });

  await elements.musicButton.click();
  const abortError = new Error("resume interrupted by Pause");
  abortError.name = "AbortError";
  rejectResume(abortError);
  await resumeClick;

  assertMusicView(elements, {
    accessibleLabel: "Resume soundtrack",
    icon: "▶",
    pressed: "false",
    status: "Has to Be — Capzlock · Paused",
  });
  assert.ok(elements.audioChannels.every((channel) => channel.paused));
});

test("reflects an external active-channel pause through the visible control", async () => {
  const { documentRef, elements } = createFixture();
  initProductionSite({
    documentRef,
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  await elements.musicButton.click();
  elements.audioChannels[0].paused = true;
  elements.audioChannels[0].emit("pause");

  assertMusicView(elements, {
    accessibleLabel: "Resume soundtrack",
    icon: "▶",
    pressed: "false",
    status: "Has to Be — Capzlock · Paused",
  });
  assert.ok(elements.audioChannels.every((channel) => channel.paused));
});

test("reflects a fatal media error through the visible control", async () => {
  const { documentRef, elements } = createFixture();
  initProductionSite({
    documentRef,
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  await elements.musicButton.click();
  elements.audioChannels[0].emit("error");

  assertMusicView(elements, {
    accessibleLabel: "Retry soundtrack",
    icon: "↻",
    pressed: "false",
    status: "Has to Be couldn’t start. Tap to try again.",
  });
  assert.ok(elements.audioChannels.every((channel) => channel.paused));
  assert.ok(
    elements.audioChannels.every((channel) => channel.currentTime === 0),
  );
});

test("offers retry copy after an error and retries playback", async () => {
  const soundtrack = createSoundtrackFake();
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    createSoundtrack: soundtrack.factory,
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  soundtrack.fail();
  assertMusicView(elements, {
    accessibleLabel: "Retry soundtrack",
    icon: "↻",
    pressed: "false",
    status: "Has to Be couldn’t start. Tap to try again.",
  });

  await elements.musicButton.click();
  assertMusicView(elements, {
    accessibleLabel: "Pause soundtrack",
    icon: "⏸",
    pressed: "true",
    status: "Has to Be — Capzlock",
  });
});

test("destroy tears down the soundtrack and removes its control listener", async () => {
  const soundtrack = createSoundtrackFake();
  const { documentRef, elements } = createFixture();
  const site = initSite({
    documentRef,
    createSoundtrack: soundtrack.factory,
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  site.destroy();
  assert.equal(soundtrack.wasDestroyed(), true);
  assert.equal(soundtrack.getState(), "destroyed");
  await elements.musicButton.click();
  assert.equal(soundtrack.getState(), "destroyed");
});

test("renders the Pontianak day counter", () => {
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    now: () => new Date("2024-07-07T17:00:00.000Z"),
    schedule: () => 1,
    cancelSchedule: () => {},
  });
  assert.equal(elements.counter.textContent, "Sudah 1 hari di orbit yang sama.");
});

test("routes each star to its own attributed message pool", () => {
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    random: () => 1,
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

test("advances each source transmission deck independently", async () => {
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    random: () => 1,
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  await elements.stars[0].click();
  assert.equal(elements.message.textContent, MESSAGE_POOLS.naufal[0]);

  await elements.stars[0].click();
  assert.equal(elements.message.textContent, MESSAGE_POOLS.naufal[1]);

  await elements.stars[1].click();
  assert.equal(elements.message.textContent, MESSAGE_POOLS.rity[0]);
});

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

test("creates and automatically removes the anti-cringe effect", async () => {
  const { documentRef, elements } = createFixture();
  const timers = [];
  const schedule = (callback, delay) => {
    timers.push({ callback, delay });
    return timers.length;
  };
  initSite({
    documentRef,
    random: () => 0,
    schedule,
    cancelSchedule: () => {},
  });
  await elements.antiButton.click();
  assert.equal(elements.antiResult.hidden, false);
  assert.equal(elements.antiResult.textContent, "Okay, cukup romantisnya.");
  await elements.antiButton.click();
  assert.equal(
    elements.antiResult.textContent,
    "Romance levels exceeded safe limits.",
  );
  assert.equal(elements.layer.children.length, 12);
  const cleanup = timers.find(
    (timer) => timer.delay > 1_000 && timer.delay < 3_000,
  );
  assert.ok(cleanup);
  cleanup.callback();
  assert.equal(elements.layer.children.length, 0);
});

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

  assert.equal(elements.layer.children.length, 12);
  const particle = elements.layer.children[0];
  assert.match(particle.className, /shooting-star/);
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
  assert.equal(elements.layer.children.length, 0);
});

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
  assert.equal(elements.layer.children.length, 5);
});

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

  assert.equal(elements.layer.children.length, 0);
  assert.equal(
    scheduled.some(({ delay }) => delay >= 18_000 && delay <= 90_000),
    false,
  );
});

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
  assert.deepEqual(calls, [
    {
      title: "Our Tiny Universe 🌌",
      text: "Same chaos, more teamwork.",
      url: "https://whizher.github.io/our-tiny-universe/",
    },
  ]);
  assert.equal(elements.shareFallback.hidden, true);
});

test("shares the currently displayed transmission through native sharing", async () => {
  const calls = [];
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    random: () => 1,
    nativeShare: async (payload) => calls.push(payload),
    writeClipboard: async () => assert.fail("clipboard should not run"),
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  await elements.stars[0].click();
  await elements.shareButton.click();

  assert.equal(elements.shareButton.textContent, "Share This Transmission");
  assert.deepEqual(calls, [
    {
      title: "Transmission from Naufal ✨",
      text:
        "“" +
        MESSAGE_POOLS.naufal[0] +
        "” — Naufal\n\nOur Tiny Universe",
      url: "https://whizher.github.io/our-tiny-universe/",
    },
  ]);
});

test("copies the currently displayed transmission with the homepage link", async () => {
  const copied = [];
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    random: () => 1,
    nativeShare: null,
    writeClipboard: async (value) => copied.push(value),
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  await elements.stars[1].click();
  await elements.shareButton.click();

  assert.deepEqual(copied, [
    "“" +
      MESSAGE_POOLS.rity[0] +
      "” — Rity\n\nOur Tiny Universe\n" +
      "https://whizher.github.io/our-tiny-universe/",
  ]);
  assert.equal(
    elements.shareStatus.textContent,
    "Transmission copied ✨",
  );
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

test("falls back to clipboard after a non-cancelled native share failure", async () => {
  const copied = [];
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    random: () => 1,
    nativeShare: async () => {
      throw new Error("share failed");
    },
    writeClipboard: async (value) => copied.push(value),
    schedule: () => 1,
    cancelSchedule: () => {},
  });
  await elements.stars[0].click();
  await elements.shareButton.click();
  assert.deepEqual(copied, [
    "“" +
      MESSAGE_POOLS.naufal[0] +
      "” — Naufal\n\nOur Tiny Universe\n" +
      "https://whizher.github.io/our-tiny-universe/",
  ]);
  assert.equal(elements.shareStatus.textContent, "Transmission copied ✨");
  assert.equal(elements.shareStatus.hidden, false);
  assert.equal(elements.shareFallback.hidden, true);
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
    random: () => 1,
    nativeShare: async () => {
      throw new Error("share failed");
    },
    writeClipboard: async () => {
      throw new Error("clipboard failed");
    },
    schedule: () => 1,
    cancelSchedule: () => {},
  });
  await failed.elements.stars[1].click();
  await failed.elements.shareButton.click();
  assert.equal(
    failed.elements.message.textContent,
    MESSAGE_POOLS.rity[0],
  );
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
