import test from "node:test";
import assert from "node:assert/strict";
import { initSite } from "../script.js";

class FakeElement {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.hidden = false;
    this.listeners = new Map();
    this.style = { setProperty() {} };
    this.textContent = "";
    this.offsetWidth = 1;
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

  async click() {
    await Promise.all(
      (this.listeners.get("click") || []).map((listener) =>
        listener({ currentTarget: this }),
      ),
    );
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }
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
  ]);
  const documentRef = {
    querySelector: (selector) => selectors.get(selector) || null,
    querySelectorAll: (selector) =>
      selector === "[data-message-source]" ? elements.stars : [],
    createElement: () => new FakeElement(),
  };
  return { documentRef, elements };
}

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

test("creates and automatically removes the anti-cringe effect", () => {
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
  elements.antiButton.click();
  assert.equal(elements.antiResult.hidden, false);
  assert.equal(elements.antiResult.textContent, "Okay, cukup romantisnya.");
  elements.antiButton.click();
  assert.equal(
    elements.antiResult.textContent,
    "Romance levels exceeded safe limits.",
  );
  assert.equal(elements.layer.children.length, 12);
  const cleanup = timers.find((timer) => timer.delay === 2_000);
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
    nativeShare: async () => {
      throw new Error("share failed");
    },
    writeClipboard: async (value) => copied.push(value),
    schedule: () => 1,
    cancelSchedule: () => {},
  });
  await elements.shareButton.click();
  assert.deepEqual(copied, [
    "https://whizher.github.io/our-tiny-universe/",
  ]);
  assert.equal(elements.shareStatus.textContent, "Link copied ✨");
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
