import test from "node:test";
import assert from "node:assert/strict";
import {
  MESSAGES,
  createShootingStarSpecs,
  pickNextMessage,
} from "../src/content.mjs";

test("contains the six approved messages verbatim", () => {
  assert.deepEqual(MESSAGES, [
    "Achievement unlocked: masih betah.",
    "Compatibility: surprisingly functional.",
    "Rity entered the orbit. Naufal forgot how to act normal.",
    "Masih awkward? Bagus, berarti normal.",
    "Two stars, zero chill.",
    "Status hubungan: stable, dengan sedikit chaos.",
  ]);
});

test("selects a deterministic message", () => {
  assert.deepEqual(pickNextMessage(-1, () => 0), {
    index: 0,
    message: MESSAGES[0],
  });
});

test("does not repeat the previous message", () => {
  assert.deepEqual(pickNextMessage(0, () => 0), {
    index: 1,
    message: MESSAGES[1],
  });
});

test("creates bounded shooting-star specifications", () => {
  const specs = createShootingStarSpecs(3, () => 0.5);
  assert.equal(specs.length, 3);
  for (const spec of specs) {
    assert.ok(spec.left >= 5 && spec.left <= 95);
    assert.ok(spec.delayMs >= 0 && spec.delayMs <= 500);
    assert.ok(spec.durationMs >= 900 && spec.durationMs <= 1_400);
  }
});
