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

test("creates bounded shooting-star specifications", () => {
  const specs = createShootingStarSpecs(3, () => 0.5);
  assert.equal(specs.length, 3);
  for (const spec of specs) {
    assert.ok(spec.left >= 5 && spec.left <= 95);
    assert.ok(spec.delayMs >= 0 && spec.delayMs <= 500);
    assert.ok(spec.durationMs >= 900 && spec.durationMs <= 1_400);
  }
});
