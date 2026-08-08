import test from "node:test";
import assert from "node:assert/strict";
import { initSite } from "../script.js";

class FakeElement {
  constructor() {
    this.children = [];
    this.hidden = false;
    this.listeners = new Map();
    this.style = { setProperty() {} };
    this.textContent = "";
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

  click() {
    for (const listener of this.listeners.get("click") || []) {
      listener({ currentTarget: this });
    }
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
    message: new FakeElement(),
    antiButton: new FakeElement(),
    antiResult: new FakeElement(),
    layer: new FakeElement(),
    stars: [new FakeElement(), new FakeElement()],
  };
  const selectors = new Map([
    ["[data-days]", elements.counter],
    ["[data-message]", elements.message],
    ["[data-anti-cringe]", elements.antiButton],
    ["[data-anti-result]", elements.antiResult],
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

test("reveals a message without immediate repetition", () => {
  const { documentRef, elements } = createFixture();
  initSite({
    documentRef,
    random: () => 0,
    schedule: () => 1,
    cancelSchedule: () => {},
  });
  elements.stars[0].click();
  assert.equal(
    elements.message.textContent,
    "Achievement unlocked: masih betah.",
  );
  elements.stars[1].click();
  assert.equal(
    elements.message.textContent,
    "Compatibility: surprisingly functional.",
  );
});

test("creates and automatically removes the anti-cringe effect", () => {
  const { documentRef, elements } = createFixture();
  const timers = [];
  const schedule = (callback, delay) => {
    timers.push({ callback, delay });
    return timers.length;
  };
  initSite({ documentRef, schedule, cancelSchedule: () => {} });
  elements.antiButton.click();
  assert.equal(elements.antiResult.hidden, false);
  assert.equal(elements.antiResult.textContent, "Okay, cukup romantisnya.");
  assert.equal(elements.layer.children.length, 12);
  const cleanup = timers.find((timer) => timer.delay === 2_000);
  assert.ok(cleanup);
  cleanup.callback();
  assert.equal(elements.layer.children.length, 0);
});
